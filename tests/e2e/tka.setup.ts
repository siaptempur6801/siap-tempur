import { expect, test as setup } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

const EXPECTED_STAGING_REF = 'lpgrivowdcepcxradavu'
const OIDC_AUDIENCE = 'siap-tempur-staging-e2e'
const authFile = path.join(__dirname, '../../playwright/.auth/tka-user.json')
const metadataFile = path.join(__dirname, '../../playwright/.auth/tka-user-meta.json')

function required(name: string) {
    const value = process.env[name]
    if (!value) throw new Error(`${name} wajib diatur untuk TKA staging E2E.`)
    return value
}

function assertStagingUrl(url: string) {
    const projectRef = new URL(url).hostname.split('.')[0]
    if (projectRef !== EXPECTED_STAGING_REF) {
        throw new Error(`TKA E2E diblokir: expected staging ${EXPECTED_STAGING_REF}, received ${projectRef || 'unknown'}.`)
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

async function callCiUserHelper(supabaseUrl: string, body: Record<string, unknown>) {
    const oidcToken = await githubOidcToken()
    const response = await fetch(`${supabaseUrl}/functions/v1/ci-e2e-user`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${oidcToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    })
    const payload = await response.json().catch(() => ({})) as { userId?: string; error?: string }
    if (!response.ok) {
        throw new Error(`ci-e2e-user ${String(body.action)} gagal (${response.status}): ${payload.error || 'unknown'}`)
    }
    return payload
}

setup('provision disposable TKA SMP staging user', async ({ page }) => {
    const supabaseUrl = required('NEXT_PUBLIC_SUPABASE_URL')
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || required('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    assertStagingUrl(supabaseUrl)

    const runId = process.env.GITHUB_RUN_ID || `local-${randomUUID().slice(0, 8)}`
    const suffix = `${runId}-${randomUUID().slice(0, 8)}`
    const email = `ci-tka-${suffix}@example.invalid`
    const password = `TkaE2E!${randomUUID()}-${randomUUID().slice(0, 8)}`

    const provisioned = await callCiUserHelper(supabaseUrl, {
        action: 'provision',
        email,
        password,
        runId,
    })
    if (!provisioned.userId) throw new Error('ci-e2e-user tidak mengembalikan userId.')
    const userId = provisioned.userId

    await mkdir(path.dirname(authFile), { recursive: true })
    await writeFile(metadataFile, JSON.stringify({ userId, email }, null, 2), 'utf8')

    try {
        await page.goto('/login?returnTo=%2Ftka%2Fsmp')
        await page.locator('input[type="email"]').fill(email)
        await page.locator('input[type="password"]').fill(password)
        await page.getByRole('button', { name: 'Masuk', exact: true }).click()
        await page.waitForURL(/\/tka\/smp(?:\?.*)?$/)
        await expect(page.getByTestId('tka-track-active')).toBeVisible()
        await page.context().storageState({ path: authFile })

        const browserClient = createClient(supabaseUrl, publishableKey, {
            auth: { persistSession: false, autoRefreshToken: false },
        })
        const { data: loginCheck, error: loginCheckError } = await browserClient.auth.signInWithPassword({ email, password })
        if (loginCheckError || loginCheck.user?.id !== userId) {
            throw loginCheckError || new Error('Disposable TKA user tidak dapat login ke staging Auth.')
        }
    } catch (error) {
        await callCiUserHelper(supabaseUrl, { action: 'cleanup', userId }).catch(() => undefined)
        await Promise.all([
            rm(metadataFile, { force: true }),
            rm(authFile, { force: true }),
        ])
        throw error
    }
})
