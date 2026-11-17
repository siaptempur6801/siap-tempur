import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/utils/supabase/server', () => ({
  createAdminClient: async () => ({
    from: () => ({ select: () => ({ limit: async () => ({ error: null }) }) }),
  }),
}))

import { GET } from '@/app/api/health/route'

const FAKE_REF = 'abcdefghijklmnopqrst'

function request(headers: Record<string, string> = {}) {
  return new Request('https://siaptempur.test/api/health', {
    headers: { 'x-forwarded-for': `203.0.113.${Math.floor(Math.random() * 250)}`, ...headers },
  })
}

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', `https://${FAKE_REF}.supabase.co`)
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_EXPECTED_PROJECT_REF', FAKE_REF)
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'test-only')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-only')
  vi.stubEnv('MIDTRANS_SERVER_KEY', 'test-only')
  vi.stubEnv('NEXT_PUBLIC_MIDTRANS_CLIENT_KEY', 'test-only')
  vi.stubEnv('MIDTRANS_SERVER_KEY_SANDBOX', 'test-only')
  vi.stubEnv('NEXT_PUBLIC_MIDTRANS_CLIENT_KEY_SANDBOX', 'test-only')
  vi.stubEnv('UPSTASH_REDIS_REST_URL', '')
  vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '')
  vi.stubEnv('VERCEL_GIT_COMMIT_SHA', 'abc123')
  vi.stubEnv('HEALTH_CHECK_TOKEN', 'health-test-token')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('/api/health — paparan detail (N-06)', () => {
  it('production tanpa token hanya mengembalikan status ringkas', async () => {
    vi.stubEnv('APP_ENV', 'production')
    const response = await GET(request())
    const body = await response.json()
    expect(Object.keys(body).sort()).toEqual(['status', 'timestamp'])
    expect(response.headers.get('x-deployment-commit-sha')).toBeNull()
    // Upstash belum dikonfigurasi di production → tetap 503 untuk monitor.
    expect(response.status).toBe(503)
  })

  it('production dengan token benar mendapat detail', async () => {
    vi.stubEnv('APP_ENV', 'production')
    const response = await GET(request({ authorization: 'Bearer health-test-token' }))
    const body = await response.json()
    expect(body.deploymentCommitSha).toBe('abc123')
    expect(body.rateLimitStore).toBe('unconfigured')
  })

  it('token salah diperlakukan seperti publik', async () => {
    vi.stubEnv('APP_ENV', 'production')
    const body = await (await GET(request({ authorization: 'Bearer wrong' }))).json()
    expect(body.deploymentCommitSha).toBeUndefined()
  })

  it('staging tetap mengembalikan deploymentCommitSha untuk gate E2E Preview', async () => {
    vi.stubEnv('APP_ENV', 'staging')
    const response = await GET(request())
    const body = await response.json()
    expect(body.deploymentCommitSha).toBe('abc123')
    expect(response.status).toBe(200)
  })

  it('membatasi pemanggil publik per IP', async () => {
    vi.stubEnv('APP_ENV', 'production')
    const ip = { 'x-forwarded-for': '198.51.100.77' }
    const statuses: number[] = []
    for (let index = 0; index < 31; index += 1) statuses.push((await GET(request(ip))).status)
    expect(statuses.at(-1)).toBe(429)
    expect(statuses.slice(0, 30)).not.toContain(429)
  })
})
