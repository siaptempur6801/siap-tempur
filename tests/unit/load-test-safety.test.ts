import { describe, expect, it } from 'vitest'
import {
  safeOptions,
  stagingAppUrl,
  stagingSupabaseUrl,
  stagingHeaders,
  stagingLearnerHeaders,
} from '@/load-test/staging-config'
describe('load test target safety', () => {
  it('only permits the approved Supabase staging project', () => {
    expect(
      stagingSupabaseUrl({ NEXT_PUBLIC_SUPABASE_URL: 'https://lpgrivowdcepcxradavu.supabase.co/' }),
    ).toBe('https://lpgrivowdcepcxradavu.supabase.co')
    for (const url of [
      'https://llnttutwhtvxtdktiizo.supabase.co',
      '',
      'https://lpgrivowdcepcxradavu.supabase.co.attacker.test',
    ])
      expect(() => stagingSupabaseUrl({ NEXT_PUBLIC_SUPABASE_URL: url })).toThrow()
  })
  it('rejects production domains even with explicit origin opt-in', () => {
    for (const url of ['https://siaptempur.id', 'https://www.siaptempur.id'])
      expect(() =>
        stagingAppUrl({ BASE_URL: url, LOAD_TEST_APPROVED_STAGING_ORIGIN: url }),
      ).toThrow()
  })
  it('requires explicit approval for remote app origins and stress', () => {
    expect(() => stagingAppUrl({ BASE_URL: 'https://preview.example.test' })).toThrow()
    expect(stagingAppUrl({ BASE_URL: 'http://127.0.0.1:3100' })).toBe('http://127.0.0.1:3100')
    expect(safeOptions({}, {})).toMatchObject({ vus: 1, iterations: 3 })
    expect(() => safeOptions({ LOAD_TEST_STRESS: '1' }, {})).toThrow()
  })
  it('does not send a publishable key as a Bearer JWT', () => {
    expect(stagingHeaders({ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test' })).toEqual(
      { apikey: 'sb_publishable_test', 'Content-Type': 'application/json' },
    )
  })
})

it('rejects privileged and non-fixture JWTs before sending load', () => {
  const token = (claims: object) =>
    `test.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.test`
  for (const claims of [
    { role: 'service_role' },
    { role: 'authenticated', user_metadata: {} },
    {
      role: 'authenticated',
      user_metadata: { ci_e2e: true },
      iss: 'https://llnttutwhtvxtdktiizo.supabase.co/auth/v1',
    },
  ]) {
    expect(() =>
      stagingHeaders({
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'test',
        LOAD_TEST_LEARNER_JWT: token(claims),
      }),
    ).toThrow()
  }
})

it('accepts a disposable learner with the k6-compatible decoder', () => {
  const claims = {
    role: 'authenticated',
    user_metadata: { ci_e2e: true },
    iss: 'https://lpgrivowdcepcxradavu.supabase.co/auth/v1',
  }
  const jwt = `test.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.test`
  expect(
    stagingHeaders(
      { NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'test', LOAD_TEST_LEARNER_JWT: jwt },
      (value) => Buffer.from(value, 'base64').toString(),
    ),
  ).toMatchObject({ Authorization: `Bearer ${jwt}` })
})

it('requires learner authentication before protected catalog requests', () => {
  expect(() => stagingLearnerHeaders({ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'test' })).toThrow(
    'disposable staging learner JWT',
  )
})
