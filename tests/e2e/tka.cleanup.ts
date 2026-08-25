import { test as teardown } from '@playwright/test'
import { readFile, rm } from 'node:fs/promises'
import path from 'node:path'

const EXPECTED_STAGING_REF = 'lpgrivowdcepcxradavu'
const OIDC_AUDIENCE = 'siap-tempur-staging-e2e'
const authFile = path.join(__dirname, '../../playwright/.auth/tka-user.json')
const metadataFile = path.join(__dirname, '../../playwright/.auth/tka-user-meta.json')

async function githubOidcToken() {
    const explicit = process.env.E2E_GITHUB_OIDC_TOKEN
    if (explicit) return explicit

    const requestUrl = process.env.ACTIONS_ID_TOKEN_REQUEST_URL
    const requestToken = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN
    if (!requestUrl || !requestToken) return null

    const separator = requestUrl.includes('?') ? '&' : '?'
    const response = await fetch(`${requestUrl}${separator}audience=${encodeURIComponent(OIDC_AUDIENCE)}`, {
        headers: { Authorization: `bearer ${requestToken}` },
    })
    if (!response.ok) return null
    const payload = await response.json() as { value?: string }
    return payload.value || null
}

async function callHelper(supabaseUrl: string, oidcToken: string, functionName: 'ci-e2e-user' | 'ci-e2e-m4', body: Record<string, unknown>) {
    const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${oidcToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    })
    if (!response.ok) {
        const payload = await response.text()
        throw new Error(`${functionName} ${String(body.action)} gagal (${response.status}): ${payload}`)
    }
}

teardown('remove disposable TKA SMP staging user', async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl) return

    const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
    if (projectRef !== EXPECTED_STAGING_REF) {
        throw new Error(`TKA E2E cleanup diblokir untuk non-staging project ${projectRef || 'unknown'}.`)
    }

    let userId: string | null = null
    try {
        const raw = await readFile(metadataFile, 'utf8')
        const parsed = JSON.parse(raw) as { userId?: string }
        userId = parsed.userId || null
    } catch {
        // Setup may have failed before metadata was written.
    }

    if (userId) {
        const oidcToken = await githubOidcToken()
        if (!oidcToken) throw new Error('GitHub OIDC token tidak tersedia untuk cleanup staging user.')

        // Remove temporary ADMIN role plus any M4 QA state before deleting the user.
        await callHelper(supabaseUrl, oidcToken, 'ci-e2e-m4', { action: 'clear_m4', userId })
        await callHelper(supabaseUrl, oidcToken, 'ci-e2e-user', { action: 'cleanup', userId })
    }

    await Promise.all([
        rm(metadataFile, { force: true }),
        rm(authFile, { force: true }),
    ])
})
