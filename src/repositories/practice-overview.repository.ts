import { createV2AdminClient } from '@/lib/utils/supabase/server'
import { getAttemptXp } from '@/lib/gamification'
import { chunkValues } from '@/lib/supabase-batch'
import type { Json } from '@/types/database.types'

export type ActiveAttemptOverview = {
    id: string
    examId: string
    startedAt: string | null
    lastSavedAt: string | null
    lastQuestionPosition: number | null
    metadata: Json
    questionCount: number
    answeredQuestions: number
}

export type CompletedAttemptOverview = {
    id: string
    examId: string
    examTitle: string
    examTypeCode: string | null
    startedAt: string | null
    submittedAt: string | null
    totalScore: number
    passed: boolean | null
    metadata: Json
    subjectScores: Array<{
        subjectCode: string
        rawScore: number
        percentage: number | null
        passed: boolean | null
    }>
}

export type DrillingMaterialOverview = {
    subjectCode: string
    nodeId: string
    name: string
    questionCount: number
}

type GenericRow = Record<string, unknown>

function numberOrZero(value: unknown) {
    return typeof value === 'number' ? value : Number(value ?? 0) || 0
}

export class PracticeOverviewRepository {
    async getCompletedAttemptTotals(userId: string) {
        const admin = await createV2AdminClient()
        const pageSize = 1000
        let from = 0
        let totalSessions = 0
        let totalXp = 0

        while (true) {
            const { data, error } = await admin
                .from('exam_attempts')
                .select('total_score, metadata')
                .eq('user_id', userId)
                .in('status', ['completed', 'COMPLETED'])
                .order('id', { ascending: true })
                .range(from, from + pageSize - 1)
            if (error) throw error

            const rows = (data ?? []) as Array<{ total_score: number | null; metadata: Json }>
            for (const row of rows) {
                const metadata = row.metadata && !Array.isArray(row.metadata) && typeof row.metadata === 'object'
                    ? row.metadata
                    : null
                const practiceKind = typeof metadata?.practiceKind === 'string' ? metadata.practiceKind : null
                totalXp += getAttemptXp(numberOrZero(row.total_score), practiceKind)
            }
            totalSessions += rows.length
            if (rows.length < pageSize) break
            from += pageSize
        }

        return { totalSessions, totalXp }
    }

    async getWalletBalance(userId: string) {
        const admin = await createV2AdminClient()
        const { data, error } = await admin
            .from('wallets')
            .select('balance')
            .eq('user_id', userId)
            .eq('wallet_type', 'exam_token')
            .maybeSingle()
        if (error) throw error
        return numberOrZero((data as GenericRow | null)?.balance)
    }

    async getProfile(userId: string) {
        const admin = await createV2AdminClient()
        const { data, error } = await admin
            .from('profiles')
            .select('id, full_name')
            .eq('id', userId)
            .maybeSingle()
        if (error) throw error
        return data as { id: string; full_name: string } | null
    }

    async getStreak(userId: string) {
        const admin = await createV2AdminClient()
        const { data, error } = await admin
            .from('user_streaks')
            .select('current_streak')
            .eq('user_id', userId)
            .maybeSingle()
        if (error) throw error
        return numberOrZero((data as GenericRow | null)?.current_streak)
    }

    async getCurrentRank(userId: string) {
        const admin = await createV2AdminClient()
        const now = new Date().toISOString()
        const { data: board, error: boardError } = await admin
            .from('leaderboards')
            .select('id')
            .in('status', ['active', 'ACTIVE'])
            .lte('starts_at', now)
            .gte('ends_at', now)
            .order('ends_at', { ascending: true })
            .limit(1)
            .maybeSingle()
        if (boardError) throw boardError
        const leaderboardId = (board as GenericRow | null)?.id
        if (typeof leaderboardId !== 'string') return null

        const { data: entry, error: entryError } = await admin
            .from('leaderboard_entries')
            .select('rank')
            .eq('leaderboard_id', leaderboardId)
            .eq('user_id', userId)
            .maybeSingle()
        if (entryError) throw entryError
        const rank = (entry as GenericRow | null)?.rank
        return typeof rank === 'number' ? rank : null
    }

    async listActiveAttempts(userId: string): Promise<ActiveAttemptOverview[]> {
        const admin = await createV2AdminClient()
        const { data: attempts, error: attemptError } = await admin
            .from('exam_attempts')
            .select('id, exam_id, started_at, last_saved_at, last_question_position, metadata')
            .eq('user_id', userId)
            .in('status', ['in_progress', 'IN_PROGRESS', 'created', 'CREATED'])
            .order('last_saved_at', { ascending: false, nullsFirst: false })
            .limit(30)
        if (attemptError) throw attemptError

        const attemptRows = (attempts ?? []) as Array<{
            id: string
            exam_id: string
            started_at: string | null
            last_saved_at: string | null
            last_question_position: number | null
            metadata: Json
        }>
        if (attemptRows.length === 0) return []

        const attemptIds = attemptRows.map((row) => row.id)
        const { data: questionRows, error: questionError } = await admin
            .from('attempt_questions')
            .select('id, attempt_id')
            .in('attempt_id', attemptIds)
            .limit(5000)
        if (questionError) throw questionError

        const questions = (questionRows ?? []) as Array<{ id: string; attempt_id: string }>
        const questionIds = questions.map((row) => row.id)
        let answers: Array<{ attempt_question_id: string; selected_option_id: string | null }> = []
        if (questionIds.length > 0) {
            const answerRows: Array<{ attempt_question_id: string; selected_option_id: string | null }> = []
            for (const batch of chunkValues(questionIds)) {
                const { data, error } = await admin
                    .from('attempt_answers')
                    .select('attempt_question_id, selected_option_id')
                    .in('attempt_question_id', batch)
                    .limit(5000)
                if (error) throw error
                answerRows.push(...((data ?? []) as Array<{ attempt_question_id: string; selected_option_id: string | null }>))
            }
            answers = answerRows
        }

        const attemptIdByQuestionId = new Map(questions.map((row) => [row.id, row.attempt_id]))
        const questionCountByAttempt = new Map<string, number>()
        for (const row of questions) {
            questionCountByAttempt.set(row.attempt_id, (questionCountByAttempt.get(row.attempt_id) ?? 0) + 1)
        }

        const answeredByAttempt = new Map<string, number>()
        for (const answer of answers) {
            if (!answer.selected_option_id) continue
            const attemptId = attemptIdByQuestionId.get(answer.attempt_question_id)
            if (!attemptId) continue
            answeredByAttempt.set(attemptId, (answeredByAttempt.get(attemptId) ?? 0) + 1)
        }

        return attemptRows.map((attempt) => ({
            id: attempt.id,
            examId: attempt.exam_id,
            startedAt: attempt.started_at,
            lastSavedAt: attempt.last_saved_at,
            lastQuestionPosition: attempt.last_question_position,
            metadata: attempt.metadata,
            questionCount: questionCountByAttempt.get(attempt.id) ?? 0,
            answeredQuestions: answeredByAttempt.get(attempt.id) ?? 0,
        }))
    }

    async listCompletedAttempts(userId: string, limit = 24): Promise<CompletedAttemptOverview[]> {
        const admin = await createV2AdminClient()
        const { data: attempts, error: attemptError } = await admin
            .from('exam_attempts')
            .select('id, exam_id, started_at, submitted_at, total_score, passed, metadata')
            .eq('user_id', userId)
            .in('status', ['completed', 'COMPLETED'])
            .order('submitted_at', { ascending: false, nullsFirst: false })
            .limit(limit)
        if (attemptError) throw attemptError

        const attemptRows = (attempts ?? []) as Array<{
            id: string
            exam_id: string
            started_at: string | null
            submitted_at: string | null
            total_score: number | null
            passed: boolean | null
            metadata: Json
        }>
        if (attemptRows.length === 0) return []

        const attemptIds = attemptRows.map((row) => row.id)
        const examIds = Array.from(new Set(attemptRows.map((row) => row.exam_id)))

        const [{ data: scoreRows, error: scoreError }, { data: examRows, error: examError }] = await Promise.all([
            admin
                .from('attempt_scores')
                .select('attempt_id, subject_id, raw_score, percentage, passed')
                .in('attempt_id', attemptIds)
                .limit(5000),
            admin
                .from('exams')
                .select('id, title, exam_type_id')
                .in('id', examIds),
        ])
        if (scoreError) throw scoreError
        if (examError) throw examError

        const scores = (scoreRows ?? []) as Array<{
            attempt_id: string
            subject_id: string | null
            raw_score: number
            percentage: number | null
            passed: boolean | null
        }>
        const exams = (examRows ?? []) as Array<{ id: string; title: string; exam_type_id: string }>
        const subjectIds = Array.from(new Set(scores.map((row) => row.subject_id).filter((id): id is string => Boolean(id))))
        const examTypeIds = Array.from(new Set(exams.map((row) => row.exam_type_id)))

        const [{ data: subjectRows, error: subjectError }, { data: typeRows, error: typeError }] = await Promise.all([
            subjectIds.length
                ? admin.from('subjects').select('id, code').in('id', subjectIds)
                : Promise.resolve({ data: [], error: null }),
            examTypeIds.length
                ? admin.from('exam_types').select('id, code').in('id', examTypeIds)
                : Promise.resolve({ data: [], error: null }),
        ])
        if (subjectError) throw subjectError
        if (typeError) throw typeError

        const subjectCodeById = new Map(((subjectRows ?? []) as Array<{ id: string; code: string }>).map((row) => [row.id, row.code]))
        const typeCodeById = new Map(((typeRows ?? []) as Array<{ id: string; code: string }>).map((row) => [row.id, row.code]))
        const examById = new Map(exams.map((row) => [row.id, row]))
        const scoresByAttempt = new Map<string, CompletedAttemptOverview['subjectScores']>()

        for (const score of scores) {
            if (!score.subject_id) continue
            const subjectCode = subjectCodeById.get(score.subject_id)
            if (!subjectCode) continue
            const current = scoresByAttempt.get(score.attempt_id) ?? []
            current.push({
                subjectCode,
                rawScore: numberOrZero(score.raw_score),
                percentage: score.percentage === null ? null : numberOrZero(score.percentage),
                passed: score.passed,
            })
            scoresByAttempt.set(score.attempt_id, current)
        }

        return attemptRows.map((attempt) => {
            const exam = examById.get(attempt.exam_id)
            return {
                id: attempt.id,
                examId: attempt.exam_id,
                examTitle: exam?.title ?? 'Tryout',
                examTypeCode: exam ? typeCodeById.get(exam.exam_type_id) ?? null : null,
                startedAt: attempt.started_at,
                submittedAt: attempt.submitted_at,
                totalScore: numberOrZero(attempt.total_score),
                passed: attempt.passed,
                metadata: attempt.metadata,
                subjectScores: scoresByAttempt.get(attempt.id) ?? [],
            }
        })
    }

    async listDrillingMaterials(): Promise<DrillingMaterialOverview[]> {
        const admin = await createV2AdminClient()
        const { data: program, error: programError } = await admin
            .from('programs')
            .select('id')
            .eq('code', 'CPNS')
            .maybeSingle()
        if (programError) throw programError
        if (!program) return []

        const { data: track, error: trackError } = await admin
            .from('tracks')
            .select('id')
            .eq('program_id', program.id)
            .eq('code', 'SKD')
            .maybeSingle()
        if (trackError) throw trackError
        if (!track) return []

        const { data: subjectRows, error: subjectError } = await admin
            .from('subjects')
            .select('id, code')
            .eq('track_id', track.id)
            .in('code', ['TWK', 'TIU', 'TKP'])
        if (subjectError) throw subjectError
        const subjects = (subjectRows ?? []) as Array<{ id: string; code: string }>
        if (subjects.length === 0) return []

        const subjectCodeById = new Map(subjects.map((row) => [row.id, row.code]))
        const subjectIds = subjects.map((row) => row.id)
        const { data: nodeRows, error: nodeError } = await admin
            .from('knowledge_nodes')
            .select('id, subject_id, name, sort_order')
            .in('subject_id', subjectIds)
            .in('status', ['active', 'ACTIVE'])
            .order('sort_order', { ascending: true })
            .limit(2000)
        if (nodeError) throw nodeError

        const nodes = (nodeRows ?? []) as Array<{ id: string; subject_id: string; name: string; sort_order: number }>
        if (nodes.length === 0) return []
        const nodeIds = nodes.map((row) => row.id)

        const pathRows: Array<{ ancestor_id: string; descendant_id: string }> = []
        for (const batch of chunkValues(nodeIds)) {
            const { data, error } = await admin
                .from('knowledge_node_paths')
                .select('ancestor_id, descendant_id')
                .in('ancestor_id', batch)
                .limit(5000)
            if (error) throw error
            pathRows.push(...((data ?? []) as Array<{ ancestor_id: string; descendant_id: string }>))
        }
        const descendantsByNode = new Map<string, Set<string>>()
        for (const node of nodes) descendantsByNode.set(node.id, new Set([node.id]))
        for (const path of pathRows) {
            descendantsByNode.get(path.ancestor_id)?.add(path.descendant_id)
        }

        const allDescendantIds = Array.from(new Set(Array.from(descendantsByNode.values()).flatMap((set) => Array.from(set))))
        const links: Array<{ question_id: string; knowledge_node_id: string }> = []
        for (const batch of chunkValues(allDescendantIds)) {
            const { data, error } = await admin
                .from('question_knowledge_nodes')
                .select('question_id, knowledge_node_id')
                .in('knowledge_node_id', batch)
                .limit(10000)
            if (error) throw error
            links.push(...((data ?? []) as Array<{ question_id: string; knowledge_node_id: string }>))
        }
        const questionIds = Array.from(new Set(links.map((row) => row.question_id)))
        if (questionIds.length === 0) return []

        const questionRows: Array<{ id: string; subject_id: string }> = []
        for (const batch of chunkValues(questionIds)) {
            const { data, error } = await admin
                .from('questions')
                .select('id, subject_id')
                .in('id', batch)
                .in('status', ['published', 'PUBLISHED', 'active', 'ACTIVE'])
                .limit(10000)
            if (error) throw error
            questionRows.push(...((data ?? []) as Array<{ id: string; subject_id: string }>))
        }
        const publishedQuestions = new Map(questionRows.map((row) => [row.id, row.subject_id]))

        const linksByNode = new Map<string, Set<string>>()
        for (const link of links) {
            if (!publishedQuestions.has(link.question_id)) continue
            const current = linksByNode.get(link.knowledge_node_id) ?? new Set<string>()
            current.add(link.question_id)
            linksByNode.set(link.knowledge_node_id, current)
        }

        return nodes.flatMap((node) => {
            const subjectCode = subjectCodeById.get(node.subject_id)
            if (!subjectCode) return []
            const questionSet = new Set<string>()
            for (const descendantId of descendantsByNode.get(node.id) ?? [node.id]) {
                for (const questionId of linksByNode.get(descendantId) ?? []) {
                    if (publishedQuestions.get(questionId) === node.subject_id) questionSet.add(questionId)
                }
            }
            if (questionSet.size === 0) return []
            return [{ subjectCode, nodeId: node.id, name: node.name, questionCount: questionSet.size }]
        })
    }
}

export const practiceOverviewRepository = new PracticeOverviewRepository()
