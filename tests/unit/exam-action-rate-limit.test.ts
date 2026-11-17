import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/headers', () => ({ headers: async () => new Headers() }))

import { checkRateLimit } from '@/lib/api-utils'
import { EXAM_ACTION_RATE_LIMITS, isExamActionRateLimited } from '@/lib/server-rate-limit'

const repoRoot = resolve(__dirname, '../..')
const read = (file: string) => readFileSync(resolve(repoRoot, file), 'utf8')

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('rate limit action ujian/event (N-05)', () => {
  it('mengizinkan sampai batas lalu menolak, per pengguna dan per kategori', async () => {
    vi.stubEnv('APP_ENV', 'staging')
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '')
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '')
    const userId = crypto.randomUUID()
    const { limit } = EXAM_ACTION_RATE_LIMITS.certificate_claim
    for (let attempt = 1; attempt <= limit; attempt += 1) {
      await expect(isExamActionRateLimited(userId, 'certificate_claim')).resolves.toBe(false)
    }
    await expect(isExamActionRateLimited(userId, 'certificate_claim')).resolves.toBe(true)
    await expect(isExamActionRateLimited(userId, 'answer_save')).resolves.toBe(false)
    await expect(isExamActionRateLimited(crypto.randomUUID(), 'certificate_claim')).resolves.toBe(
      false,
    )
  })

  it('fail-open di production saat Upstash tidak dikonfigurasi', async () => {
    vi.stubEnv('APP_ENV', 'production')
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '')
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '')
    await expect(isExamActionRateLimited(crypto.randomUUID(), 'answer_save')).resolves.toBe(false)
  })

  it('fail-open di production saat Upstash error', async () => {
    vi.stubEnv('APP_ENV', 'production')
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://redis.example.test')
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'test-only')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')))
    await expect(isExamActionRateLimited(crypto.randomUUID(), 'answer_save')).resolves.toBe(false)
  })

  it('limiter default (auth/payment) tetap fail-closed di production', async () => {
    vi.stubEnv('APP_ENV', 'production')
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '')
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '')
    await expect(checkRateLimit(crypto.randomUUID(), 10, 60_000)).resolves.toBe(true)
  })

  it('batas simpan jawaban cukup longgar untuk autosave', () => {
    expect(EXAM_ACTION_RATE_LIMITS.answer_save.limit).toBeGreaterThanOrEqual(120)
  })

  it.each([
    ['app/actions/practice.ts', ['attempt_start', 'answer_save', 'attempt_finish']],
    ['app/actions/tka-full-exam.ts', ['answer_save', 'attempt_finish']],
    ['app/actions/tka-practice.ts', ['attempt_start']],
    ['app/actions/tka-diagnostic.ts', ['attempt_start']],
    ['app/actions/tka-remedial.ts', ['answer_save']],
    ['app/actions/tka-wrong-questions.ts', ['answer_save']],
    ['app/actions/event.ts', ['event_register', 'attempt_start']],
    ['app/actions/event-certificate.ts', ['certificate_claim']],
    ['app/actions/event-leaderboard.ts', ['ranking_recalculate']],
    ['app/actions/organization-assignment.ts', ['attempt_start']],
  ] as const)('%s memakai kategori rate limit yang benar', (file, keys) => {
    const source = read(file)
    for (const key of keys) expect(source).toContain(`'${key}')`)
  })
})
