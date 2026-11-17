import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  completeAttempt: vi.fn(),
  saveAnswer: vi.fn(),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('@/lib/csrf', () => ({ validateCsrf: vi.fn(async () => undefined) }))
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))
vi.mock('@/lib/server-rate-limit', () => ({
  EXAM_ACTION_RATE_LIMITED_MESSAGE: 'rate limited',
  isExamActionRateLimited: vi.fn(async () => false),
}))
vi.mock('@/lib/utils/supabase/server', () => ({
  createV2Client: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'user-1' } } }) },
  }),
}))
vi.mock('@/src/services/exam-completion.service', () => ({
  examCompletionService: { completeAttempt: mocks.completeAttempt },
}))
vi.mock('@/src/services/attempt-answer.service', () => ({
  attemptAnswerService: new Proxy({}, { get: () => mocks.saveAnswer }),
}))

import { finishPractice, submitAnswer } from '@/app/actions/practice'
import { PracticeDomainError } from '@/src/services/exam-attempt.service'

const ATTEMPT_ID = '11111111-1111-4111-8111-111111111111'
const QUESTION_ID = '22222222-2222-4222-8222-222222222222'
const OPTION_ID = '33333333-3333-4333-8333-333333333333'

describe('pesan error aksi ujian untuk peserta', () => {
  beforeEach(() => {
    mocks.completeAttempt.mockReset()
    mocks.saveAnswer.mockReset()
  })

  it('kegagalan tak terduga saat mengumpulkan memakai pesan Indonesia yang aman diulang', async () => {
    mocks.completeAttempt.mockRejectedValueOnce(new Error('duplicate key value'))

    const result = await finishPractice(ATTEMPT_ID)

    expect(result).toEqual({ error: expect.stringContaining('belum berhasil dikumpulkan') })
    expect(result.error).toContain('tidak hilang')
    expect(result.error).not.toMatch(/failed|session/i)
  })

  it('kegagalan tak terduga saat menyimpan jawaban memakai pesan Indonesia', async () => {
    mocks.saveAnswer.mockRejectedValueOnce(new Error('network'))

    const result = await submitAnswer(ATTEMPT_ID, QUESTION_ID, OPTION_ID)

    expect(result).toEqual({ error: expect.stringContaining('Jawaban belum tersimpan') })
  })

  it('pesan konfigurasi tidak membocorkan istilah internal ke peserta', async () => {
    for (const code of ['EXAM_NOT_CONFIGURED', 'EXAM_CONFIGURATION_ERROR'] as const) {
      mocks.completeAttempt.mockRejectedValueOnce(new PracticeDomainError(code, 'internal'))
      const result = await finishPractice(ATTEMPT_ID)
      expect(result.error).toBeTruthy()
      expect(result.error).not.toMatch(/schema v2|staging/i)
    }
  })
})
