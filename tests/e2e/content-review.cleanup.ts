import { test as teardown } from '@playwright/test'
import { readFile, rm } from 'node:fs/promises'
import path from 'node:path'

const EXPECTED_STAGING_REF = 'lpgrivowdcepcxradavu'
const OIDC_AUDIENCE = 'siap-tempur-staging-e2e'
const metadataFile = path.join(__dirname, '../../playwright/.auth/content-review-users.json')

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

async function cleanupUser(supabaseUrl: string, oidcToken: string, userId: string) {
    const response = await fetch(`${supabaseUrl}/functions/v1/ci-e2e-user`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${oidcToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cleanup', userId }),
    })
    if (!response.ok) {
        const payload = await response.text()
        throw new Error(`Cleanup content ci-e2e-user gagal (${response.status}): ${payload}`)
    }
}

teardown('remove disposable content users and authored artifacts', async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl) return
    const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
    if (projectRef !== EXPECTED_STAGING_REF) {
        throw new Error(`Content Review E2E cleanup diblokir untuk non-staging project ${projectRef || 'unknown'}.`)
    }

    let metadata: { editor?: { userId?: string }; reviewer?: { userId?: string } } = {}
    try {
        metadata = JSON.parse(await readFile(metadataFile, 'utf8')) as typeof metadata
    } catch {
        return
    }

    const oidcToken = await githubOidcToken()
    if (!oidcToken) throw new Error('GitHub OIDC token tidak tersedia untuk cleanup Content Review E2E.')

    // Editor first: helper removes only CWS-* questions authored by the disposable editor,
    // plus review/audit rows, and refuses deletion if the question was ever used operationally.
    if (metadata.editor?.userId) await cleanupUser(supabaseUrl, oidcToken, metadata.editor.userId)
    if (metadata.reviewer?.userId) await cleanupUser(supabaseUrl, oidcToken, metadata.reviewer.userId)
    await rm(metadataFile, { force: true })
})
