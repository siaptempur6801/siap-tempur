import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { checkRateLimit, isRateLimited } from '@/lib/api-utils'
import { isAuthRateLimitBypassed } from '@/lib/server-rate-limit'
beforeEach(() => {
    vi.stubEnv('APP_ENV','staging');vi.stubEnv('UPSTASH_REDIS_REST_URL','https://redis.example.test');vi.stubEnv('UPSTASH_REDIS_REST_TOKEN','test-only')
})
afterEach(() => { vi.unstubAllEnvs();vi.unstubAllGlobals();vi.useRealTimers() })
describe('shared rate limiter', () => {
    it('increments and expires in one atomic request with no user data cached', async () => {
        const fetch=vi.fn().mockResolvedValue(new Response(JSON.stringify({result:1}),{status:200}))
        vi.stubGlobal('fetch',fetch)
        await expect(checkRateLimit('test',2,1500)).resolves.toBe(false)
        expect(fetch).toHaveBeenCalledTimes(1)
        const [url,options]=fetch.mock.calls[0];expect(url).toBe('https://redis.example.test');expect(options.method).toBe('POST');expect(options.cache).toBe('no-store')
        const [command,script,keys,key,ttl]=JSON.parse(options.body)
        expect([command,keys,key,ttl]).toEqual(['EVAL','1','rate-limit:test','1500'])
        expect(script).toContain("redis.call('INCR'");expect(script).toContain("redis.call('PEXPIRE'");expect(script).toContain("redis.call('PTTL'")
    })
    it('uses the shared counter across fresh instances instead of local state', async () => {
        vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({result:3}),{status:200})))
        await expect(checkRateLimit(crypto.randomUUID(),2,60000)).resolves.toBe(true)
    })
    it.each([new Response('{}',{status:503}),new Response('{"result":0}'),new Response('{"result":"bad"}'),new Response('{"error":"denied"}'),new Response('not-json')])('fails closed in production for failed or malformed Redis responses',async response=>{
        vi.stubEnv('APP_ENV','production');vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response))
        await expect(checkRateLimit(crypto.randomUUID(),2,60000)).resolves.toBe(true)
    })
    it('fails closed for missing production configuration and transport failures', async () => {
        vi.stubEnv('APP_ENV','production');vi.stubEnv('UPSTASH_REDIS_REST_URL','')
        await expect(checkRateLimit('no-config',2,60000)).resolves.toBe(true)
        vi.stubEnv('UPSTASH_REDIS_REST_URL','https://redis.example.test');vi.stubGlobal('fetch',vi.fn().mockRejectedValue(Error('timeout')))
        await expect(checkRateLimit('timeout',2,60000)).resolves.toBe(true)
    })
    it('preserves bounded local/staging fallback when Redis is unavailable', async () => {
        vi.stubGlobal('fetch',vi.fn().mockRejectedValue(Error('offline')));const key=crypto.randomUUID()
        await expect(checkRateLimit(key,1,60000)).resolves.toBe(false);await expect(checkRateLimit(key,1,60000)).resolves.toBe(true)
    })
    it('expires local windows at the exact boundary', () => {
        vi.useFakeTimers();const key=crypto.randomUUID();expect(isRateLimited(key,1,1000)).toBe(false)
        vi.advanceTimersByTime(1000);expect(isRateLimited(key,1,1000)).toBe(false)
    })
    it('never enables the E2E auth bypass in production', () => {
        vi.stubEnv('APP_ENV','production');vi.stubEnv('E2E_DISABLE_AUTH_RATE_LIMIT','1');expect(isAuthRateLimitBypassed()).toBe(false)
    })
})
