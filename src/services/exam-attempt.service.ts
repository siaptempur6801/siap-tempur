import { attemptRepository } from '@/src/repositories/attempt.repository'
import {
  examRepository,
  type CanonicalExamType,
  type ResolvedExam,
} from '@/src/repositories/exam.repository'
import { configuredExamRepository } from '@/src/repositories/configured-exam.repository'
import type { Json } from '@/types/database.types'
import { createV2AdminClient } from '@/lib/utils/supabase/server'
import { walletService, WalletDomainError } from '@/src/services/wallet.service'
import { CPNS_SKD_CONTEXT, type ProgramTrackContext } from '@/src/services/catalog-context.service'
import { decideExamAccess } from '@/src/services/exam-access-policy'

export type PracticeErrorCode =
  | 'EXAM_NOT_CONFIGURED'
  | 'QUESTION_BANK_INCOMPLETE'
  | 'QUESTION_BANK_EMPTY'
  | 'ATTEMPT_LIMIT_REACHED'
  | 'INSUFFICIENT_TOKEN_BALANCE'
  | 'ENTITLEMENT_REQUIRED'
  | 'EXPIRED_ATTEMPT'
  | 'ATTEMPT_TIME_EXPIRED'
  | 'EXAM_CONFIGURATION_ERROR'

type ContextualPracticeInput = {
  context?: ProgramTrackContext
}

export class PracticeDomainError extends Error {
  constructor(
    public readonly code: PracticeErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'PracticeDomainError'
  }
}

type StartInput = {
  userId: string
  programCode: string
  trackCode: string
  examTypeCode: CanonicalExamType
  subjectCode?: string
  questionCount?: number
  knowledgeNodeName?: string
  kind: 'mini_tryout' | 'drill' | 'full_tryout'
}

export type StartAttemptResult = {
  attemptId: string
  resumed: boolean
}

type EntitlementRow = {
  id: string
  starts_at: string
  expires_at: string | null
  usage_limit: number | null
  usage_count: number
}

function resolveContext(context?: ProgramTrackContext): ProgramTrackContext {
  return context ?? CPNS_SKD_CONTEXT
}

function metadataFor(input: StartInput, exam: ResolvedExam): Record<string, Json> {
  const metadata: Record<string, Json> = {
    schemaVersion: 2,
    practiceKind: input.kind,
    programCode: input.programCode,
    trackCode: input.trackCode,
    examTypeCode: exam.examTypeCode,
    examSlug: exam.slug,
    durationSeconds: exam.durationSeconds,
  }
  if (input.subjectCode) metadata.subjectCode = input.subjectCode
  if (input.knowledgeNodeName) metadata.knowledgeNode = input.knowledgeNodeName
  return metadata
}

function isExpired(exam: ResolvedExam, startedAt: string | null) {
  if (!exam.durationSeconds || !startedAt) return false
  return Date.now() >= Date.parse(startedAt) + exam.durationSeconds * 1000
}

function isEntitlementUsable(entitlement: EntitlementRow) {
  const now = Date.now()
  const startsAt = Date.parse(entitlement.starts_at)
  const expiresAt = entitlement.expires_at ? Date.parse(entitlement.expires_at) : null
  const withinWindow =
    Number.isFinite(startsAt) && startsAt <= now && (expiresAt === null || expiresAt > now)
  const withinUsage =
    entitlement.usage_limit === null || entitlement.usage_count < entitlement.usage_limit
  return withinWindow && withinUsage
}

function practiceKindForConfiguredExam(examType: CanonicalExamType): StartInput['kind'] {
  if (examType === 'MINI_TRYOUT') return 'mini_tryout'
  if (examType === 'FULL_TRYOUT') return 'full_tryout'
  throw new PracticeDomainError(
    'EXAM_CONFIGURATION_ERROR',
    `Configured exam type ${examType} is not supported by the generic practice starter`,
  )
}

function accessType(exam: ResolvedExam) {
  return exam.accessType.trim().toUpperCase()
}

class ExamAttemptService {
  async startMiniTryout(
    input: ContextualPracticeInput & { userId: string; subjectCode: string; questionCount: number },
  ) {
    const context = resolveContext(input.context)
    return this.start({
      userId: input.userId,
      programCode: context.programCode,
      trackCode: context.trackCode,
      examTypeCode: 'MINI_TRYOUT',
      subjectCode: input.subjectCode,
      questionCount: input.questionCount,
      kind: 'mini_tryout',
    })
  }

  async startDrill(
    input: ContextualPracticeInput & {
      userId: string
      subjectCode: string
      knowledgeNodeName: string
      questionCount: number
    },
  ) {
    const context = resolveContext(input.context)
    return this.start({
      userId: input.userId,
      programCode: context.programCode,
      trackCode: context.trackCode,
      examTypeCode: 'DRILL',
      subjectCode: input.subjectCode,
      knowledgeNodeName: input.knowledgeNodeName,
      questionCount: input.questionCount,
      kind: 'drill',
    })
  }

  async startFullTryout(input: ContextualPracticeInput & { userId: string }) {
    const context = resolveContext(input.context)
    return this.start({
      userId: input.userId,
      programCode: context.programCode,
      trackCode: context.trackCode,
      examTypeCode: 'FULL_TRYOUT',
      kind: 'full_tryout',
    })
  }

  async startConfiguredExam(input: ContextualPracticeInput & { userId: string; examSlug: string }) {
    const context = resolveContext(input.context)
    const exam = await configuredExamRepository.findBySlug({
      programCode: context.programCode,
      trackCode: context.trackCode,
      slug: input.examSlug,
    })
    if (!exam) {
      throw new PracticeDomainError(
        'EXAM_NOT_CONFIGURED',
        `Exam ${input.examSlug} is not active for ${context.programCode}/${context.trackCode}`,
      )
    }

    return this.startResolved(
      {
        userId: input.userId,
        programCode: context.programCode,
        trackCode: context.trackCode,
        examTypeCode: exam.examTypeCode,
        kind: practiceKindForConfiguredExam(exam.examTypeCode),
      },
      exam,
    )
  }

  private async start(input: StartInput): Promise<StartAttemptResult> {
    const exam = await examRepository.findExam({
      programCode: input.programCode,
      trackCode: input.trackCode,
      examTypeCode: input.examTypeCode,
      subjectCode: input.subjectCode,
    })

    if (!exam) {
      throw new PracticeDomainError(
        'EXAM_NOT_CONFIGURED',
        `${input.examTypeCode} exam is not configured for ${input.programCode}/${input.trackCode}${input.subjectCode ? `/${input.subjectCode}` : ''}`,
      )
    }

    return this.startResolved(input, exam)
  }

  private async startResolved(input: StartInput, exam: ResolvedExam): Promise<StartAttemptResult> {
    const metadata = metadataFor(input, exam)
    const existing = await attemptRepository.findActiveAttempt(input.userId, exam.id, {
      schemaVersion: 2,
      practiceKind: input.kind,
      ...(input.subjectCode ? { subjectCode: input.subjectCode } : {}),
      ...(input.knowledgeNodeName ? { knowledgeNode: input.knowledgeNodeName } : {}),
    })
    if (existing) {
      if (isExpired(exam, existing.started_at)) {
        throw new PracticeDomainError(
          'EXPIRED_ATTEMPT',
          'Active attempt has expired and must be scored before starting a new attempt',
          { attemptId: existing.id },
        )
      }
      await attemptRepository.waitForAttemptQuestions(existing.id)
      const resumeCoveredByEntitlement = await this.isSessionCoveredByEntitlement(
        input.userId,
        exam,
      )
      await this.chargeAttempt(
        input.userId,
        existing.id,
        resumeCoveredByEntitlement ? 0 : exam.tokenCost,
      )
      return { attemptId: existing.id, resumed: true }
    }

    const freemium = accessType(exam) === 'FREEMIUM'
    let usedAttempts: number | null = null
    if (freemium || exam.attemptLimit !== null) {
      usedAttempts = await attemptRepository.countAttempts(input.userId, exam.id)
    }

    if (!freemium && exam.attemptLimit !== null && (usedAttempts ?? 0) >= exam.attemptLimit) {
      throw new PracticeDomainError('ATTEMPT_LIMIT_REACHED', 'Exam attempt limit reached')
    }

    const access = await this.assertAccess(input.userId, exam, usedAttempts)

    let questions
    try {
      questions = await examRepository.buildQuestionSet({
        exam,
        requestedQuestionCount: input.questionCount,
        knowledgeNodeName: input.knowledgeNodeName,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (message.startsWith('QUESTION_BANK_INCOMPLETE:')) {
        const [, selected, required] = message.split(':')
        throw new PracticeDomainError('QUESTION_BANK_INCOMPLETE', message, {
          selected: Number(selected),
          required: Number(required),
        })
      }
      if (message === 'QUESTION_BANK_EMPTY') {
        throw new PracticeDomainError('QUESTION_BANK_EMPTY', message)
      }
      throw new PracticeDomainError('EXAM_CONFIGURATION_ERROR', message)
    }

    let attempt
    try {
      attempt = await attemptRepository.createAttemptWithQuestions({
        userId: input.userId,
        examId: exam.id,
        metadata,
        questions,
      })
    } catch (error) {
      // A partial unique index arbitrates simultaneous starts in the same
      // Direct/Event context. Reuse only the Direct row won by this user.
      if (!error || typeof error !== 'object' || !('code' in error) || error.code !== '23505')
        throw error
      const raced = await attemptRepository.findActiveAttempt(input.userId, exam.id, {
        schemaVersion: 2,
        practiceKind: input.kind,
        ...(input.subjectCode ? { subjectCode: input.subjectCode } : {}),
        ...(input.knowledgeNodeName ? { knowledgeNode: input.knowledgeNodeName } : {}),
      })
      if (!raced) throw error
      await attemptRepository.waitForAttemptQuestions(raced.id)
      return { attemptId: raced.id, resumed: true }
    }

    try {
      await this.chargeAttempt(
        input.userId,
        attempt.id,
        access.coveredByEntitlement ? 0 : exam.tokenCost,
      )
    } catch (error) {
      if (error instanceof PracticeDomainError && error.code === 'INSUFFICIENT_TOKEN_BALANCE') {
        await attemptRepository.deleteAttempt(attempt.id).catch(() => undefined)
      }
      throw error
    }

    return { attemptId: attempt.id, resumed: false }
  }

  private async findUsableEntitlement(userId: string, featureId: string) {
    const admin = await createV2AdminClient()
    const { data, error } = await admin
      .from('entitlements')
      .select('id, starts_at, expires_at, usage_limit, usage_count')
      .eq('user_id', userId)
      .eq('feature_id', featureId)
      .in('status', ['ACTIVE', 'active'])
    if (error) throw error
    return ((data ?? []) as EntitlementRow[]).find(isEntitlementUsable) ?? null
  }

  /** Sesudah `assertAccess`: apakah entitlement menutup sesi ini (token tidak dipotong). */
  private async isSessionCoveredByEntitlement(userId: string, exam: ResolvedExam) {
    if (exam.tokenCost <= 0 || !exam.requiredFeatureId) return false
    return Boolean(await this.findUsableEntitlement(userId, exam.requiredFeatureId))
  }

  private async assertAccess(
    userId: string,
    exam: ResolvedExam,
    usedAttempts: number | null = null,
  ): Promise<{ coveredByEntitlement: boolean }> {
    const hasActiveEntitlement = exam.requiredFeatureId
      ? Boolean(await this.findUsableEntitlement(userId, exam.requiredFeatureId))
      : false

    // FREEMIUM butuh jumlah attempt terpakai; hitung di sini bila pemanggil belum menyiapkan.
    const effectiveUsedAttempts =
      usedAttempts ??
      (accessType(exam) === 'FREEMIUM'
        ? await attemptRepository.countAttempts(userId, exam.id)
        : null)

    const decision = decideExamAccess({
      accessType: accessType(exam),
      requiredFeatureId: exam.requiredFeatureId,
      tokenCost: exam.tokenCost,
      attemptLimit: exam.attemptLimit,
      usedAttempts: effectiveUsedAttempts,
      hasActiveEntitlement,
    })

    if (!decision.allow) {
      throw new PracticeDomainError(decision.code, decision.message, decision.details)
    }

    if (exam.tokenCost > 0 && !decision.coveredByEntitlement) {
      try {
        await walletService.assertCanAfford(userId, exam.tokenCost, exam.programId)
      } catch (error) {
        if (error instanceof WalletDomainError && error.code === 'INSUFFICIENT_TOKEN_BALANCE') {
          throw new PracticeDomainError('INSUFFICIENT_TOKEN_BALANCE', error.message, {
            tokenCost: exam.tokenCost,
          })
        }
        throw error
      }
    }

    return { coveredByEntitlement: decision.coveredByEntitlement }
  }

  private async chargeAttempt(userId: string, attemptId: string, tokenCost: number) {
    if (tokenCost <= 0) return
    try {
      await walletService.debitForAttempt(userId, attemptId)
    } catch (error) {
      if (error instanceof WalletDomainError) {
        if (error.code === 'INSUFFICIENT_TOKEN_BALANCE' || error.code === 'WALLET_NOT_FOUND') {
          throw new PracticeDomainError('INSUFFICIENT_TOKEN_BALANCE', error.message, { tokenCost })
        }
        throw new PracticeDomainError('EXAM_CONFIGURATION_ERROR', error.message)
      }
      throw error
    }
  }
}

export const examAttemptService = new ExamAttemptService()
