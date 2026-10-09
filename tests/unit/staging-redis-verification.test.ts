import { afterEach, describe, expect, it, vi } from 'vitest'
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.resetModules() })
async function run() { return import('../../scripts/db-verify/staging-redis-rate-limit.mjs') }
function configure(environment = 'staging', approved = 'https://redis.example.test') {
    vi.stubEnv('APP_ENV', environment)
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://redis.example.test')
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'synthetic-test-only')
    vi.stubEnv('REDIS_VERIFY_APPROVED_STAGING_ORIGIN', approved)
}
describe('staging Redis compatibility verification guard', () => {
    it.each(['production', 'development'])('refuses %s before issuing any Redis command', async environment => {
        configure(environment)
        const fetch = vi.fn(); vi.stubGlobal('fetch', fetch)
        await expect(run()).rejects.toThrow('Requires APP_ENV')
        expect(fetch).not.toHaveBeenCalled()
    })
    it('refuses a mismatched designated staging origin before issuing commands', async () => {
        configure('staging', 'https://different.example.test')
        const fetch = vi.fn(); vi.stubGlobal('fetch', fetch)
        await expect(run()).rejects.toThrow('exactly match')
        expect(fetch).not.toHaveBeenCalled()
    })
    it('checks the real application Lua payload and cleans only its own unique keys', async () => {
        configure()
        const commands: unknown[][] = [], counters = new Map<string, number>()
        vi.spyOn(console, 'log').mockImplementation(() => undefined)
        vi.stubGlobal('fetch', vi.fn().mockImplementation(async (_url, options) => {
            const args = JSON.parse(options.body) as string[]; commands.push(args)
            let result: number | string = 'OK'
            if (args[0] === 'EVAL') {
                expect(args[1]).toContain("redis.call('INCR', KEYS[1])")
                expect(args[1]).toContain("redis.call('PEXPIRE', KEYS[1], ARGV[1])")
                result = (counters.get(args[3]) ?? 0) + 1; counters.set(args[3], result)
            } else if (args[0] === 'PTTL') result = 4990
            else if (args[0] === 'SET') counters.set(args[1], 1)
            else if (args[0] === 'DEL') result = 2
            return new Response(JSON.stringify({ result }))
        }))
        await run()
        expect(commands).toHaveLength(10)
        const cleanup = commands.at(-1) as string[]
        expect(cleanup[0]).toBe('DEL')
        expect(cleanup[1]).toMatch(/^rate-limit:staging-verification:[0-9a-f-]{36}$/)
        expect(cleanup[2]).toBe(cleanup[1] + ':repair')
    })
})
