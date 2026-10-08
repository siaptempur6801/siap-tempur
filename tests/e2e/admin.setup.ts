import {expect, test as setup} from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { callAdminHelper, requireEnv } from './admin-roles'

/**
 * Setup sesi ADMIN untuk project `chromium-admin-staging`.
 *
 * Fungsi bantu (OIDC, pemanggilan helper, penjaga URL staging) tinggal di
 * `admin-roles.ts` supaya spec alur peran memakai jalur yang sama persis.
 * Sebelumnya keduanya duplikat — dan duplikat seperti itu yang gampang menyimpang.
 */

const authFile = path.join(__dirname, '../../playwright/.auth/admin-user.json')
const metadataFile = path.join(__dirname, '../../playwright/.auth/admin-user-meta.json')

/**
 * Mode gate lokal (emulator Edge Function aktif): app boleh berjalan di localhost sehingga gate
 * Admin bisa dijalankan tanpa menunggu deployment Vercel Preview. Di CI, penjaga Preview tetap
 * berlaku penuh.
 */
const localGateMode = Boolean(process.env.CI_E2E_HELPER_BASE_URL?.trim())
const LOCAL_HOSTNAMES = new Set(['127.0.0.1', 'localhost', '::1'])

function assertPreviewUrl(url: string) {
    const parsed = new URL(url)
    if (localGateMode && LOCAL_HOSTNAMES.has(parsed.hostname)) return
    if (parsed.protocol !== 'https:' || !parsed.hostname.endsWith('.vercel.app')) {
        throw new Error(`Admin E2E hanya boleh berjalan ke Vercel Preview, received ${parsed.hostname || 'unknown'}.`)
    }
}

setup('provision disposable ADMIN staging user', async ({ page }) => {
    const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
    const baseUrl = requireEnv('BASE_URL')
    assertPreviewUrl(baseUrl)

    const shareUrl = process.env.VERCEL_SHARE_URL
    const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
    if (!localGateMode && !shareUrl && !bypassSecret) {
        throw new Error('Admin Preview dilindungi Vercel Authentication: VERCEL_SHARE_URL atau VERCEL_AUTOMATION_BYPASS_SECRET wajib tersedia.')
    }

    if (bypassSecret) {
        await page.setExtraHTTPHeaders({
            'x-vercel-protection-bypass': bypassSecret,
            'x-vercel-set-bypass-cookie': 'true',
        })
    } else if (shareUrl) {
        await page.goto(shareUrl, { waitUntil: 'domcontentloaded' })
    }

    const healthResponse = await page.goto(`${baseUrl}/api/health`, { waitUntil: 'domcontentloaded' })
    if (!healthResponse || !healthResponse.ok()) {
        throw new Error(`Admin Preview health check gagal (${healthResponse?.status() ?? 'no-response'}).`)
    }
    const health = await healthResponse.json() as { deploymentCommitSha?: string | null }
    const expectedSha = process.env.E2E_EXPECTED_HEAD_SHA || process.env.PR_HEAD_SHA || process.env.GITHUB_SHA
    // App lokal tidak punya `deploymentCommitSha`, jadi perbandingan exact-head dilewati
    // hanya pada mode gate lokal (di CI tetap wajib).
    if (!localGateMode && (!expectedSha || health.deploymentCommitSha !== expectedSha)) {
        throw new Error(`Admin E2E exact-head mismatch: expected ${expectedSha || 'missing'}, received ${health.deploymentCommitSha || 'missing'}.`)
    }

    const runId = process.env.GITHUB_RUN_ID || `local-${randomUUID().slice(0, 8)}`
    const suffix = `${runId}-${randomUUID().slice(0, 8)}`
    const email = `ci-admin-${suffix}@example.invalid`
    const password = `AdminE2E!${randomUUID()}-${randomUUID().slice(0, 8)}`

    const provisioned = await callAdminHelper(supabaseUrl, {
        action: 'provision',
        email,
        password,
        runId,
    })
    if (!provisioned.userId) throw new Error('ci-e2e-admin tidak mengembalikan userId.')
    const userId = provisioned.userId

    await mkdir(path.dirname(authFile), { recursive: true })
    await writeFile(metadataFile, JSON.stringify({ userId, email }, null, 2), 'utf8')

    try {
        await page.goto('/login?returnTo=%2Fadmin%3Fprogram%3DCPNS%26track%3DSKD')
    await expect(page.locator('html')).toHaveAttribute('data-interaction-guard','ready')
        await page.locator('input[type="email"]').fill(email)
        await page.locator('input[type="password"]').fill(password)
        await page.getByRole('button', { name: 'Masuk', exact: true }).click()
        await page.waitForURL(/\/admin(?:\?.*)?$/)
        await page.context().storageState({ path: authFile })
    } catch (error) {
        await callAdminHelper(supabaseUrl, { action: 'cleanup', userId }).catch(() => undefined)
        await Promise.all([
            rm(metadataFile, { force: true }),
            rm(authFile, { force: true }),
        ])
        throw error
    }
})
