import { createAdminClient } from '@/lib/utils/supabase/server'
import { assessmentCatalogService } from '@/src/services/assessment-catalog.service'
import { attemptRepository } from '@/src/repositories/attempt.repository'
import { examRepository } from '@/src/repositories/exam.repository'
import { tkaFullExamRpcService } from '@/src/services/tka-full-exam-rpc.service'
import type { Json } from '@/types/database.types'

export type ParticipantAssignmentStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'UPCOMING' | 'CLOSED' | 'UNAVAILABLE'

export type ParticipantAssignment = {
    id: string
    participantId: string
    organizationId: string
    organizationName: string
    batchId: string
    batchName: string
    batchCode: string
    examId: string
    examTitle: string
    programCode: string
    trackCode: string
    examTypeCode: string
    startsAt: string | null
    dueAt: string | null
    status: ParticipantAssignmentStatus
    attemptId: string | null
    score: number | null
    percentage: number | null
}

type Row = Record<string, unknown>
const str = (value: unknown) => value == null ? '' : String(value)
const nullable = (value: unknown) => str(value) || null
const lower = (value: unknown) => str(value).toLowerCase()

function activeStatus(value: unknown) {
    return ['active', 'registered'].includes(lower(value))
}

export class OrganizationParticipantAssignmentService {
    async listForParticipant(userId: string): Promise<ParticipantAssignment[]> {
        const db = await createAdminClient()
        const { data: participants, error: participantError } = await db
            .from('organization_participants')
            .select('id, organization_id, batch_id, status')
            .eq('user_id', userId)
            .in('status', ['active', 'registered'])
        if (participantError) throw participantError
        if (!participants?.length) return []

        const participantByBatch = new Map<string, Row>()
        for (const participant of participants as Row[]) participantByBatch.set(str(participant.batch_id), participant)
        const batchIds = [...participantByBatch.keys()].filter(Boolean)
        const [{ data: batches, error: batchError }, { data: rawAssignments, error: assignmentError }] = await Promise.all([
            db.from('organization_batches').select('id, organization_id, code, name, status, starts_at, ends_at').in('id', batchIds),
            db.from('organization_exam_assignments').select('id, organization_id, batch_id, exam_id, is_active, starts_at, due_at').in('batch_id', batchIds).eq('is_active', true),
        ])
        if (batchError) throw batchError
        if (assignmentError) throw assignmentError
        if (!rawAssignments?.length) return []

        const batchById = new Map((batches ?? []).map((row) => [str(row.id), row as Row]))
        const organizationIds = [...new Set((participants as Row[]).map((row) => str(row.organization_id)).filter(Boolean))]
        const { data: organizations, error: organizationError } = await db
            .from('organizations').select('id, name, status').in('id', organizationIds)
        if (organizationError) throw organizationError
        const organizationById = new Map((organizations ?? []).map((row) => [str(row.id), row as Row]))
        const assignmentRows = (rawAssignments as Row[]).filter((row) => {
            const participant = participantByBatch.get(str(row.batch_id))
            const batch = batchById.get(str(row.batch_id))
            const organization = organizationById.get(str(row.organization_id))
            return Boolean(participant && batch && organization
                && str(participant.organization_id) === str(row.organization_id)
                && str(batch.organization_id) === str(row.organization_id)
                && activeStatus(participant.status)
                && lower(batch.status) === 'active'
                && lower(organization.status) === 'active')
        })
        if (!assignmentRows.length) return []

        const examIds = [...new Set(assignmentRows.map((row) => str(row.exam_id)).filter(Boolean))]
        const [{ data: exams, error: examError }, catalog] = await Promise.all([
            db.from('exams').select('id, title, status').in('id', examIds),
            assessmentCatalogService.listDistributable(),
        ])
        if (examError) throw examError
        const examById = new Map((exams ?? []).map((row) => [str(row.id), row as Row]))
        const catalogById = new Map(catalog.map((entry) => [entry.id, entry]))
        const { data: attempts, error: attemptError } = await db
            .from('exam_attempts')
            .select('id, assignment_id, participant_id, status, total_score, percentage, updated_at')
            .eq('source', 'organization')
            .eq('user_id', userId)
            .in('assignment_id', assignmentRows.map((row) => str(row.id)))
            .order('updated_at', { ascending: false })
        if (attemptError) throw attemptError

        const attemptByAssignment = new Map<string, Row>()
        for (const attempt of (attempts ?? []) as Row[]) {
            const key = str(attempt.assignment_id)
            if (!attemptByAssignment.has(key)) attemptByAssignment.set(key, attempt)
        }

        const now = Date.now()
        return assignmentRows.flatMap((assignment) => {
            const id = str(assignment.id)
            const participant = participantByBatch.get(str(assignment.batch_id))
            const batch = batchById.get(str(assignment.batch_id))
            const organization = organizationById.get(str(assignment.organization_id))
            const exam = examById.get(str(assignment.exam_id))
            const assessment = catalogById.get(str(assignment.exam_id))
            if (!participant || !batch || !organization || !exam) return []

            const startsAt = nullable(assignment.starts_at) ?? nullable(batch.starts_at)
            const dueAt = nullable(assignment.due_at) ?? nullable(batch.ends_at)
            const attempt = attemptByAssignment.get(id)
            const attemptStatus = lower(attempt?.status)
            const starts = startsAt ? Date.parse(startsAt) : null
            const due = dueAt ? Date.parse(dueAt) : null
            const status: ParticipantAssignmentStatus = !assessment
                ? 'UNAVAILABLE'
                : ['completed', 'submitted'].includes(attemptStatus)
                    ? 'COMPLETED'
                    : ['in_progress', 'created'].includes(attemptStatus)
                        ? 'IN_PROGRESS'
                        : starts !== null && Number.isFinite(starts) && starts > now
                            ? 'UPCOMING'
                            : due !== null && Number.isFinite(due) && due < now
                                ? 'CLOSED'
                                : 'NOT_STARTED'

            return [{
                id,
                participantId: str(participant.id),
                organizationId: str(assignment.organization_id),
                organizationName: str(organization.name),
                batchId: str(batch.id),
                batchName: str(batch.name),
                batchCode: str(batch.code),
                examId: str(assignment.exam_id),
                examTitle: str(exam.title),
                programCode: assessment?.programCode ?? '',
                trackCode: assessment?.trackCode ?? '',
                examTypeCode: assessment?.examTypeCode ?? '',
                startsAt,
                dueAt,
                status,
                attemptId: nullable(attempt?.id),
                score: attempt?.total_score == null ? null : Number(attempt.total_score),
                percentage: attempt?.percentage == null ? null : Number(attempt.percentage),
            }]
        })
    }

    async start(userId: string, assignmentId: string) {
        const assignment = (await this.listForParticipant(userId)).find((item) => item.id === assignmentId)
        if (!assignment) throw new Error('ASSIGNMENT_NOT_FOUND')
        if (!['NOT_STARTED', 'IN_PROGRESS'].includes(assignment.status)) throw new Error(`ASSIGNMENT_${assignment.status}`)
        if (assignment.status === 'IN_PROGRESS' && assignment.attemptId) {
            return { attemptId: assignment.attemptId, resumed: true, assignment }
        }

        const assessment = await assessmentCatalogService.getById(assignment.examId)
        if (!assessment) throw new Error('ASSESSMENT_UNAVAILABLE')
        if (assessment.programCode === 'TKA' && assessment.trackCode === 'SMP'
            && ['FULL_TRYOUT', 'MINI_TRYOUT'].includes(assessment.examTypeCode)) {
            const started = await tkaFullExamRpcService.startSmpExam({
                userId,
                examSlug: assessment.slug,
                context: { type: 'ORGANIZATION', assignmentId: assignment.id },
            })
            return { attemptId: started.attemptId, resumed: started.resumed, assignment }
        }

        const db = await createAdminClient()
        const { data: existing, error: existingError } = await db
            .from('exam_attempts')
            .select('id')
            .eq('source', 'organization')
            .eq('user_id', userId)
            .eq('assignment_id', assignment.id)
            .in('status', ['created', 'in_progress', 'CREATED', 'IN_PROGRESS'])
            .maybeSingle()
        if (existingError) throw existingError
        if (existing?.id) {
            await attemptRepository.waitForAttemptQuestions(String(existing.id))
            return { attemptId: String(existing.id), resumed: true, assignment }
        }

        const questions = await examRepository.buildQuestionSet({ exam: assessment })
        const practiceKind = assessment.examTypeCode === 'DRILL'
            ? 'drill'
            : assessment.examTypeCode === 'MINI_TRYOUT' ? 'mini_tryout' : 'full_tryout'
        const metadata: Record<string, Json> = {
            schemaVersion: 2,
            accessContext: 'organization',
            organizationId: assignment.organizationId,
            batchId: assignment.batchId,
            assignmentId: assignment.id,
            participantId: assignment.participantId,
            programCode: assessment.programCode,
            trackCode: assessment.trackCode,
            examTypeCode: assessment.examTypeCode,
            examSlug: assessment.slug,
            practiceKind,
            durationSeconds: assessment.durationSeconds ?? 0,
        }
        try {
            const attempt = await attemptRepository.createAttemptWithQuestions({
                userId,
                examId: assessment.id,
                metadata,
                questions,
                organizationContext: {
                    organizationId: assignment.organizationId,
                    batchId: assignment.batchId,
                    assignmentId: assignment.id,
                    participantId: assignment.participantId,
                },
            })
            return { attemptId: attempt.id, resumed: false, assignment }
        } catch (error) {
            if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
                const { data: raced, error: raceError } = await db
                    .from('exam_attempts').select('id').eq('source', 'organization').eq('user_id', userId)
                    .eq('assignment_id', assignment.id).in('status', ['created', 'in_progress', 'CREATED', 'IN_PROGRESS']).maybeSingle()
                if (raceError) throw raceError
                if (raced?.id) {
                    await attemptRepository.waitForAttemptQuestions(String(raced.id))
                    return { attemptId: String(raced.id), resumed: true, assignment }
                }
            }
            throw error
        }
    }
}

export const organizationParticipantAssignmentService = new OrganizationParticipantAssignmentService()
