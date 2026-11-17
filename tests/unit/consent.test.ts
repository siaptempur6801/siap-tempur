import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  CONSENT_VERSION,
  buildConsentRecord,
  consentFieldErrors,
  hasCurrentConsent,
  isConsentGatedPath,
} from '@/lib/consent'
import { consentSchema } from '@/lib/validations/auth'

describe('consent (N-03)', () => {
  it('paritas validasi klien dan server', () => {
    const cases = [
      { acceptTerms: 'true', ageBasis: 'adult' },
      { acceptTerms: 'true', ageBasis: 'guardian_consent' },
      { acceptTerms: 'false', ageBasis: 'adult' },
      { acceptTerms: 'true', ageBasis: '' },
      { acceptTerms: '', ageBasis: 'child' },
    ]
    for (const input of cases) {
      const client = Object.keys(consentFieldErrors(input)).length === 0
      expect(consentSchema.safeParse(input).success, JSON.stringify(input)).toBe(client)
    }
  })

  it('mengenali catatan persetujuan versi terkini saja', () => {
    expect(hasCurrentConsent({ consent: buildConsentRecord('adult') })).toBe(true)
    expect(hasCurrentConsent({ consent: { ...buildConsentRecord('adult'), version: 'old' } })).toBe(
      false,
    )
    expect(hasCurrentConsent({})).toBe(false)
    expect(hasCurrentConsent(null)).toBe(false)
  })

  it('menggerbangi halaman aplikasi tetapi tidak sesi ujian maupun halaman publik', () => {
    for (const path of [
      '/onboarding',
      '/cpns/dashboard',
      '/cpns/dashboard/riwayat',
      '/admin/users',
      '/tka/smp',
      '/tka/smp/focus',
      '/cpns/join/abc',
    ])
      expect(isConsentGatedPath(path), path).toBe(true)
    for (const path of [
      '/',
      '/tka',
      '/cpns',
      '/blog/x',
      '/login',
      '/persetujuan',
      '/cpns/dashboard/tryout/abc',
      '/tka/smp/tryout/abc',
      '/tka/smp/diagnostic/abc',
      '/cpns/joinx',
    ])
      expect(isConsentGatedPath(path), path).toBe(false)
  })

  it.each([
    'supabase/functions/ci-e2e-admin/index.ts',
    'supabase/functions/ci-e2e-cpns/index.ts',
    'supabase/functions/ci-e2e-user/index.ts',
    'scripts/local-gates/ci-helper.mjs',
    'scripts/test-question-bank.mjs',
    'scripts/test_cpns_resume_flow.mjs',
  ])('akun uji di %s memakai CONSENT_VERSION terkini', (file) => {
    const source = readFileSync(resolve(__dirname, '../..', file), 'utf8')
    expect(source).toContain(`version: '${CONSENT_VERSION}'`)
  })
})
