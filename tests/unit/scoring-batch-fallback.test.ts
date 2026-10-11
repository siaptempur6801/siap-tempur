import { describe, expect, it, vi, beforeEach } from 'vitest'

/**
 * Regresi kompatibilitas deploy untuk perbaikan N+1 scoring.
 *
 * `ScoringService.finishAttempt` kini menulis semua skor jawaban lewat satu RPC
 * (`update_attempt_answer_scores`). RPC itu baru ada setelah migration
 * `20260918041911_batch_update_attempt_answer_scores.sql` di-apply.
 *
 * Bila kode sudah deploy tetapi migration belum jalan, PostgREST membalas
 * `PGRST202` (fungsi tidak ditemukan). Sebelum fallback ditambahkan, error itu
 * akan dilempar keluar dari `finishAttempt` → `completeAttempt` gagal → peserta
 * TIDAK DAPAT mengumpulkan ujian. Itu persis gejala yang sedang diperbaiki, jadi
 * kontraknya dikunci di sini:
 *
 *   1. `updateAnswerScores` mengembalikan `false` untuk PGRST202, bukan throw.
 *   2. `finishAttempt` jatuh ke penulisan per jawaban sehingga ujian tetap selesai.
 */

const rpcCalls: unknown[] = []
const singleUpdateCalls: string[] = []
let rpcError: { code: string; message: string } | null = null

const attemptRow = {
  id: 'attempt-1',
  exam_id: 'exam-1',
  user_id: 'user-1',
  attempt_number: 1,
  status: 'in_progress',
  started_at: new Date().toISOString(),
  submitted_at: null,
  duration_used_seconds: null,
  total_score: null,
  percentage: null,
  passed: null,
  last_question_position: null,
  last_saved_at: null,
  metadata: { durationSeconds: 6000 },
}

const questionRow = {
  id: 'aq-1',
  attempt_id: 'attempt-1',
  question_id: 'q-1',
  question_version: 1,
  position: 1,
  section_id: null,
  question_snapshot: { questionType: 'single_choice', subjectId: 'subject-1', passingScore: 65 },
  max_score: 5,
}

const answerRow = {
  id: 'ans-1',
  attempt_question_id: 'aq-1',
  selected_option_id: 'opt-1',
  answer_value: null,
  is_correct: null,
  score_awarded: 0,
  answered_at: new Date().toISOString(),
  is_flagged: false,
}

vi.mock('@/lib/utils/supabase/server', () => ({
  createAdminClient: async () => ({}),
  createV2AdminClient: async () => ({}),
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('@/src/repositories/attempt.repository', async () => {
  const actual = await vi.importActual<typeof import('@/src/repositories/attempt.repository')>(
    '@/src/repositories/attempt.repository',
  )
  return {
    ...actual,
    attemptRepository: {
      getAttemptBundle: async () => ({
        attempt: attemptRow,
        questions: [questionRow],
        answers: [answerRow],
      }),
      getAnswerOptionSelections: async () => [],
      getScoringOptionsForQuestions: async () => [
        {
          id: 'opt-1',
          question_id: 'q-1',
          is_correct: true,
          score: 5,
          response_group: null,
          response_group_order: null,
        },
      ],
      updateAnswerScores: async (rows: unknown[]) => {
        rpcCalls.push(rows)
        return rpcError === null
      },
      updateAnswerScore: async (answerId: string) => {
        singleUpdateCalls.push(answerId)
      },
      upsertScores: async () => undefined,
      completeAttempt: async () => undefined,
    },
  }
})

const { scoringService } = await import('@/src/services/scoring.service')

describe('finishAttempt — kompatibilitas sebelum migration di-apply', () => {
  beforeEach(() => {
    rpcCalls.length = 0
    singleUpdateCalls.length = 0
    rpcError = null
  })

  it('memakai satu penulisan batch ketika RPC tersedia', async () => {
    const result = await scoringService.finishAttempt('user-1', 'attempt-1')

    expect(result.success).toBe(true)
    expect(rpcCalls).toHaveLength(1)
    expect(singleUpdateCalls).toHaveLength(0)
  })

  it('TIDAK gagal dan jatuh ke penulisan per jawaban ketika RPC belum ada', async () => {
    // Simulasi PostgREST membalas PGRST202 karena fungsi belum ada.
    rpcError = { code: 'PGRST202', message: 'Could not find the function' }

    const result = await scoringService.finishAttempt('user-1', 'attempt-1')

    // Kontrak utama: ujian tetap selesai. Kegagalan karena migration belum
    // jalan tidak boleh membuat peserta tidak bisa mengumpulkan ujian.
    expect(result.success).toBe(true)
    expect(rpcCalls).toHaveLength(1)
    expect(singleUpdateCalls).toEqual(['ans-1'])
  })
})
