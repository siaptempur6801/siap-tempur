import { describe, expect, it } from 'vitest'
import { checkRateLimit, getIp } from '../../lib/api-utils'

describe('api utils', () => {
  it('extracts the client IP from trusted proxy headers', () => {
    const req = new Request('https://example.test', {
      headers: {
        'x-forwarded-for': '203.0.113.10, 10.0.0.1',
      },
    })

    expect(getIp(req)).toBe('203.0.113.10')
  })

  it('prefers x-real-ip over x-forwarded-for', () => {
    const req = new Request('https://example.test', {
      headers: {
        'x-real-ip': '198.51.100.20',
        'x-forwarded-for': '203.0.113.10',
      },
    })

    expect(getIp(req)).toBe('198.51.100.20')
  })

  it('enforces the memory fallback rate limit when external Redis is not configured', async () => {
    process.env.UPSTASH_REDIS_REST_URL = ''
    process.env.UPSTASH_REDIS_REST_TOKEN = ''
    const key = `unit-${crypto.randomUUID()}`

    await expect(checkRateLimit(key, 2, 60_000)).resolves.toBe(false)
    await expect(checkRateLimit(key, 2, 60_000)).resolves.toBe(false)
    await expect(checkRateLimit(key, 2, 60_000)).resolves.toBe(true)
  })
})
