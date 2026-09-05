import { createClient } from '@/lib/utils/supabase/server'
import { tkaLearningFocusService, type TkaLearningFocusAction, type TkaLearningFocusView } from '@/src/services/tka-learning-focus.service'
import { tkaReadinessService, type TkaReadinessView } from '@/src/services/tka-readiness.service'
import { tkaWrongQuestionService } from '@/src/services/tka-wrong-question.service'

export type TkaProgressDashboardSubject = {
    subjectId: string
    subjectCode: string
    subjectName: string
    attempts: number
    questionsAnswered: number
    accuracyPercent: number
    masteryPercent: number
    readinessPercent: number
    confidencePercent: number
    assessableNodes: number
    evidencedNodes: number
    coveragePercent: number
    openWrongQuestions: number
}

export type TkaProgressDashboardAttempt = {
    attemptId: string
    examTitle: string
    examSlug: string
    percentage: number | null
    totalScore: number | null
    submittedAt: string | null
    updatedAt: string
    href: string
}

export type TkaProgressDashboardView = {
    readiness: TkaReadinessView | null
    focus: TkaLearningFocusView
    subjects: TkaProgressDashboardSubject[]
    completedAttempts: number
    openWrongQuestions: number
    openWrongQuestionsIsLowerBound: boolean
    activeRemedialSessions: number
    pendingRemedialItems: number
    evidencedNodes: number
    assessableNodes: number
    coveragePercent: number
    recentAttempts: TkaProgressDashboardAttempt[]
    nextAction: TkaLearningFocusAction
}

function numberValue(value: unknown, fallback = 0) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
}

function nullableNumber(value: unknown) {
    if (value === null || value === undefined || value === '') return null
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
}

function percent(numerator: number, denominator: number) {
    if (denominator <= 0) return 0
    return Math.max(0, Math.min(100, (numerator / denominator) * 100))
}

export class TkaProgressDashboardService {
    async getDashboard(): Promise<TkaProgressDashboardView> {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) throw authError ?? new Error('Authentication required')

        const { data: program, error: programError } = await supabase
            .from('programs')
            .select('id')
            .eq('code', 'TKA')
            .maybeSingle()
        if (programError) throw programError
        if (!program) throw new Error('TKA program not found')

        const { data: track, error: trackError } = await supabase
            .from('tracks')
            .select('id')
            .eq('program_id', program.id)
            .eq('code', 'SMP')
            .maybeSingle()
        if (trackError) throw trackError
        if (!track) throw new Error('TKA SMP track not found')

        const [readiness, focus, wrongQuestions, subjectsResult, examsResult, remedialResult] = await Promise.all([
            tkaReadinessService.getReadiness(),
            tkaLearningFocusService.getFocus(),
            tkaWrongQuestionService.listOpen(200),
            supabase
                .from('subjects')
                .select('id, code, name, sort_order')
                .eq('track_id', track.id)
                .in('code', ['BIN', 'MAT'])
                .order('sort_order', { ascending: true }),
            supabase
                .from('exams')
                .select('id, title, slug')
                .eq('track_id', track.id),
            supabase
                .from('remedial_sessions')
                .select('id, source_attempt_id, status, created_at')
                .eq('user_id', user.id)
                .eq('track_id', track.id)
                .in('status', ['active', 'ACTIVE'])
                .order('created_at', { ascending: false }),
        ])

        if (subjectsResult.error) throw subjectsResult.error
        if (examsResult.error) throw examsResult.error
        if (remedialResult.error) throw remedialResult.error

        const subjectRows = subjectsResult.data ?? []
        const subjectIds = subjectRows.map((row) => String(row.id))
        const progressBySubjectId = new Map<string, {
            attempts: number
            questionsAnswered: number
            accuracyPercent: number
            masteryPercent: number
        }>()

        if (subjectIds.length > 0) {
            const { data: progressRows, error: progressError } = await supabase
                .from('user_subject_progress')
                .select('subject_id, attempts, questions_answered, accuracy, mastery_score')
                .eq('user_id', user.id)
                .in('subject_id', subjectIds)
            if (progressError) throw progressError

            for (const row of progressRows ?? []) {
                progressBySubjectId.set(String(row.subject_id), {
                    attempts: numberValue(row.attempts),
                    questionsAnswered: numberValue(row.questions_answered),
                    accuracyPercent: numberValue(row.accuracy),
                    masteryPercent: numberValue(row.mastery_score),
                })
            }
        }

        const activeRemedialRows = remedialResult.data ?? []
        const remedialSessionIds = activeRemedialRows.map((row) => String(row.id))
        const pendingBySessionId = new Map<string, number>()
        let pendingRemedialItems = 0

        if (remedialSessionIds.length > 0) {
            const { data: remedialItems, error: remedialItemsError } = await supabase
                .from('remedial_session_items')
                .select('session_id, status')
                .in('session_id', remedialSessionIds)
            if (remedialItemsError) throw remedialItemsError

            for (const item of remedialItems ?? []) {
                if (String(item.status).toLowerCase() !== 'pending') continue
                const sessionId = String(item.session_id)
                pendingRemedialItems += 1
                pendingBySessionId.set(sessionId, (pendingBySessionId.get(sessionId) ?? 0) + 1)
            }
        }

        const examRows = examsResult.data ?? []
        const examById = new Map(examRows.map((row) => [String(row.id), row]))
        const examIds = examRows.map((row) => String(row.id))
        let completedAttempts = 0
        let recentAttempts: TkaProgressDashboardAttempt[] = []

        if (examIds.length > 0) {
            const { data: attemptRows, error: attemptError, count } = await supabase
                .from('exam_attempts')
                .select('id, exam_id, percentage, total_score, submitted_at, updated_at', { count: 'exact' })
                .eq('user_id', user.id)
                .in('exam_id', examIds)
                .in('status', ['completed', 'submitted', 'COMPLETED', 'SUBMITTED'])
                .order('updated_at', { ascending: false })
                .limit(5)
            if (attemptError) throw attemptError

            completedAttempts = count ?? attemptRows?.length ?? 0
            recentAttempts = (attemptRows ?? []).flatMap((row) => {
                const exam = examById.get(String(row.exam_id))
                if (!exam) return []
                return [{
                    attemptId: String(row.id),
                    examTitle: String(exam.title),
                    examSlug: String(exam.slug),
                    percentage: nullableNumber(row.percentage),
                    totalScore: nullableNumber(row.total_score),
                    submittedAt: row.submitted_at ? String(row.submitted_at) : null,
                    updatedAt: String(row.updated_at),
                    href: `/tka/smp/tryout/${String(row.id)}/result`,
                }]
            })
        }

        const readinessBySubjectId = new Map((readiness?.subjects ?? []).map((subject) => [subject.subjectId, subject]))
        const wrongBySubjectCode = new Map<string, number>()
        for (const item of wrongQuestions) {
            wrongBySubjectCode.set(item.subjectCode, (wrongBySubjectCode.get(item.subjectCode) ?? 0) + 1)
        }

        const subjects = subjectRows.map((subject): TkaProgressDashboardSubject => {
            const subjectId = String(subject.id)
            const progress = progressBySubjectId.get(subjectId)
            const readinessSubject = readinessBySubjectId.get(subjectId)
            const assessableNodes = readinessSubject?.assessableNodes ?? 0
            const evidencedNodes = readinessSubject?.evidencedNodes ?? 0
            return {
                subjectId,
                subjectCode: String(subject.code),
                subjectName: String(subject.name),
                attempts: progress?.attempts ?? 0,
                questionsAnswered: progress?.questionsAnswered ?? 0,
                accuracyPercent: progress?.accuracyPercent ?? 0,
                masteryPercent: progress?.masteryPercent ?? 0,
                readinessPercent: (readinessSubject?.readinessScore ?? 0) * 100,
                confidencePercent: (readinessSubject?.confidenceScore ?? 0) * 100,
                assessableNodes,
                evidencedNodes,
                coveragePercent: percent(evidencedNodes, assessableNodes),
                openWrongQuestions: wrongBySubjectCode.get(String(subject.code)) ?? 0,
            }
        })

        const evidencedNodes = subjects.reduce((sum, subject) => sum + subject.evidencedNodes, 0)
        const assessableNodes = subjects.reduce((sum, subject) => sum + subject.assessableNodes, 0)
        const openWrongQuestions = wrongQuestions.length
        const activeRemedial = activeRemedialRows.find((row) => (pendingBySessionId.get(String(row.id)) ?? 0) > 0)

        let nextAction: TkaLearningFocusAction = focus.items[0]?.nextAction ?? {
            type: 'practice_tka',
            label: 'Buka Latihan Fokus',
            href: '/tka/smp/focus',
        }
        if (focus.items.length === 0 && activeRemedial) {
            nextAction = {
                type: 'continue_remedial',
                label: 'Lanjutkan remedial',
                href: `/tka/smp/remedial/${String(activeRemedial.id)}`,
            }
        } else if (focus.items.length === 0 && openWrongQuestions > 0) {
            nextAction = {
                type: 'repeat_wrong',
                label: 'Ulang soal salah',
                href: '/tka/smp/wrong-questions',
            }
        }

        return {
            readiness,
            focus,
            subjects,
            completedAttempts,
            openWrongQuestions,
            openWrongQuestionsIsLowerBound: openWrongQuestions >= 200,
            activeRemedialSessions: activeRemedialRows.length,
            pendingRemedialItems,
            evidencedNodes,
            assessableNodes,
            coveragePercent: percent(evidencedNodes, assessableNodes),
            recentAttempts,
            nextAction,
        }
    }
}

export const tkaProgressDashboardService = new TkaProgressDashboardService()
