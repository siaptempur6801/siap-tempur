import { describe, expect, it } from 'vitest'
import {
  assertAnswerWindowOpen,
  readAttemptDurationSeconds,
  resolveAnswerDeadlineMs,
} from '@/src/services/attempt-answer.service'
import { PracticeDomainError } from '@/src/services/exam-attempt.service'
import type { AttemptRow } from '@/src/repositories/attempt.repository'

const GRACE_MS = 30_000

function buildAttempt(overrides: Partial<AttemptRow> = {}): AttemptRow {
  return {
    id: 'attempt-1',
    exam_id: 'exam-1',
    user_id: 'user-1',
    attempt_number: 1,
    status: 'in_progress',
    started_at: null,
    submitted_at: null,
    duration_used_seconds: null,
    total_score: null,
    percentage: null,
    passed: null,
    last_question_position: null,
    last_saved_at: null,
    metadata: {},
    ...overrides,
  } as AttemptRow
}

const startedSecondsAgo = (seconds: number) => new Date(Date.now() - seconds * 1000).toISOString()

describe('attempt answer deadline', () => {
  it('membaca durationSeconds hanya bila angka positif', () => {
    expect(readAttemptDurationSeconds({ durationSeconds: 5400 })).toBe(5400)
    expect(readAttemptDurationSeconds({ durationSeconds: 0 })).toBeNull()
    expect(readAttemptDurationSeconds({ durationSeconds: -10 })).toBeNull()
    expect(readAttemptDurationSeconds({ durationSeconds: '5400' })).toBeNull()
    expect(readAttemptDurationSeconds({})).toBeNull()
    expect(readAttemptDurationSeconds(null)).toBeNull()
    expect(readAttemptDurationSeconds([])).toBeNull()
  })

  it('tidak membatasi attempt tanpa durasi atau tanpa started_at', () => {
    expect(resolveAnswerDeadlineMs(buildAttempt({ metadata: {} }))).toBeNull()
    expect(
      resolveAnswerDeadlineMs(buildAttempt({ metadata: { durationSeconds: 5400 } })),
    ).toBeNull()
    expect(() => assertAnswerWindowOpen(buildAttempt({ metadata: {} }))).not.toThrow()
  })

  it('menghitung deadline dari started_at + durasi + toleransi', () => {
    const startedAt = '2026-09-16T10:00:00.000Z'
    const deadline = resolveAnswerDeadlineMs(
      buildAttempt({ started_at: startedAt, metadata: { durationSeconds: 3600 } }),
    )
    expect(deadline).toBe(Date.parse(startedAt) + 3_600_000 + GRACE_MS)
  })

  it('mengizinkan jawaban selama waktu ujian masih berjalan', () => {
    const attempt = buildAttempt({
      started_at: startedSecondsAgo(600),
      metadata: { durationSeconds: 3600 },
    })
    expect(() => assertAnswerWindowOpen(attempt)).not.toThrow()
  })

  it('menolak jawaban setelah waktu ujian habis (termasuk toleransi)', () => {
    const attempt = buildAttempt({
      started_at: startedSecondsAgo(3600 + GRACE_MS / 1000 + 5),
      metadata: { durationSeconds: 3600 },
    })

    expect(() => assertAnswerWindowOpen(attempt)).toThrow(PracticeDomainError)
    try {
      assertAnswerWindowOpen(attempt)
    } catch (error) {
      expect((error as PracticeDomainError).code).toBe('ATTEMPT_TIME_EXPIRED')
    }
  })

  it('masih mengizinkan jawaban di dalam jendela toleransi', () => {
    const attempt = buildAttempt({
      started_at: startedSecondsAgo(3600 + GRACE_MS / 1000 - 5),
      metadata: { durationSeconds: 3600 },
    })
    expect(() => assertAnswerWindowOpen(attempt)).not.toThrow()
  })
})
