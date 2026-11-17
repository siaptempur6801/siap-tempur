import { attemptRepository, type AttemptRow } from '@/src/repositories/attempt.repository'
import { PracticeDomainError, type PracticeErrorCode } from '@/src/services/exam-attempt.service'

/**
 * Kode error yang boleh dikembalikan database lewat RPC
 * `save_attempt_answer_for_user`. Daftar putih ini mencegah nilai tak dikenal
 * dari database masuk ke union `PracticeErrorCode` tanpa pemeriksaan.
 */
const RPC_DOMAIN_ERROR_CODES: readonly PracticeErrorCode[] = [
    'EXAM_CONFIGURATION_ERROR',
    'ATTEMPT_TIME_EXPIRED',
]

function isPracticeErrorCode(value: string): value is PracticeErrorCode {
    return (RPC_DOMAIN_ERROR_CODES as readonly string[]).includes(value)
}

/**
 * Memetakan penolakan dari RPC ke `PracticeDomainError`.
 *
 * Kode yang tidak dikenal diperlakukan sebagai kesalahan konfigurasi, bukan
 * diteruskan mentah-mentah — supaya pesan internal database tidak bocor ke
 * klien dan tipe `PracticeErrorCode` tetap terjaga.
 */
function toDomainError(result: { code: string; message: string }): PracticeDomainError {
    const code: PracticeErrorCode = isPracticeErrorCode(result.code)
        ? result.code
        : 'EXAM_CONFIGURATION_ERROR'
    return new PracticeDomainError(code, result.message)
}

/**
 * Toleransi kecil untuk latensi jaringan saat jawaban terakhir dikirim tepat di
 * detik terakhir. Tidak mengubah integritas skor secara berarti.
 */
const ANSWER_SAVE_GRACE_SECONDS = 30

export function readAttemptDurationSeconds(metadata: AttemptRow['metadata']): number | null {
    if (!metadata || Array.isArray(metadata) || typeof metadata !== 'object') return null
    const value = (metadata as Record<string, unknown>).durationSeconds
    return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null
}

/**
 * Deadline penyimpanan jawaban (ms). `null` berarti attempt tidak dibatasi waktu
 * (drill/latihan bebas atau durasi tidak diketahui).
 */
export function resolveAnswerDeadlineMs(
    attempt: Pick<AttemptRow, 'metadata' | 'started_at'>,
): number | null {
    const durationSeconds = readAttemptDurationSeconds(attempt.metadata)
    if (!durationSeconds || !attempt.started_at) return null

    const deadlineMs = Date.parse(attempt.started_at) + (durationSeconds + ANSWER_SAVE_GRACE_SECONDS) * 1000
    return Number.isFinite(deadlineMs) ? deadlineMs : null
}

/**
 * Timer di browser hanya alat bantu; batas waktu ujian wajib ditegakkan di server.
 * Tanpa ini, jawaban masih bisa dikirim setelah waktu habis dan skor/leaderboard
 * menjadi tidak sah.
 */
export function assertAnswerWindowOpen(attempt: AttemptRow) {
    const deadlineMs = resolveAnswerDeadlineMs(attempt)
    if (deadlineMs === null) return

    if (Date.now() > deadlineMs) {
        throw new PracticeDomainError(
            'ATTEMPT_TIME_EXPIRED',
            'Waktu ujian sudah berakhir',
            { deadline: new Date(deadlineMs).toISOString() },
        )
    }
}

export class AttemptAnswerService {
    /**
     * Menyimpan jawaban satu soal.
     *
     * Jalur utama adalah satu RPC (`save_attempt_answer_for_user`) yang
     * menjalankan seluruh validasi dan penulisan dalam SATU round trip.
     * Sebelumnya jalur ini menembus jaringan lima kali per klik jawaban
     * (attempt → soal → opsi → upsert → touch), ditambah `auth.getUser()` di
     * server action.
     *
     * Bila RPC belum tersedia (migration belum di-apply), jalur lama dipakai
     * sebagai cadangan. Ini disengaja: menyimpan jawaban peserta adalah operasi
     * yang tidak boleh gagal hanya karena urutan deploy, dan validasinya
     * identik di kedua jalur.
     */
    async saveAnswer(input: {
        userId: string
        attemptId: string
        questionId: string
        optionId: string
    }) {
        const result = await attemptRepository.saveAttemptAnswer({
            userId: input.userId,
            attemptId: input.attemptId,
            questionId: input.questionId,
            optionIds: [input.optionId],
        })

        if (result.status === 'domain_error') {
            throw toDomainError(result)
        }
        if (result.status === 'saved') return { success: true as const }

        return this.saveAnswerLegacy(input)
    }

    async saveAnswerOptions(input: {
        userId: string
        attemptId: string
        questionId: string
        optionIds: string[]
    }) {
        // Dedup + buang string kosong dilakukan sebelum apa pun, supaya klien
        // yang mengirim opsi duplikat tidak ditolak oleh pemeriksaan jumlah.
        const optionIds = Array.from(new Set(input.optionIds.filter(Boolean)))

        const result = await attemptRepository.saveAttemptAnswer({
            userId: input.userId,
            attemptId: input.attemptId,
            questionId: input.questionId,
            optionIds,
        })

        if (result.status === 'domain_error') {
            throw toDomainError(result)
        }
        if (result.status === 'saved') return { success: true as const }

        return this.saveAnswerOptionsLegacy({ ...input, optionIds })
    }

    /**
     * Jalur lama: lima panggilan berurutan.
     *
     * Dipertahankan sebagai cadangan selama masa transisi migration. Dapat
     * dihapus setelah `save_attempt_answer_for_user` dipastikan ter-apply di
     * semua environment (staging & produksi).
     */
    private async saveAnswerLegacy(input: {
        userId: string
        attemptId: string
        questionId: string
        optionId: string
    }) {
        const attempt = await attemptRepository.getActiveOwnedAttempt(input.userId, input.attemptId)
        if (!attempt) {
            throw new PracticeDomainError('EXAM_CONFIGURATION_ERROR', 'Attempt is not active or does not belong to user')
        }
        assertAnswerWindowOpen(attempt)

        const attemptQuestion = await attemptRepository.getAttemptQuestionRef(input.attemptId, input.questionId)
        if (!attemptQuestion) {
            throw new PracticeDomainError('EXAM_CONFIGURATION_ERROR', 'Question is not allocated to this attempt')
        }

        const option = await attemptRepository.getOptionForQuestion(input.questionId, input.optionId)
        if (!option) {
            throw new PracticeDomainError('EXAM_CONFIGURATION_ERROR', 'Option does not belong to this question')
        }

        await attemptRepository.upsertAnswer({
            attemptQuestionId: attemptQuestion.id,
            optionId: option.id,
        })
        await attemptRepository.touchAttempt(input.attemptId, attemptQuestion.position)

        return { success: true as const }
    }

    /** Cadangan jalur lama untuk pilihan ganda. Lihat `saveAnswerLegacy`. */
    private async saveAnswerOptionsLegacy(input: {
        userId: string
        attemptId: string
        questionId: string
        optionIds: string[]
    }) {
        const attempt = await attemptRepository.getActiveOwnedAttempt(input.userId, input.attemptId)
        if (!attempt) {
            throw new PracticeDomainError('EXAM_CONFIGURATION_ERROR', 'Attempt is not active or does not belong to user')
        }
        assertAnswerWindowOpen(attempt)

        const attemptQuestion = await attemptRepository.getAttemptQuestionRef(input.attemptId, input.questionId)
        if (!attemptQuestion) {
            throw new PracticeDomainError('EXAM_CONFIGURATION_ERROR', 'Question is not allocated to this attempt')
        }

        const optionIds = Array.from(new Set(input.optionIds.filter(Boolean)))
        const options = await attemptRepository.getOptionsForQuestion(input.questionId, optionIds)
        if (options.length !== optionIds.length) {
            throw new PracticeDomainError('EXAM_CONFIGURATION_ERROR', 'One or more options do not belong to this question')
        }

        await attemptRepository.upsertAnswerOptions({
            attemptQuestionId: attemptQuestion.id,
            optionIds,
        })
        await attemptRepository.touchAttempt(input.attemptId, attemptQuestion.position)

        return { success: true as const }
    }
}

export const attemptAnswerService = new AttemptAnswerService()
