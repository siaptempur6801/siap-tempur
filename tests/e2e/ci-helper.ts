import { createHmac, createHash } from 'node:crypto'

/**
 * Helper untuk memanggil endpoint CI E2E (`ci-e2e-user`, `ci-e2e-cpns`, `ci-e2e-admin`).
 *
 * Di GitHub Actions, endpoint itu adalah Supabase Edge Function di project staging dan
 * diverifikasi lewat GitHub OIDC. Untuk menjalankan gate yang sama **lokal** (mis. via Docker,
 * tanpa GitHub Actions/billing), set:
 *
 *   CI_E2E_HELPER_BASE_URL=http://127.0.0.1:54321/functions/v1
 *   E2E_GITHUB_OIDC_TOKEN=local-docker
 *
 * dan jalankan `node scripts/local-gates/ci-helper.mjs` sebagai emulator. `supabaseUrl` tetap
 * menunjuk project staging supaya penjaga `assertStagingUrl` di spec tetap berlaku.
 */
export function ciHelperUrl(supabaseUrl: string, functionName: string) {
  const base = process.env.CI_E2E_HELPER_BASE_URL?.trim() || `${supabaseUrl}/functions/v1`
  return `${base.replace(/\/+$/, '')}/${functionName}`
}

/** Penanda agar mudah dilihat di log bahwa helper berjalan lokal, bukan Edge Function. */
export function isLocalCiHelper() {
  return Boolean(process.env.CI_E2E_HELPER_BASE_URL?.trim())
}

/** Token dummy untuk emulator lokal (Edge Function asli memverifikasi OIDC). */
export function localCiHelperToken() {
  const runId = process.env.GITHUB_RUN_ID || 'local'
  return createHash('sha256').update(`local-ci-helper:${runId}`).digest('hex')
}

export function localCiHelperSignature(body: string) {
  const secret = process.env.CI_E2E_HELPER_SECRET || 'local-ci-helper'
  return createHmac('sha256', secret).update(body).digest('hex')
}
