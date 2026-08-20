import { attemptRepository } from '@/src/repositories/attempt.repository'
import { examRepository, type CanonicalExamType, type ResolvedExam } from '@/src/repositories/exam.repository'
import type { Json } from '@/types/database.types'
import { createV2AdminClient } from '@/lib/utils/supabase/server'

export type PracticeErrorCode =
    | 'EXAM_NOT_CONFIGURED'
    | 'QUESTION_BANK_INCOMPLETE'
    | 'QUESTION_BANK_EMPTY'
    | 'ATTEMPT_LIMIT_REACHED'
    | 'TOKEN_FLOW_PENDING'
    | 'ENTITLEMENT_REQUIRED'
    | 'EXPIRED_ATTEMPT'
    | 'EXAM_CONFIGURATION_ERROR'

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

function metadataFor(input: StartInput): Record<string, Json> {
    const metadata: Record<string, Json> = {
        schemaVersion: 2,
        practiceKind: input.kind,
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
    const withinWindow = Number.isFinite(startsAt) && startsAt <= now && (expiresAt === null || expiresAt > now)
    const withinUsage = entitlement.usage_limit === null || entitlement.usage_count < entitlement.usage_limit
    return withinWindow && withinUsage
}

export class ExamAttemptService {
    async startMiniTryout(input: { userId: string; subjectCode: string; questionCount: number }) {
        return this.start({
            userId: input.userId,
            examTypeCode: 'MINI_TRYOUT',
            subjectCode: input.subjectCode,
            questionCount: input.questionCount,
            kind: 'mini_tryout',
        })
    }

    async startDrill(input: { userId: string; subjectCode: string; knowledgeNodeName: string; questionCount: number }) {
        return this.start({
            userId: input.userId,
            examTypeCode: 'DRILL',
            subjectCode: input.subjectCode,
            knowledgeNodeName: input.knowledgeNodeName,
            questionCount: input.questionCount,
            kind: 'drill',
        })
    }

    async startFullTryout(input: { userId: string }) {
        return this.start({
            userId: input.userId,
            examTypeCode: 'FULL_TRYOUT',
            kind: 'full_tryout',
        })
    }

    private async start(input: StartInput): Promise<StartAttemptResult> {
        const exam = await examRepository.findExam({
            programCode: 'CPNS',
            trackCode: 'SKD',
            examTypeCode: input.examTypeCode,
            subjectCode: input.subjectCode,
        })

        if (!exam) {
            throw new PracticeDomainError(
                'EXAM_NOT_CONFIGURED',
                `${input.examTypeCode} exam is not configured for ${input.subjectCode ?? 'SKD'}`,
            )
        }

        const metadata = metadataFor(input)
        const existing = await attemptRepository.findActiveAttempt(input.userId, exam.id, metadata)
        if (existing) {
            if (isExpired(exam, existing.started_at)) {
                throw new PracticeDomainError(
                    'EXPIRED_ATTEMPT',
                    'Active attempt has expired and must be scored before starting a new attempt',
                    { attemptId: existing.id },
                )
            }
            return { attemptId: existing.id, resumed: true }
        }

        if (exam.attemptLimit !== null) {
            const used = await attemptRepository.countAttempts(input.userId, exam.id)
            if (used >= exam.attemptLimit) {
                throw new PracticeDomainError('ATTEMPT_LIMIT_REACHED', 'Exam attempt limit reached')
            }
        }

        await this.assertAccess(input.userId, exam)

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

        const attempt = await attemptRepository.createAttempt({
            userId: input.userId,
            examId: exam.id,
            metadata,
        })

        try {
            await attemptRepository.addAttemptQuestions(attempt.id, questions)
        } catch (error) {
            await attemptRepository.deleteAttempt(attempt.id).catch(() => undefined)
            throw error
        }

        return { attemptId: attempt.id, resumed: false }
    }

    private async assertAccess(userId: string, exam: ResolvedExam) {
        if (exam.requiredFeatureId) {
            const admin = await createV2AdminClient()
            const { data, error } = await admin
                .from('entitlements')
                .select('id, starts_at, expires_at, usage_limit, usage_count')
                .eq('user_id', userId)
                .eq('feature_id', exam.requiredFeatureId)
                .in('status', ['ACTIVE', 'active'])
            if (error) throw error

            const activeEntitlement = ((data ?? []) as EntitlementRow[]).find(isEntitlementUsable)
            if (!activeEntitlement) {
                throw new PracticeDomainError('ENTITLEMENT_REQUIRED', 'Active entitlement is required for this exam')
            }
        }

        // Token debit will be migrated with WalletService/commerce. Blocking paid
        // exams here is deliberate: Preview must never silently create free
        // attempts for exams configured with a token cost.
        if (exam.tokenCost > 0) {
            throw new PracticeDomainError(
                'TOKEN_FLOW_PENDING',
                'Schema V2 token debit is not enabled yet. Set token_cost=0 only on staging test exams.',
                { tokenCost: exam.tokenCost },
            )
        }
    }
}

export const examAttemptService = new ExamAttemptService()
