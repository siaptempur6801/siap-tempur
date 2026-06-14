import { describe, expect, it } from 'vitest'
import { requireEnv } from '@/lib/env'

describe('requireEnv', () => {
  it('returns a configured direct value', () => {
    expect(requireEnv('TEST_DIRECT_ENV', 'configured')).toBe('configured')
  })

  it('throws when the env value is missing', () => {
    expect(() => requireEnv('TEST_MISSING_ENV')).toThrow('TEST_MISSING_ENV is not configured')
  })
})
