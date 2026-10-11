import { describe, expect, it } from 'vitest'
import { acquireSingleFlightLock, releaseSingleFlightLock } from '@/lib/single-flight-lock'

describe('single flight lock', () => {
  it('allows only the first caller to acquire the lock', () => {
    const lock = { current: false }

    expect(acquireSingleFlightLock(lock)).toBe(true)
    expect(acquireSingleFlightLock(lock)).toBe(false)
  })

  it('allows acquisition again after release', () => {
    const lock = { current: false }

    expect(acquireSingleFlightLock(lock)).toBe(true)
    releaseSingleFlightLock(lock)
    expect(acquireSingleFlightLock(lock)).toBe(true)
  })
})
