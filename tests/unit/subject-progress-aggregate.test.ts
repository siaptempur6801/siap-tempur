import { describe, expect, it, vi, beforeEach } from 'vitest'

/**
 * Regresi: agregat progres subjek dihitung di database, bukan di Node.
 *
 * Sebelum perbaikan, `SubjectProgressService.sync` menarik SELURUH id attempt
 * user (`listAllCompletedAttemptIds`) lalu mem-batch skornya per ~16 KB URL.
 * Biayanya tumbuh tanpa batas seiring riwayat user, dan begitu ambang
 * `MAX_ATTEMPTS_PER_AGGREGATE` (20.000) tersentuh, fungsi melempar error —
 * sehingga submit ujian ikut gagal.
 *
 * Perbaikan: satu RPC `get_user_subject_progress`
 * (migration `20260918130000_subject_progress_aggregate_rpc.sql`) yang
 * mengembalikan satu baris per subjek.
 *
 * Test ini mengunci tiga hal:
 *   1. Hanya SATU panggilan agregat — bukan satu panggilan per attempt/chunk.
 *   2. Rumus `accuracy` dan `mastery_score` tidak berubah.
 *   3. `rounded` tetap dilakukan di TypeScript (bukan diserahkan ke PostgreSQL),
 *      supaya perilaku pembulatan tidak bergantung implementasi `round()` DB.
 */

const getSubjectProgressAggregates = vi.fn()
const upsertSubjectProgress = vi.fn()

vi.mock('@/src/repositories/progress.repository', () => ({
  progressRepository: {
    getSubjectProgressAggregates: (...args: unknown[]) => getSubjectProgressAggregates(...args),
    upsertSubjectProgress: (...args: unknown[]) => upsertSubjectProgress(...args),
  },
}))

const { subjectProgressService } = await import('@/src/services/subject-progress.service')

beforeEach(() => {
  getSubjectProgressAggregates.mockReset()
  upsertSubjectProgress.mockReset()
  upsertSubjectProgress.mockResolvedValue(undefined)
})

describe('subjectProgressService.sync', () => {
  it('memakai satu panggilan agregat, bukan satu per attempt', async () => {
    getSubjectProgressAggregates.mockResolvedValue([
      {
        subject_id: 'subjek-twk',
        attempts: 12,
        questions_answered: 30,
        correct_answers: 21,
        total_questions: 40,
        weighted_percentage: 1400,
      },
    ])

    await subjectProgressService.sync('user-1')

    expect(getSubjectProgressAggregates).toHaveBeenCalledTimes(1)
    expect(getSubjectProgressAggregates).toHaveBeenCalledWith('user-1')
  })

  it('menghitung accuracy dan mastery dengan rumus yang sama seperti sebelumnya', async () => {
    getSubjectProgressAggregates.mockResolvedValue([
      {
        subject_id: 'subjek-tiu',
        attempts: 3,
        questions_answered: 30,
        correct_answers: 21,
        total_questions: 40,
        weighted_percentage: 2133.6,
      },
    ])

    const rows = await subjectProgressService.sync('user-1')

    expect(rows).toHaveLength(1)
    // accuracy = round2(21 / 30 * 100) = 70
    expect(rows[0].accuracy).toBe(70)
    // mastery = round2(2133.6 / 40) = round2(53.34) = 53.34
    expect(rows[0].mastery_score).toBe(53.34)
    expect(rows[0].attempts).toBe(3)
    expect(rows[0].questions_answered).toBe(30)
    expect(rows[0].user_id).toBe('user-1')
  })

  it('membulatkan ke 2 desimal di TypeScript, bukan mengembalikan nilai mentah DB', async () => {
    getSubjectProgressAggregates.mockResolvedValue([
      {
        subject_id: 'subjek-tkp',
        attempts: 1,
        questions_answered: 3,
        correct_answers: 1,
        total_questions: 7,
        // 100 / 3 = 33.333... → harus dibulatkan jadi 33.33
        weighted_percentage: 233.333333,
      },
    ])

    const rows = await subjectProgressService.sync('user-1')

    expect(rows[0].accuracy).toBe(33.33)
    expect(rows[0].mastery_score).toBe(33.33)
  })

  it('memakai 0 (bukan NaN) saat tidak ada pertanyaan yang dijawab', async () => {
    getSubjectProgressAggregates.mockResolvedValue([
      {
        subject_id: 'subjek-kosong',
        attempts: 1,
        questions_answered: 0,
        correct_answers: 0,
        total_questions: 0,
        weighted_percentage: 0,
      },
    ])

    const rows = await subjectProgressService.sync('user-1')

    expect(rows[0].accuracy).toBe(0)
    expect(rows[0].mastery_score).toBe(0)
  })

  it('tetap aman saat user belum punya attempt sama sekali', async () => {
    getSubjectProgressAggregates.mockResolvedValue([])

    const rows = await subjectProgressService.sync('user-1')

    expect(rows).toEqual([])
    // upsert dengan array kosong adalah no-op di repository
    expect(upsertSubjectProgress).toHaveBeenCalledWith([])
  })
})
