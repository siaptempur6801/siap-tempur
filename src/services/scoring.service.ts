import {
  attemptRepository,
  type AttemptAnswerRow,
  type ScoringOptionRow,
} from '@/src/repositories/attempt.repository'
import { PracticeDomainError } from '@/src/services/exam-attempt.service'
import { calculateResponseScore, type ResponseScoringConfig } from '@/src/domain/question-response'
import { logger } from '@/lib/logger'
import type { Json } from '@/types/database.types'

type SubjectAccumulator = {
  subjectId: string
  rawScore: number
  maxScore: number
  correctCount: number
  wrongCount: number
  unansweredCount: number
  passingScore: number | null
}

function readSnapshotField<T extends string | number>(snapshot: Json, key: string): T | null {
  if (!snapshot || Array.isArray(snapshot) || typeof snapshot !== 'object') return null
  const value = snapshot[key]
  if (typeof value === 'string' || typeof value === 'number') return value as T
  return null
}

function readResponseConfig(snapshot: Json): ResponseScoringConfig | undefined {
  if (!snapshot || Array.isArray(snapshot) || typeof snapshot !== 'object') return undefined
  const raw = snapshot.responseConfig
  if (!raw || Array.isArray(raw) || typeof raw !== 'object') return undefined
  const mode = raw.scoringMode ?? raw.scoring_mode
  if (mode === 'single_option' || mode === 'exact_set' || mode === 'grouped_sum') {
    return { scoringMode: mode }
  }
  return undefined
}

/** Opsi dari snapshot beku, dalam bentuk yang dipahami `calculateResponseScore`. */
export type FrozenOption = {
  id: string
  isCorrect: boolean | null
  score: number | null
  responseGroup: string | null
  responseGroupOrder: number | null
}

function readFrozenString(source: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'string' && value !== '') return value
  }
  return null
}

function readFrozenNullableNumber(
  source: Record<string, unknown>,
  ...keys: string[]
): number | null {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
  }
  return null
}

/**
 * Membaca opsi dari `question_snapshot` yang dibekukan saat attempt dibuat.
 *
 * Mengembalikan array kosong bila snapshot tidak memuat kunci jawaban — yaitu
 * attempt yang dibuat sebelum kunci ikut dibekukan. Pemanggil memakai hasil kosong
 * ini sebagai sinyal untuk jatuh ke opsi hidup.
 */
export function readSnapshotOptions(snapshot: Json): FrozenOption[] {
  if (!snapshot || Array.isArray(snapshot) || typeof snapshot !== 'object') return []
  const raw = snapshot.options
  if (!Array.isArray(raw)) return []

  return raw.flatMap((value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return []
    const option = value as Record<string, unknown>
    const id = readFrozenString(option, 'id')
    // Kunci jawaban harus ada; tanpa itu snapshot dianggap tidak membawa kunci.
    if (!id || !('isCorrect' in option)) return []
    const isCorrect = option.isCorrect
    return [
      {
        id,
        isCorrect: typeof isCorrect === 'boolean' ? isCorrect : null,
        score: readFrozenNullableNumber(option, 'score'),
        responseGroup: readFrozenString(option, 'responseGroup', 'response_group'),
        responseGroupOrder: readFrozenNullableNumber(
          option,
          'responseGroupOrder',
          'response_group_order',
        ),
      },
    ]
  })
}

function durationSeconds(startedAt: string | null) {
  if (!startedAt) return null
  const started = Date.parse(startedAt)
  if (!Number.isFinite(started)) return null
  return Math.max(0, Math.floor((Date.now() - started) / 1000))
}

function selectionMapForAnswers(input: {
  answers: AttemptAnswerRow[]
  joinedSelections: Array<{ attempt_answer_id: string; option_id: string }>
}) {
  const map = new Map<string, string[]>()
  for (const row of input.joinedSelections) {
    const ids = map.get(row.attempt_answer_id) ?? []
    ids.push(row.option_id)
    map.set(row.attempt_answer_id, ids)
  }
  for (const answer of input.answers) {
    if (!map.has(answer.id) && answer.selected_option_id) {
      map.set(answer.id, [answer.selected_option_id])
    }
  }
  return map
}

function optionMapForQuestions(options: ScoringOptionRow[]) {
  const map = new Map<string, ScoringOptionRow[]>()
  for (const option of options) {
    const rows = map.get(option.question_id) ?? []
    rows.push(option)
    map.set(option.question_id, rows)
  }
  return map
}

class ScoringService {
  async finishAttempt(userId: string, attemptId: string) {
    const bundle = await attemptRepository.getAttemptBundle(userId, attemptId)
    if (!bundle) {
      throw new PracticeDomainError('EXAM_CONFIGURATION_ERROR', 'Attempt not found')
    }

    if (!['in_progress', 'IN_PROGRESS', 'created', 'CREATED'].includes(bundle.attempt.status)) {
      return {
        success: true as const,
        alreadyCompleted: true as const,
        totalScore: bundle.attempt.total_score ?? 0,
        percentage: bundle.attempt.percentage,
        passed: bundle.attempt.passed,
      }
    }

    if (bundle.questions.length === 0) {
      throw new PracticeDomainError(
        'EXAM_CONFIGURATION_ERROR',
        'Attempt has no allocated questions',
      )
    }

    const answerByQuestion = new Map<string, AttemptAnswerRow>()
    for (const answer of bundle.answers) answerByQuestion.set(answer.attempt_question_id, answer)

    /**
     * Kunci jawaban dibaca dari `question_snapshot` yang DIBEKUKAN saat attempt
     * dibuat, bukan dari `question_options` yang hidup.
     *
     * Konsekuensinya: memperbaiki kunci soal tidak mengubah nilai peserta yang
     * sudah mengerjakan — keputusan produk 2026-09-18. Sebelumnya jalur ini
     * membaca tabel hidup sehingga nilai historis ikut bergerak, sementara
     * jalur TKA (`app_private.score_exam_attempt`) sudah memakai snapshot:
     * satu attempt, dua kunci jawaban berbeda.
     *
     * Attempt yang dibuat SEBELUM snapshot memuat kunci tidak punya data ini,
     * jadi jalur lama dipertahankan sebagai fallback (dan dicatat di log)
     * supaya attempt lama tetap dapat diselesaikan dan diskor.
     *
     * Snapshot di-parse SEKALI di sini dan hasilnya dipakai ulang di loop
     * penilaian. Sebelumnya `readSnapshotOptions` dipanggil dua kali per soal
     * (sekali untuk cek ketersediaan, sekali saat menilai), sehingga Full
     * Tryout 110 soal mem-parse JSONB yang sama 220 kali.
     */
    const frozenOptionsByQuestion = new Map(
      bundle.questions.map((question) => [
        question.id,
        readSnapshotOptions(question.question_snapshot),
      ]),
    )
    const frozenOptionsAvailable = bundle.questions.every(
      (question) => (frozenOptionsByQuestion.get(question.id)?.length ?? 0) > 0,
    )

    const [joinedSelections, liveScoringOptions] = await Promise.all([
      attemptRepository.getAnswerOptionSelections(bundle.answers.map((answer) => answer.id)),
      frozenOptionsAvailable
        ? Promise.resolve([] as ScoringOptionRow[])
        : attemptRepository.getScoringOptionsForQuestions(
            bundle.questions.map((question) => question.question_id),
          ),
    ])
    const selectionsByAnswer = selectionMapForAnswers({ answers: bundle.answers, joinedSelections })
    const liveOptionsByQuestion = optionMapForQuestions(liveScoringOptions)

    if (!frozenOptionsAvailable) {
      logger.warn(
        '[scoring] Snapshot attempt tidak memuat kunci jawaban — memakai opsi hidup (attempt lama)',
        { attemptId, questionCount: bundle.questions.length },
      )
    }

    const subjects = new Map<string, SubjectAccumulator>()
    let totalScore = 0
    let totalMaxScore = 0
    const answerScoresToPersist: Array<{
      answerId: string
      isCorrect: boolean | null
      score: number
    }> = []

    for (const question of bundle.questions) {
      const answer = answerByQuestion.get(question.id)
      const selectedOptionIds = answer ? (selectionsByAnswer.get(answer.id) ?? []) : []
      const questionType =
        readSnapshotField<string>(question.question_snapshot, 'questionType') ?? 'single_choice'
      const responseConfig = readResponseConfig(question.question_snapshot)
      const frozenOptions = frozenOptionsByQuestion.get(question.id) ?? []
      const options =
        frozenOptions.length > 0
          ? frozenOptions
          : (liveOptionsByQuestion.get(question.question_id) ?? []).map((option) => ({
              id: option.id,
              isCorrect: option.is_correct,
              score: option.score,
              responseGroup: option.response_group,
              responseGroupOrder: option.response_group_order,
            }))
      const scored = calculateResponseScore({
        questionType,
        selectedOptionIds,
        options,
        config: responseConfig,
      })

      totalScore += scored.score
      totalMaxScore += scored.maxScore

      const subjectId = readSnapshotField<string>(question.question_snapshot, 'subjectId')
      if (subjectId) {
        const current = subjects.get(subjectId) ?? {
          subjectId,
          rawScore: 0,
          maxScore: 0,
          correctCount: 0,
          wrongCount: 0,
          unansweredCount: 0,
          passingScore: readSnapshotField<number>(question.question_snapshot, 'passingScore'),
        }

        current.rawScore += scored.score
        current.maxScore += scored.maxScore
        if (!scored.answered) current.unansweredCount += 1
        else if (scored.isCorrect === true) current.correctCount += 1
        else current.wrongCount += 1
        subjects.set(subjectId, current)
      }

      if (answer) {
        // Dikumpulkan dulu, ditulis sekali setelah loop. Sebelumnya setiap
        // soal menjalankan satu UPDATE berurutan — 110 round trip untuk satu
        // Full Tryout, di dalam request submit.
        answerScoresToPersist.push({
          answerId: answer.id,
          isCorrect: scored.isCorrect,
          score: scored.score,
        })
      }
    }

    /**
     * Kompatibilitas deploy: `update_attempt_answer_scores` baru tersedia
     * setelah migration `20260918041911_batch_update_attempt_answer_scores.sql`
     * di-apply. Bila RPC belum ada, jalur batch mengembalikan `false` dan kita
     * jatuh ke penulisan per jawaban.
     *
     * Fallback ini murni jaring keamanan agar submit ujian tidak pernah gagal
     * hanya karena migration belum jalan — bukan jalur yang diharapkan. Ia
     * dapat dihapus setelah migration dipastikan ter-apply di semua
     * environment (staging & produksi).
     */
    const batchWritten = await attemptRepository.updateAnswerScores(answerScoresToPersist)
    if (!batchWritten) {
      logger.warn(
        '[scoring] RPC update_attempt_answer_scores belum tersedia — memakai penulisan per jawaban',
        { attemptId, answerCount: answerScoresToPersist.length },
      )
      for (const row of answerScoresToPersist) {
        await attemptRepository.updateAnswerScore(row.answerId, {
          isCorrect: row.isCorrect,
          score: row.score,
        })
      }
    }

    const subjectScores = Array.from(subjects.values()).map((subject) => {
      const percentage =
        subject.maxScore > 0
          ? Number(((subject.rawScore / subject.maxScore) * 100).toFixed(2))
          : null
      const passed = subject.passingScore === null ? null : subject.rawScore >= subject.passingScore
      return {
        attemptId,
        subjectId: subject.subjectId,
        rawScore: subject.rawScore,
        percentage,
        passingScore: subject.passingScore,
        passed,
        correctCount: subject.correctCount,
        wrongCount: subject.wrongCount,
        unansweredCount: subject.unansweredCount,
      }
    })

    await attemptRepository.upsertScores(subjectScores)

    const percentage =
      totalMaxScore > 0 ? Number(((totalScore / totalMaxScore) * 100).toFixed(2)) : null
    const passStates = subjectScores
      .map((score) => score.passed)
      .filter((value): value is boolean => value !== null)
    const passed =
      passStates.length === subjectScores.length && passStates.length > 0
        ? passStates.every(Boolean)
        : null

    await attemptRepository.completeAttempt({
      attemptId,
      totalScore,
      percentage,
      passed,
      durationUsedSeconds: durationSeconds(bundle.attempt.started_at),
    })

    return {
      success: true as const,
      alreadyCompleted: false as const,
      totalScore,
      percentage,
      passed,
    }
  }
}

export const scoringService = new ScoringService()
