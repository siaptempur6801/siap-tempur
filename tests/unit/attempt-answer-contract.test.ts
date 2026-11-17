import { describe, expect, it, vi, beforeEach } from 'vitest'

/**
 * Kontrak jalur simpan jawaban CPNS/latihan.
 *
 * Test ini mengunci PERILAKU yang tidak boleh berubah saat jalur simpan
 * jawaban dioptimasi (5 round trip terpisah → satu RPC):
 *
 *   1. Attempt harus milik user DAN berstatus aktif — kalau tidak, tolak.
 *   2. Jawaban ditolak setelah deadline ujian (timer browser hanya alat bantu).
 *   3. Soal harus benar-benar dialokasikan ke attempt tersebut.
 *   4. Opsi harus benar-benar milik soal tersebut — ini yang mencegah klien
 *      nakal mengirim opsi dari soal lain untuk memanipulasi skor.
 *   5. Attempt ditandai tersentuh dengan posisi soal terakhir.
 *   6. Kode error yang sampai ke pemanggil tetap sama.
 *
 * Deadline dihitung dari `metadata.durationSeconds` + toleransi 30 detik.
 */

const getActiveOwnedAttempt = vi.fn()
const getAttemptQuestionRef = vi.fn()
const getOptionForQuestion = vi.fn()
const getOptionsForQuestion = vi.fn()
const upsertAnswer = vi.fn()
const upsertAnswerOptions = vi.fn()
const touchAttempt = vi.fn()
const saveAttemptAnswer = vi.fn()

vi.mock('@/src/repositories/attempt.repository', () => ({
  attemptRepository: {
    getActiveOwnedAttempt: (...a: unknown[]) => getActiveOwnedAttempt(...a),
    getAttemptQuestionRef: (...a: unknown[]) => getAttemptQuestionRef(...a),
    getOptionForQuestion: (...a: unknown[]) => getOptionForQuestion(...a),
    getOptionsForQuestion: (...a: unknown[]) => getOptionsForQuestion(...a),
    upsertAnswer: (...a: unknown[]) => upsertAnswer(...a),
    upsertAnswerOptions: (...a: unknown[]) => upsertAnswerOptions(...a),
    touchAttempt: (...a: unknown[]) => touchAttempt(...a),
    saveAttemptAnswer: (...a: unknown[]) => saveAttemptAnswer(...a),
  },
}))

const { attemptAnswerService, resolveAnswerDeadlineMs, readAttemptDurationSeconds } =
  await import('@/src/services/attempt-answer.service')

const ATTEMPT = {
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
  metadata: { durationSeconds: 3600 },
}

beforeEach(() => {
  for (const fn of [
    getActiveOwnedAttempt,
    getAttemptQuestionRef,
    getOptionForQuestion,
    getOptionsForQuestion,
    upsertAnswer,
    upsertAnswerOptions,
    touchAttempt,
    saveAttemptAnswer,
  ]) {
    fn.mockReset()
  }
  // Default: RPC tersedia dan berhasil.
  saveAttemptAnswer.mockResolvedValue({ status: 'saved' })
  getActiveOwnedAttempt.mockResolvedValue(ATTEMPT)
  getAttemptQuestionRef.mockResolvedValue({ id: 'aq-1', position: 7 })
  getOptionForQuestion.mockResolvedValue({ id: 'opt-1', question_id: 'q-1' })
  getOptionsForQuestion.mockResolvedValue([{ id: 'opt-1', question_id: 'q-1' }])
  upsertAnswer.mockResolvedValue(undefined)
  upsertAnswerOptions.mockResolvedValue(undefined)
  touchAttempt.mockResolvedValue(undefined)
})

describe('readAttemptDurationSeconds / resolveAnswerDeadlineMs', () => {
  it('membaca durationSeconds dari metadata', () => {
    expect(readAttemptDurationSeconds({ durationSeconds: 120 } as never)).toBe(120)
  })

  it('mengabaikan durasi yang tidak masuk akal', () => {
    for (const bad of [0, -5, Number.NaN, '120', null, undefined]) {
      expect(readAttemptDurationSeconds({ durationSeconds: bad } as never)).toBeNull()
    }
    expect(readAttemptDurationSeconds(null as never)).toBeNull()
    expect(readAttemptDurationSeconds([] as never)).toBeNull()
  })

  it('menerapkan toleransi 30 detik pada deadline', () => {
    const startedAt = '2026-06-01T08:00:00.000Z'
    const deadline = resolveAnswerDeadlineMs({
      started_at: startedAt,
      metadata: { durationSeconds: 3600 },
    })
    expect(deadline).toBe(Date.parse(startedAt) + (3600 + 30) * 1000)
  })

  it('tidak membatasi attempt tanpa durasi (drill/latihan bebas)', () => {
    expect(
      resolveAnswerDeadlineMs({ started_at: '2026-06-01T08:00:00.000Z', metadata: {} }),
    ).toBeNull()
    expect(
      resolveAnswerDeadlineMs({ started_at: null, metadata: { durationSeconds: 60 } }),
    ).toBeNull()
  })
})

describe('saveAnswer — jalur utama (satu RPC)', () => {
  const input = { userId: 'user-1', attemptId: 'attempt-1', questionId: 'q-1', optionId: 'opt-1' }

  it('memanggil RPC sekali dan TIDAK menyentuh jalur lama', async () => {
    await expect(attemptAnswerService.saveAnswer(input)).resolves.toEqual({ success: true })

    expect(saveAttemptAnswer).toHaveBeenCalledTimes(1)
    expect(saveAttemptAnswer).toHaveBeenCalledWith({
      userId: 'user-1',
      attemptId: 'attempt-1',
      questionId: 'q-1',
      optionIds: ['opt-1'],
    })
    // Inti optimasinya: lima panggilan lama tidak boleh ikut jalan.
    expect(getActiveOwnedAttempt).not.toHaveBeenCalled()
    expect(getAttemptQuestionRef).not.toHaveBeenCalled()
    expect(getOptionForQuestion).not.toHaveBeenCalled()
    expect(upsertAnswer).not.toHaveBeenCalled()
    expect(touchAttempt).not.toHaveBeenCalled()
  })

  it('meneruskan penolakan domain dari database sebagai PracticeDomainError', async () => {
    saveAttemptAnswer.mockResolvedValue({
      status: 'domain_error',
      code: 'ATTEMPT_TIME_EXPIRED',
      message: 'Waktu ujian sudah berakhir',
    })

    await expect(attemptAnswerService.saveAnswer(input)).rejects.toMatchObject({
      name: 'PracticeDomainError',
      code: 'ATTEMPT_TIME_EXPIRED',
      message: 'Waktu ujian sudah berakhir',
    })
  })

  it('memetakan kode tak dikenal ke EXAM_CONFIGURATION_ERROR, bukan meneruskannya', async () => {
    // Kode dari database tidak boleh masuk mentah ke union PracticeErrorCode
    // dan pesan internalnya tidak boleh bocor apa adanya.
    saveAttemptAnswer.mockResolvedValue({
      status: 'domain_error',
      code: 'SOME_INTERNAL_CODE',
      message: 'detail internal',
    })

    await expect(attemptAnswerService.saveAnswer(input)).rejects.toMatchObject({
      code: 'EXAM_CONFIGURATION_ERROR',
    })
  })

  it('meneruskan penolakan opsi bukan milik soal', async () => {
    saveAttemptAnswer.mockResolvedValue({
      status: 'domain_error',
      code: 'EXAM_CONFIGURATION_ERROR',
      message: 'One or more options do not belong to this question',
    })

    await expect(attemptAnswerService.saveAnswer(input)).rejects.toMatchObject({
      code: 'EXAM_CONFIGURATION_ERROR',
      message: 'One or more options do not belong to this question',
    })
  })
})

describe('saveAnswerOptions — jalur utama (satu RPC)', () => {
  it('mengirim opsi yang sudah di-dedup dalam satu panggilan', async () => {
    await expect(
      attemptAnswerService.saveAnswerOptions({
        userId: 'user-1',
        attemptId: 'attempt-1',
        questionId: 'q-1',
        optionIds: ['opt-1', 'opt-2', 'opt-1', ''],
      }),
    ).resolves.toEqual({ success: true })

    expect(saveAttemptAnswer).toHaveBeenCalledTimes(1)
    expect(saveAttemptAnswer).toHaveBeenCalledWith({
      userId: 'user-1',
      attemptId: 'attempt-1',
      questionId: 'q-1',
      optionIds: ['opt-1', 'opt-2'],
    })
    expect(getOptionsForQuestion).not.toHaveBeenCalled()
    expect(upsertAnswerOptions).not.toHaveBeenCalled()
  })
})

describe('fallback ke jalur lama saat RPC belum tersedia', () => {
  const input = { userId: 'user-1', attemptId: 'attempt-1', questionId: 'q-1', optionId: 'opt-1' }

  beforeEach(() => {
    // PGRST202 → fungsi belum ada di schema cache PostgREST.
    saveAttemptAnswer.mockResolvedValue({ status: 'unavailable' })
  })

  it('saveAnswer jatuh ke lima panggilan lama dan tetap berhasil', async () => {
    await expect(attemptAnswerService.saveAnswer(input)).resolves.toEqual({ success: true })

    expect(upsertAnswer).toHaveBeenCalledWith({ attemptQuestionId: 'aq-1', optionId: 'opt-1' })
    expect(touchAttempt).toHaveBeenCalledWith('attempt-1', 7)
  })

  it('fallback tetap menolak opsi yang bukan milik soal', async () => {
    getOptionForQuestion.mockResolvedValue(null)

    await expect(attemptAnswerService.saveAnswer(input)).rejects.toMatchObject({
      message: 'Option does not belong to this question',
    })
    expect(upsertAnswer).not.toHaveBeenCalled()
  })

  it('fallback tetap menolak attempt yang bukan milik user', async () => {
    getActiveOwnedAttempt.mockResolvedValue(null)

    await expect(attemptAnswerService.saveAnswer(input)).rejects.toMatchObject({
      message: 'Attempt is not active or does not belong to user',
    })
  })

  it('fallback tetap menolak soal yang tidak dialokasikan', async () => {
    getAttemptQuestionRef.mockResolvedValue(null)

    await expect(attemptAnswerService.saveAnswer(input)).rejects.toMatchObject({
      message: 'Question is not allocated to this attempt',
    })
  })

  it('fallback tetap menolak jawaban setelah waktu ujian habis', async () => {
    getActiveOwnedAttempt.mockResolvedValue({
      ...ATTEMPT,
      started_at: new Date(Date.now() - 3600 * 1000).toISOString(),
      metadata: { durationSeconds: 60 },
    })

    await expect(attemptAnswerService.saveAnswer(input)).rejects.toMatchObject({
      code: 'ATTEMPT_TIME_EXPIRED',
    })
    expect(upsertAnswer).not.toHaveBeenCalled()
  })

  it('fallback masih menerima jawaban di dalam toleransi 30 detik', async () => {
    getActiveOwnedAttempt.mockResolvedValue({
      ...ATTEMPT,
      started_at: new Date(Date.now() - 80 * 1000).toISOString(),
      metadata: { durationSeconds: 60 },
    })

    await expect(attemptAnswerService.saveAnswer(input)).resolves.toEqual({ success: true })
  })

  it('fallback saveAnswerOptions menyimpan pilihan ganda', async () => {
    getOptionsForQuestion.mockResolvedValue([
      { id: 'opt-1', question_id: 'q-1' },
      { id: 'opt-2', question_id: 'q-1' },
    ])

    await expect(
      attemptAnswerService.saveAnswerOptions({
        userId: 'user-1',
        attemptId: 'attempt-1',
        questionId: 'q-1',
        optionIds: ['opt-1', 'opt-2'],
      }),
    ).resolves.toEqual({ success: true })

    expect(upsertAnswerOptions).toHaveBeenCalledWith({
      attemptQuestionId: 'aq-1',
      optionIds: ['opt-1', 'opt-2'],
    })
    expect(touchAttempt).toHaveBeenCalledWith('attempt-1', 7)
  })

  it('fallback saveAnswerOptions menolak opsi yang tidak ditemukan', async () => {
    getOptionsForQuestion.mockResolvedValue([{ id: 'opt-1', question_id: 'q-1' }])

    await expect(
      attemptAnswerService.saveAnswerOptions({
        userId: 'user-1',
        attemptId: 'attempt-1',
        questionId: 'q-1',
        optionIds: ['opt-1', 'opt-2'],
      }),
    ).rejects.toMatchObject({
      message: 'One or more options do not belong to this question',
    })
  })
})
