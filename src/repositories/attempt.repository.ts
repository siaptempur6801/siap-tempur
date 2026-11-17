import { createAdminClient, createV2AdminClient } from '@/lib/utils/supabase/server'
import type { Json, TablesUpdate } from '@/types/database.types'
import type { AttemptQuestionSeed } from '@/src/repositories/exam.repository'

export type AttemptRow = {
  id: string
  exam_id: string
  user_id: string
  attempt_number: number
  status: string
  started_at: string | null
  submitted_at: string | null
  duration_used_seconds: number | null
  total_score: number | null
  percentage: number | null
  passed: boolean | null
  last_question_position: number | null
  last_saved_at: string | null
  metadata: Json
}

type AttemptQuestionRow = {
  id: string
  attempt_id: string
  question_id: string
  question_version: number
  position: number
  section_id: string | null
  question_snapshot: Json
  max_score: number
}

export type AttemptAnswerRow = {
  id: string
  attempt_question_id: string
  selected_option_id: string | null
  answer_value: string | null
  is_correct: boolean | null
  score_awarded: number
  answered_at: string | null
  is_flagged: boolean
}

export type ScoringOptionRow = {
  id: string
  question_id: string
  is_correct: boolean | null
  score: number | null
  response_group: string | null
  response_group_order: number | null
}

type AttemptAnswerOptionRow = {
  attempt_answer_id: string
  option_id: string
}

/**
 * Hasil pemanggilan RPC `save_attempt_answer_for_user`.
 *
 * `unavailable` berarti fungsi belum ada di schema cache PostgREST (migration
 * belum di-apply). Pemanggil memakai jalur lama sebagai cadangan supaya
 * penyimpanan jawaban tidak pernah gagal hanya karena urutan deploy.
 *
 * `domainErrorCode` diisi bila database menolak dengan alasan domain
 * (attempt tidak aktif, soal tidak teralokasi, opsi bukan milik soal, waktu
 * habis) — pemanggil memetakannya kembali ke `PracticeDomainError` yang sama.
 */
type SaveAttemptAnswerResult =
  | { status: 'saved' }
  | { status: 'unavailable' }
  | { status: 'domain_error'; code: string; message: string }

type AttemptBundle = {
  attempt: AttemptRow
  questions: AttemptQuestionRow[]
  answers: AttemptAnswerRow[]
}

type OrganizationAttemptContext = {
  organizationId: string
  batchId: string
  assignmentId: string
  participantId: string
}

class AttemptRepository {
  async findActiveAttempt(
    userId: string,
    examId: string,
    metadataFilter?: Record<string, Json>,
  ): Promise<AttemptRow | null> {
    const admin = await createV2AdminClient()
    let query = admin
      .from('exam_attempts')
      .select(
        'id, exam_id, user_id, attempt_number, status, started_at, submitted_at, duration_used_seconds, total_score, percentage, passed, last_question_position, last_saved_at, metadata',
      )
      .eq('user_id', userId)
      .eq('exam_id', examId)
      // Direct resume must never adopt a distributed session. Event rows
      // share the b2c source for historical compatibility, so also require
      // no event reference; Organization rows have their own source.
      .filter('source', 'eq', 'b2c')
      .is('assignment_id', null)
      .is('metadata->>eventId', null)
      .in('status', ['in_progress', 'IN_PROGRESS', 'created', 'CREATED'])
      .order('created_at', { ascending: false })
      .limit(1)

    if (metadataFilter && Object.keys(metadataFilter).length > 0) {
      query = query.contains('metadata', metadataFilter)
    }

    const { data, error } = await query.maybeSingle()
    if (error) throw error
    return data as AttemptRow | null
  }

  async countAttempts(userId: string, examId: string) {
    const admin = await createV2AdminClient()
    const { count, error } = await admin
      .from('exam_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('exam_id', examId)
      .filter('source', 'eq', 'b2c')
      .is('assignment_id', null)
      .is('metadata->>eventId', null)
    if (error) throw error
    return count ?? 0
  }

  async createAttempt(input: {
    userId: string
    examId: string
    metadata: Json
    organizationContext?: OrganizationAttemptContext
  }): Promise<AttemptRow> {
    const admin = await createAdminClient()
    const { data: last, error: lastError } = await admin
      .from('exam_attempts')
      .select('attempt_number')
      .eq('user_id', input.userId)
      .eq('exam_id', input.examId)
      .order('attempt_number', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (lastError) throw lastError

    const lastAttemptNumber = typeof last?.attempt_number === 'number' ? last.attempt_number : 0
    const attemptNumber = lastAttemptNumber + 1
    const now = new Date().toISOString()
    const { data, error } = await admin
      .from('exam_attempts')
      .insert({
        user_id: input.userId,
        exam_id: input.examId,
        attempt_number: attemptNumber,
        status: 'in_progress',
        started_at: now,
        last_saved_at: now,
        metadata: input.metadata,
        ...(input.organizationContext
          ? {
              source: 'organization',
              organization_id: input.organizationContext.organizationId,
              batch_id: input.organizationContext.batchId,
              assignment_id: input.organizationContext.assignmentId,
              participant_id: input.organizationContext.participantId,
            }
          : {}),
      })
      .select(
        'id, exam_id, user_id, attempt_number, status, started_at, submitted_at, duration_used_seconds, total_score, percentage, passed, last_question_position, last_saved_at, metadata',
      )
      .single()
    if (error) throw error
    return data as AttemptRow
  }

  async createAttemptWithQuestions(input: {
    userId: string
    examId: string
    metadata: Json
    questions: AttemptQuestionSeed[]
    organizationContext?: OrganizationAttemptContext
  }): Promise<AttemptRow> {
    const attempt = await this.createAttempt({
      userId: input.userId,
      examId: input.examId,
      metadata: input.metadata,
      organizationContext: input.organizationContext,
    })

    try {
      await this.addAttemptQuestions(attempt.id, input.questions)
    } catch (error) {
      await this.deleteAttempt(attempt.id).catch(() => undefined)
      throw error
    }

    return attempt
  }

  /** The unique-index winner can be visible before its single bulk snapshot insert commits. */
  async waitForAttemptQuestions(attemptId: string) {
    const admin = await createV2AdminClient()
    const deadline = Date.now() + 5_000
    do {
      const { data, error } = await admin
        .from('attempt_questions')
        .select('id')
        .eq('attempt_id', attemptId)
        .limit(1)
        .maybeSingle()
      if (error) throw error
      if (data) return
      if (Date.now() >= deadline) break
      await new Promise((resolve) => setTimeout(resolve, 100))
    } while (Date.now() <= deadline)
    // Do not redirect into an empty session or debit a resumed attempt before it is ready.
    throw new Error('ATTEMPT_INITIALIZING')
  }

  /** Add a trusted distribution context to an attempt created by a domain RPC. */
  async mergeAttemptMetadata(userId: string, attemptId: string, metadata: Record<string, Json>) {
    const admin = await createV2AdminClient()
    const { data: attempt, error: readError } = await admin
      .from('exam_attempts')
      .select('metadata')
      .eq('id', attemptId)
      .eq('user_id', userId)
      .maybeSingle()
    if (readError) throw readError
    if (!attempt) throw new Error('Attempt not found')
    const current =
      attempt.metadata && !Array.isArray(attempt.metadata) && typeof attempt.metadata === 'object'
        ? (attempt.metadata as Record<string, Json>)
        : {}
    const { error } = await admin
      .from('exam_attempts')
      .update({ metadata: { ...current, ...metadata } })
      .eq('id', attemptId)
      .eq('user_id', userId)
    if (error) throw error
  }

  async addAttemptQuestions(attemptId: string, questions: AttemptQuestionSeed[]) {
    const admin = await createV2AdminClient()
    const { error } = await admin.from('attempt_questions').insert(
      questions.map((question) => ({
        attempt_id: attemptId,
        question_id: question.questionId,
        question_version: question.questionVersion,
        position: question.position,
        section_id: question.sectionId,
        question_snapshot: question.snapshot,
        max_score: question.maxScore,
      })),
    )
    if (error) throw error
  }

  async deleteAttempt(attemptId: string) {
    const admin = await createV2AdminClient()
    const { error } = await admin.from('exam_attempts').delete().eq('id', attemptId)
    if (error) throw error
  }

  async getActiveOwnedAttempt(userId: string, attemptId: string): Promise<AttemptRow | null> {
    const admin = await createV2AdminClient()
    const { data, error } = await admin
      .from('exam_attempts')
      .select(
        'id, exam_id, user_id, attempt_number, status, started_at, submitted_at, duration_used_seconds, total_score, percentage, passed, last_question_position, last_saved_at, metadata',
      )
      .eq('id', attemptId)
      .eq('user_id', userId)
      .in('status', ['in_progress', 'IN_PROGRESS', 'created', 'CREATED'])
      .maybeSingle()
    if (error) throw error
    return data as AttemptRow | null
  }

  async getAttemptQuestion(
    attemptId: string,
    questionId: string,
  ): Promise<AttemptQuestionRow | null> {
    const admin = await createV2AdminClient()
    const { data, error } = await admin
      .from('attempt_questions')
      .select(
        'id, attempt_id, question_id, question_version, position, section_id, question_snapshot, max_score',
      )
      .eq('attempt_id', attemptId)
      .eq('question_id', questionId)
      .maybeSingle()
    if (error) throw error
    return data as AttemptQuestionRow | null
  }

  /**
   * Varian ringan `getAttemptQuestion` untuk jalur simpan jawaban.
   *
   * Jalur itu hanya butuh `id` (untuk upsert jawaban) dan `position` (untuk
   * menandai posisi terakhir), tetapi `getAttemptQuestion` ikut menarik
   * `question_snapshot` — JSONB berisi stem soal, opsi, pembahasan, dan kunci
   * jawaban. Untuk Full Tryout CPNS (110 soal) itu berarti membaca ulang
   * dokumen besar setiap kali peserta mengklik satu opsi.
   *
   * Dipisah sebagai method tersendiri (bukan mengubah `getAttemptQuestion`)
   * supaya pemanggil yang memang membutuhkan snapshot tidak ikut berubah.
   */
  async getAttemptQuestionRef(
    attemptId: string,
    questionId: string,
  ): Promise<Pick<AttemptQuestionRow, 'id' | 'position'> | null> {
    const admin = await createV2AdminClient()
    const { data, error } = await admin
      .from('attempt_questions')
      .select('id, position')
      .eq('attempt_id', attemptId)
      .eq('question_id', questionId)
      .maybeSingle()
    if (error) throw error
    return data
  }

  async getOptionForQuestion(
    questionId: string,
    optionId: string,
  ): Promise<ScoringOptionRow | null> {
    const admin = await createAdminClient()
    const { data, error } = await admin
      .from('question_options')
      .select('id, question_id, is_correct, score, response_group, response_group_order')
      .eq('id', optionId)
      .eq('question_id', questionId)
      .maybeSingle()
    if (error) throw error
    return data as ScoringOptionRow | null
  }

  async getOptionsForQuestion(
    questionId: string,
    optionIds: string[],
  ): Promise<ScoringOptionRow[]> {
    if (optionIds.length === 0) return []
    const admin = await createAdminClient()
    const { data, error } = await admin
      .from('question_options')
      .select('id, question_id, is_correct, score, response_group, response_group_order')
      .eq('question_id', questionId)
      .in('id', optionIds)
    if (error) throw error
    return (data ?? []) as ScoringOptionRow[]
  }

  /**
   * Menyimpan jawaban satu soal dalam SATU round trip.
   *
   * Menggantikan lima panggilan berurutan di `AttemptAnswerService`
   * (`getActiveOwnedAttempt` → `getAttemptQuestionRef` →
   * `getOptionForQuestion(s)` → `upsertAnswer(Options)` → `touchAttempt`).
   * Seluruh validasi yang sama dijalankan di dalam fungsi database — termasuk
   * pemeriksaan bahwa SETIAP opsi benar-benar milik soal tersebut, yang
   * mencegah klien mengirim opsi dari soal lain untuk memanipulasi skor.
   *
   * Lihat migration `20260918150000_save_attempt_answer_single_round_trip.sql`.
   *
   * @returns `unavailable` bila RPC belum ada (migration belum di-apply),
   *          supaya pemanggil dapat memakai jalur lama.
   */
  async saveAttemptAnswer(input: {
    userId: string
    attemptId: string
    questionId: string
    optionIds: string[]
  }): Promise<SaveAttemptAnswerResult> {
    const admin = await createV2AdminClient()
    const { error } = await admin.rpc('save_attempt_answer_for_user', {
      p_user_id: input.userId,
      p_attempt_id: input.attemptId,
      p_question_id: input.questionId,
      p_option_ids: input.optionIds,
    })
    if (!error) return { status: 'saved' }

    // PGRST202 = fungsi tidak ada di schema cache PostgREST.
    if (error.code === 'PGRST202') return { status: 'unavailable' }

    // Fungsi melempar `[KODE] pesan` untuk penolakan domain. Dipetakan
    // kembali ke kode yang sama supaya pemanggil tidak perlu tahu bahwa
    // validasinya kini berjalan di database.
    const match = /^\[([A-Z_]+)\]\s*([\s\S]*)$/.exec(error.message ?? '')
    if (match) {
      return { status: 'domain_error', code: match[1], message: match[2].trim() }
    }

    throw error
  }

  async upsertAnswer(input: { attemptQuestionId: string; optionId: string }) {
    const admin = await createV2AdminClient()
    const now = new Date().toISOString()
    const { data, error } = await admin
      .from('attempt_answers')
      .upsert(
        {
          attempt_question_id: input.attemptQuestionId,
          selected_option_id: input.optionId,
          answer_value: null,
          answered_at: now,
          updated_at: now,
        },
        { onConflict: 'attempt_question_id' },
      )
      .select('id')
      .single()
    if (error) throw error

    const { error: clearError } = await admin
      .from('attempt_answer_options')
      .delete()
      .eq('attempt_answer_id', data.id)
    if (clearError) throw clearError
  }

  async upsertAnswerOptions(input: { attemptQuestionId: string; optionIds: string[] }) {
    const admin = await createV2AdminClient()
    const now = new Date().toISOString()
    const normalized = Array.from(new Set(input.optionIds))
    const { data, error } = await admin
      .from('attempt_answers')
      .upsert(
        {
          attempt_question_id: input.attemptQuestionId,
          selected_option_id: null,
          answer_value: null,
          answered_at: normalized.length > 0 ? now : null,
          updated_at: now,
        },
        { onConflict: 'attempt_question_id' },
      )
      .select('id')
      .single()
    if (error) throw error

    const { error: clearError } = await admin
      .from('attempt_answer_options')
      .delete()
      .eq('attempt_answer_id', data.id)
    if (clearError) throw clearError

    if (normalized.length > 0) {
      const { error: insertError } = await admin.from('attempt_answer_options').insert(
        normalized.map((optionId) => ({
          attempt_answer_id: data.id,
          option_id: optionId,
        })),
      )
      if (insertError) throw insertError
    }
  }

  async touchAttempt(attemptId: string, position?: number) {
    const admin = await createV2AdminClient()
    const payload: TablesUpdate<'exam_attempts'> = {
      last_saved_at: new Date().toISOString(),
    }
    if (position !== undefined) payload.last_question_position = position
    const { error } = await admin.from('exam_attempts').update(payload).eq('id', attemptId)
    if (error) throw error
  }

  async getAttemptBundle(userId: string, attemptId: string): Promise<AttemptBundle | null> {
    const admin = await createV2AdminClient()
    const { data: attempt, error: attemptError } = await admin
      .from('exam_attempts')
      .select(
        'id, exam_id, user_id, attempt_number, status, started_at, submitted_at, duration_used_seconds, total_score, percentage, passed, last_question_position, last_saved_at, metadata',
      )
      .eq('id', attemptId)
      .eq('user_id', userId)
      .maybeSingle()
    if (attemptError) throw attemptError
    if (!attempt) return null

    const { data: questions, error: questionError } = await admin
      .from('attempt_questions')
      .select(
        'id, attempt_id, question_id, question_version, position, section_id, question_snapshot, max_score',
      )
      .eq('attempt_id', attemptId)
      .order('position', { ascending: true })
    if (questionError) throw questionError

    const questionRows = (questions ?? []) as AttemptQuestionRow[]
    const questionIds = questionRows.map((row) => row.id)
    let answerRows: AttemptAnswerRow[] = []

    if (questionIds.length > 0) {
      const { data: answers, error: answerError } = await admin
        .from('attempt_answers')
        .select(
          'id, attempt_question_id, selected_option_id, answer_value, is_correct, score_awarded, answered_at, is_flagged',
        )
        .in('attempt_question_id', questionIds)
      if (answerError) throw answerError
      answerRows = (answers ?? []) as AttemptAnswerRow[]
    }

    return {
      attempt: attempt as AttemptRow,
      questions: questionRows,
      answers: answerRows,
    }
  }

  /**
   * Pakai satu jatah entitlement untuk attempt ini secara atomik (audit A-09/A-16).
   * Idempoten per attempt; menandai `metadata.entitlementId`. `false` bila tidak ada
   * entitlement yang masih berlaku dan berkuota.
   */
  async consumeEntitlementForAttempt(userId: string, attemptId: string, featureId: string) {
    // RPC baru belum ada di snapshot tipe; pakai klien admin tanpa tipe seperti RPC
    // server-only lain di repositori ini.
    const admin = await createAdminClient()
    const { data, error } = await admin.rpc('consume_entitlement_for_attempt', {
      p_user_id: userId,
      p_attempt_id: attemptId,
      p_feature_id: featureId,
    })
    if (error) throw error
    return data === true
  }

  async getAttemptMetadata(userId: string, attemptId: string): Promise<Json | null> {
    const admin = await createV2AdminClient()
    const { data, error } = await admin
      .from('exam_attempts')
      .select('metadata')
      .eq('id', attemptId)
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw error
    return data?.metadata ?? null
  }

  async getAnswerOptionSelections(answerIds: string[]): Promise<AttemptAnswerOptionRow[]> {
    if (answerIds.length === 0) return []
    const admin = await createV2AdminClient()
    const { data, error } = await admin
      .from('attempt_answer_options')
      .select('attempt_answer_id, option_id')
      .in('attempt_answer_id', answerIds)
    if (error) throw error
    return (data ?? []) as AttemptAnswerOptionRow[]
  }

  async getScoringOptions(optionIds: string[]): Promise<ScoringOptionRow[]> {
    if (optionIds.length === 0) return []
    const admin = await createAdminClient()
    const { data, error } = await admin
      .from('question_options')
      .select('id, question_id, is_correct, score, response_group, response_group_order')
      .in('id', optionIds)
    if (error) throw error
    return (data ?? []) as ScoringOptionRow[]
  }

  async getScoringOptionsForQuestions(questionIds: string[]): Promise<ScoringOptionRow[]> {
    if (questionIds.length === 0) return []
    const admin = await createAdminClient()
    const { data, error } = await admin
      .from('question_options')
      .select('id, question_id, is_correct, score, response_group, response_group_order')
      .in('question_id', questionIds)
      .order('sort_order', { ascending: true })
    if (error) throw error
    return (data ?? []) as ScoringOptionRow[]
  }

  async updateAnswerScore(answerId: string, input: { isCorrect: boolean | null; score: number }) {
    const admin = await createV2AdminClient()
    const { error } = await admin
      .from('attempt_answers')
      .update({
        is_correct: input.isCorrect,
        score_awarded: input.score,
        updated_at: new Date().toISOString(),
      })
      .eq('id', answerId)
    if (error) throw error
  }

  /**
   * Menulis skor SELURUH jawaban satu attempt dalam satu round trip.
   *
   * Menggantikan pemanggilan `updateAnswerScore` per soal di dalam loop
   * `ScoringService.finishAttempt`. Full Tryout CPNS berisi 110 soal, sehingga
   * cara lama menjalankan 110 UPDATE berurutan di dalam request submit.
   *
   * Memakai RPC `update_attempt_answer_scores` karena UPDATE massal dengan nilai
   * berbeda per baris tidak dapat diungkapkan lewat PostgREST biasa. Satu
   * pernyataan SQL juga membuat penulisan skor menjadi atomik: tidak ada lagi
   * kondisi sebagian jawaban terskor dan sebagian belum.
   *
   * Idempoten — murni UPDATE berdasarkan primary key.
   *
   * @returns `true` bila batch berhasil, `false` bila RPC belum tersedia
   *          (lihat catatan kompatibilitas di `finishAttempt`).
   */
  async updateAnswerScores(
    rows: Array<{ answerId: string; isCorrect: boolean | null; score: number }>,
  ): Promise<boolean> {
    if (rows.length === 0) return true
    const admin = await createV2AdminClient()
    const { error } = await admin.rpc('update_attempt_answer_scores', {
      p_scores: rows.map((row) => ({
        id: row.answerId,
        is_correct: row.isCorrect,
        score_awarded: row.score,
      })),
    })
    if (error) {
      // PGRST202 = fungsi tidak ada di schema cache PostgREST. Ini terjadi
      // bila kode sudah deploy tetapi migration
      // `20260918041911_batch_update_attempt_answer_scores.sql` belum
      // di-apply. Dikembalikan sebagai `false` (bukan throw) supaya
      // pemanggil dapat memakai jalur lama dan submit ujian tetap berhasil.
      if (error.code === 'PGRST202') return false
      throw error
    }
    return true
  }

  async upsertScores(
    scores: Array<{
      attemptId: string
      subjectId: string
      rawScore: number
      percentage: number | null
      passingScore: number | null
      passed: boolean | null
      correctCount: number
      wrongCount: number
      unansweredCount: number
    }>,
  ) {
    if (scores.length === 0) return
    const admin = await createV2AdminClient()
    const { error } = await admin.from('attempt_scores').upsert(
      scores.map((score) => ({
        attempt_id: score.attemptId,
        subject_id: score.subjectId,
        raw_score: score.rawScore,
        normalized_score: score.rawScore,
        percentage: score.percentage,
        passing_score: score.passingScore,
        passed: score.passed,
        correct_count: score.correctCount,
        wrong_count: score.wrongCount,
        unanswered_count: score.unansweredCount,
      })),
      { onConflict: 'attempt_id,subject_id' },
    )
    if (error) throw error
  }

  async completeAttempt(input: {
    attemptId: string
    totalScore: number
    percentage: number | null
    passed: boolean | null
    durationUsedSeconds: number | null
  }) {
    const admin = await createV2AdminClient()
    const now = new Date().toISOString()
    const { error } = await admin
      .from('exam_attempts')
      .update({
        status: 'completed',
        submitted_at: now,
        last_saved_at: now,
        total_score: input.totalScore,
        percentage: input.percentage,
        passed: input.passed,
        duration_used_seconds: input.durationUsedSeconds,
      })
      .eq('id', input.attemptId)
    if (error) throw error
  }
}

export const attemptRepository = new AttemptRepository()
