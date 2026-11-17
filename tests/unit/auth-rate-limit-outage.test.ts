import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const requestState = vi.hoisted(() => ({ ip: '10.1.0.1' }))

vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-real-ip': requestState.ip }),
}))

import { isAuthActionRateLimited } from '@/lib/server-rate-limit'

let ipCounter = 0
function freshIp() {
  ipCounter += 1
  requestState.ip = `10.77.${Math.floor(ipCounter / 250)}.${ipCounter % 250}`
}

/** Production dengan Upstash terkonfigurasi tetapi tidak dapat dihubungi. */
beforeEach(() => {
  vi.stubEnv('APP_ENV', 'production')
  vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://redis.invalid')
  vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'test-only')
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Promise.reject(new Error('ECONNREFUSED'))),
  )
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  freshIp()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('rate limit auth saat Upstash down di production (B-06)', () => {
  it('login tetap diizinkan lewat limiter memori, lalu tetap dibatasi', async () => {
    const results: boolean[] = []
    for (let index = 0; index < 11; index += 1) results.push(await isAuthActionRateLimited('login'))
    expect(results.slice(0, 10)).not.toContain(true)
    expect(results[10]).toBe(true)
  })

  it('daftar tetap diizinkan lewat limiter memori', async () => {
    expect(await isAuthActionRateLimited('signup')).toBe(false)
  })

  it('aksi yang mengirim email tetap fail-closed', async () => {
    expect(await isAuthActionRateLimited('forgotPassword', 'a@example.com')).toBe(true)
    expect(await isAuthActionRateLimited('resendVerification', 'a@example.com')).toBe(true)
  })
})
