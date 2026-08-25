import { expect, test as setup } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

const EXPECTED_STAGING_REF = 'lpgrivowdcepcxradavu'
const OIDC_AUDIENCE = 'siap-tempur-staging-e2e'
const authFile = path.join(__dirname, '../../playwright/.auth/admin-user.json')
const metadataFile = path.join(__dirname, '../../playwright/.auth/admin-user-meta.json')

function required(name: string) {
    const value = process.env[name]
    if (!value) throw new Error(`${name} wajib diatur untuk Admin staging E2E.`)
    return value
}

function assertStagingUrl(url: string) {
    const projectRef = new URL(url).hostname.split('.')[0]
    if (projectRef !== EXPECTED_STAGING_REF) {
        throw new Error(`Admin E2E diblokir: expected staging ${EXPECTED_STAGING_REF}, received ${projectRef || 'unknown'}.`)
    }
}

function assertPreviewUrl(url: string) {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:' || !parsed.hostname.endsWith('.vercel.app')) {
        throw new Error(`Admin E2E hanya boleh berjalan ke Vercel Preview, received ${parsed.hostname || 'unknown'}.`)
    }
}

async function githubOidcToken() {
    const explicit = process.env.E2E_GITHUB_OIDC_TOKEN
    if (explicit) return explicit

    const requestUrl = required('ACTIONS_ID_TOKEN_REQUEST_URL')
    const requestToken = required('ACTIONS_ID_TOKEN_REQUEST_TOKEN')
    const separator = requestUrl.includes('?') ? '&' : '?'
    const response = await fetch(`${requestUrl}${separator}audience=${encodeURIComponent(OIDC_AUDIENCE)}`, {
        headers: { Authorization: `bearer ${requestToken}` },
    })
    if (!response.ok) throw new Error(`Gagal meminta GitHub OIDC token (${response.status}).`)
    const payload = await response.json() as { value?: string }
    if (!payload.value) throw new Error('GitHub OIDC token kosong.')
    return payload.value
}

async function callAdminHelper(supabaseUrl: string, body: Record<string, unknown>) {
    const oidcToken = await githubOidcToken()
    const response = await fetch(`${supabaseUrl}/functions/v1/ci-e2e-admin`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${oidcToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    })
    const payload = await response.json().catch(() => ({})) as { userId?: string; error?: string }
    if (!response.ok) {
        throw new Error(`ci-e2e-admin ${String(body.action)} gagal (${response.status}): ${payload.error || 'unknown'}`)
    }
    return payload
}

setup('provision disposable ADMIN staging user', async ({ page }) => {
    const supabaseUrl = required('NEXT_PUBLIC_SUPABASE_URL')
    const baseUrl = required('BASE_URL')
    assertStagingUrl(supabaseUrl)
    assertPreviewUrl(baseUrl)

    const shareUrl = process.env.VERCEL_SHARE_URL
    const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
    if (!shareUrl && !bypassSecret) {
        throw new Error('Admin Preview dilindungi Vercel Authentication: VERCEL_SHARE_URL atau VERCEL_AUTOMATION_BYPASS_SECRET wajib tersedia.')
    }

    if (shareUrl) {
        await page.goto(shareUrl, { waitUntil: 'domcontentloaded' })
    }

    const healthResponse = await page.request.get(`${baseUrl}/api/health`)
    expect(healthResponse.ok()).toBe(true)
    const health = await healthResponse.json() as { deploymentCommitSha?: string | null }
    const expectedSha = process.env.GITHUB_SHA
    if (!expectedSha || health.deploymentCommitSha !== expectedSha) {
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
        await page.locator('input[type="email"]').fill(email)
        await page.locator('input[type="password"]').fill(password)
        await page.getByRole('button', { name: /Masuk|Login/i }).click()
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
