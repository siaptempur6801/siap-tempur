import { randomUUID } from 'node:crypto'
import type { Page } from '@playwright/test'
import { ciHelperUrl } from './ci-helper'

/**
 * Provishing pengguna E2E per peran.
 *
 * ## Kenapa ada
 *
 * Sebelumnya helper admin hanya bisa membuat pengguna berperan `ADMIN`. Itu
 * cukup untuk menguji halaman admin pada umumnya, tetapi TIDAK cukup untuk
 * menguji alur peran — dan justru alur peran yang bermasalah: `FINANCE`,
 * `SUPPORT`, dan `SCHOOL_ADMIN` tidak punya jalan masuk lain, padahal ketiganya
 * yang dulu melihat menu yang bukan urusannya (FINANCE, SUPPORT) atau tidak
 * punya permukaan sama sekali (SCHOOL_ADMIN).
 *
 * ## Batas keamanan
 *
 * `SUPER_ADMIN` sengaja tidak bisa diprovisikan: helper ini sudah bisa membuat
 * `ADMIN`, dan menambahkan `SUPER_ADMIN` akan menaikkan dampak bila endpoint
 * disalahgunakan. Tidak ada test alur peran yang membutuhkan `role.manage`.
 * Endpoint aslinya tetap dijaga GitHub OIDC dengan `workflow_ref` terbatas.
 */

/** Peran yang boleh diprovisikan — harus sama dengan ALLOWED_ROLES di Edge Function. */
export const E2E_ROLES = [
    'ADMIN',
    'CONTENT_EDITOR',
    'CONTENT_REVIEWER',
    'FINANCE',
    'SUPPORT',
    'SCHOOL_ADMIN',
] as const

export type E2eRole = (typeof E2E_ROLES)[number]

const EXPECTED_STAGING_REF = 'lpgrivowdcepcxradavu'
const OIDC_AUDIENCE = 'siap-tempur-staging-e2e'

export function requireEnv(name: string) {
    const value = process.env[name]
    if (!value) throw new Error(`${name} wajib diatur untuk Admin staging E2E.`)
    return value
}

export function assertStagingUrl(url: string) {
    const projectRef = new URL(url).hostname.split('.')[0]
    if (projectRef !== EXPECTED_STAGING_REF) {
        throw new Error(`Admin E2E diblokir: expected staging ${EXPECTED_STAGING_REF}, received ${projectRef || 'unknown'}.`)
    }
}

async function githubOidcToken() {
    const explicit = process.env.E2E_GITHUB_OIDC_TOKEN
    if (explicit) return explicit

    const requestUrl = requireEnv('ACTIONS_ID_TOKEN_REQUEST_URL')
    const requestToken = requireEnv('ACTIONS_ID_TOKEN_REQUEST_TOKEN')
    const separator = requestUrl.includes('?') ? '&' : '?'
    const response = await fetch(`${requestUrl}${separator}audience=${encodeURIComponent(OIDC_AUDIENCE)}`, {
        headers: { Authorization: `bearer ${requestToken}` },
    })
    if (!response.ok) throw new Error(`Gagal meminta GitHub OIDC token (${response.status}).`)
    const payload = await response.json() as { value?: string }
    if (!payload.value) throw new Error('GitHub OIDC token kosong.')
    return payload.value
}

export async function callAdminHelper(supabaseUrl: string, body: Record<string, unknown>) {
    const oidcToken = await githubOidcToken()
    const response = await fetch(ciHelperUrl(supabaseUrl, 'ci-e2e-admin'), {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${oidcToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    })
    const payload = await response.json().catch(() => ({})) as { userId?: string; role?: string; error?: string }
    if (!response.ok) {
        throw new Error(`ci-e2e-admin ${String(body.action)} gagal (${response.status}): ${payload.error || 'unknown'}`)
    }
    return payload
}

export type ProvisionedUser = {
    userId: string
    email: string
    password: string
    role: E2eRole
}

/** Buat pengguna staging sekali-pakai dengan peran tertentu. */
export async function provisionRoleUser(supabaseUrl: string, role: E2eRole): Promise<ProvisionedUser> {
    if (!E2E_ROLES.includes(role)) throw new Error(`Peran ${role} tidak boleh diprovisikan lewat helper E2E.`)

    const runId = process.env.GITHUB_RUN_ID || `local-${randomUUID().slice(0, 8)}`
    const suffix = `${randomUUID().slice(0, 8)}`
    const email = `ci-admin-${role.toLowerCase().replace(/_/g, '-')}-${runId}-${suffix}@example.invalid`
    // Cocok dengan CI_ADMIN_PASSWORD_INVALID (20..160 karakter).
    const password = `RoleE2E!${randomUUID()}-${randomUUID().slice(0, 8)}`

    const provisioned = await callAdminHelper(supabaseUrl, { action: 'provision', email, password, runId, role })
    if (!provisioned.userId) throw new Error(`ci-e2e-admin tidak mengembalikan userId untuk peran ${role}.`)

    return { userId: provisioned.userId, email, password, role }
}

export async function cleanupRoleUser(supabaseUrl: string, userId: string) {
    await callAdminHelper(supabaseUrl, { action: 'cleanup', userId }).catch(() => undefined)
}

/**
 * Login lewat UI dan tunggu sampai benar-benar mendarat di `landingPath`.
 *
 * `returnTo` WAJIB dikirim: tanpa itu, pengguna yang belum menyelesaikan
 * onboarding mendarat di `/onboarding` dan bukan di halaman yang dituju —
 * persis kegagalan yang membuat test alur peran pertama kali merah.
 *
 * Yang ditunggu adalah pathname-nya, bukan sekadar "keluar dari /login", supaya
 * test gagal bila pengalihan mendarat di tempat lain — itulah yang ingin
 * dibuktikan test alur peran.
 */
export async function loginAs(page: Page, user: Pick<ProvisionedUser, 'email' | 'password'>, landingPath: string) {
    await page.goto(`/login?returnTo=${encodeURIComponent(landingPath)}`)
    await page.locator('input[type="email"]').fill(user.email)
    await page.locator('input[type="password"]').fill(user.password)
    await page.getByRole('button', { name: 'Masuk', exact: true }).click()
    await page.waitForURL((url) => url.pathname === landingPath, { timeout: 60_000 })
}
