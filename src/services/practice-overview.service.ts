import { LEVEL_THRESHOLDS, MINI_TRYOUT_TYPES, PASSING_GRADES, type MiniTryoutType } from '@/lib/constants'
import { getDrillingMaterialKey, type DashboardActiveSessionKind } from '@/lib/practice-session'
import { practiceOverviewRepository, type ActiveAttemptOverview, type CompletedAttemptOverview } from '@/src/repositories/practice-overview.repository'
import { examCompletionService } from '@/src/services/exam-completion.service'
import type { Json } from '@/types/database.types'

function metadataObject(metadata: Json): Record<string, Json | undefined> {
    return metadata && !Array.isArray(metadata) && typeof metadata === 'object' ? metadata : {}
}

function metadataString(metadata: Json, key: string) {
    const value = metadataObject(metadata)[key]
    return typeof value === 'string' ? value : null
}

function metadataNumber(metadata: Json, key: string) {
    const value = metadataObject(metadata)[key]
    return typeof value === 'number' ? value : null
}

function practiceKind(attempt: ActiveAttemptOverview | CompletedAttemptOverview) {
    return metadataString(attempt.metadata, 'practiceKind')
}

function isExpired(attempt: ActiveAttemptOverview) {
    const durationSeconds = metadataNumber(attempt.metadata, 'durationSeconds')
    if (!durationSeconds || !attempt.startedAt) return false
    return Date.now() >= Date.parse(attempt.startedAt) + durationSeconds * 1000
}

function subjectScore(attempt: CompletedAttemptOverview, code: string) {
    return attempt.subjectScores.find((score) => score.subjectCode.toUpperCase() === code)?.rawScore ?? 0
}

function formatCompletedAt(value: string) {
    return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jakarta',
    }).format(new Date(value))
}

function getLevel(xp: number) {
    let current: typeof LEVEL_THRESHOLDS[number] = LEVEL_THRESHOLDS[0]
    for (const threshold of LEVEL_THRESHOLDS) {
        if (xp >= threshold.xp) current = threshold
        else break
    }
    return current
}

function getLevelProgress(xp: number) {
    const current = getLevel(xp)
    const currentIndex = LEVEL_THRESHOLDS.findIndex((threshold) => threshold.level === current.level)
    const next = LEVEL_THRESHOLDS[currentIndex + 1]
    if (!next) return 100
    const span = next.xp - current.xp
    if (span <= 0) return 100
    return Math.min(100, Math.max(0, Math.round(((xp - current.xp) / span) * 100)))
}

function dashboardKind(attempt: ActiveAttemptOverview): { mode: 'practice' | 'tryout'; kind: DashboardActiveSessionKind } | null {
    const kind = practiceKind(attempt)
    if (kind === 'full_tryout') return { mode: 'tryout', kind: 'full-tryout' }
    if (kind === 'mini_tryout') return { mode: 'practice', kind: 'mini-tryout' }
    if (kind === 'drill') return { mode: 'practice', kind: 'drilling-materi' }
    if (metadataString(attempt.metadata, 'examTypeCode') === 'EVENT') return { mode: 'tryout', kind: 'event' }
    return null
}

export class PracticeOverviewService {
    private async activeAttempts(userId: string) {
        const attempts = await practiceOverviewRepository.listActiveAttempts(userId)
        const expired = attempts.filter(isExpired)
        if (expired.length > 0) {
            await Promise.all(expired.map((attempt) => examCompletionService.completeAttempt(userId, attempt.id).catch(() => undefined)))
        }
        return attempts.filter((attempt) => !isExpired(attempt))
    }

    async getFullTryoutPageData(userId: string) {
        const [quota, attempts] = await Promise.all([
            practiceOverviewRepository.getWalletBalance(userId),
            this.activeAttempts(userId),
        ])
        const active = attempts.find((attempt) => practiceKind(attempt) === 'full_tryout') ?? null
        return {
            quota,
            activeSessionId: active?.id ?? null,
            activeResumeQuestionNumber: active ? Math.max(1, (active.lastQuestionPosition ?? 0) + 1) : null,
            activeAnsweredQuestions: active?.answeredQuestions ?? null,
            activeStartedAt: active?.startedAt ?? null,
        }
    }

    async getMiniTryoutPageData(userId: string) {
        const [quota, attempts] = await Promise.all([
            practiceOverviewRepository.getWalletBalance(userId),
            this.activeAttempts(userId),
        ])
        const activeSessionsByType: Partial<Record<MiniTryoutType, {
            sessionId: string
            startedAt: string | null
            resumeQuestionNumber: number
            answeredQuestions: number
        }>> = {}

        for (const attempt of attempts) {
            if (practiceKind(attempt) !== 'mini_tryout') continue
            const subjectCode = metadataString(attempt.metadata, 'subjectCode')
            if (!subjectCode || !MINI_TRYOUT_TYPES.includes(subjectCode as MiniTryoutType)) continue
            const type = subjectCode as MiniTryoutType
            if (activeSessionsByType[type]) continue
            activeSessionsByType[type] = {
                sessionId: attempt.id,
                startedAt: attempt.startedAt,
                resumeQuestionNumber: Math.max(1, (attempt.lastQuestionPosition ?? 0) + 1),
                answeredQuestions: attempt.answeredQuestions,
            }
        }

        return { quota, activeSessionsByType }
    }

    async getDrillingPageData(userId: string) {
        const [quota, attempts, materials] = await Promise.all([
            practiceOverviewRepository.getWalletBalance(userId),
            this.activeAttempts(userId),
            practiceOverviewRepository.listDrillingMaterials(),
        ])

        const activeSessionsByKey: Record<string, {
            sessionId: string
            startedAt: string | null
            resumeQuestionNumber: number
            answeredQuestions: number
        } | undefined> = {}

        for (const attempt of attempts) {
            if (practiceKind(attempt) !== 'drill') continue
            const subjectCode = metadataString(attempt.metadata, 'subjectCode')
            const knowledgeNode = metadataString(attempt.metadata, 'knowledgeNode')
            if (!subjectCode || !knowledgeNode || !MINI_TRYOUT_TYPES.includes(subjectCode as MiniTryoutType)) continue
            const key = getDrillingMaterialKey(subjectCode as MiniTryoutType, knowledgeNode)
            if (activeSessionsByKey[key]) continue
            activeSessionsByKey[key] = {
                sessionId: attempt.id,
                startedAt: attempt.startedAt,
                resumeQuestionNumber: Math.max(1, (attempt.lastQuestionPosition ?? 0) + 1),
                answeredQuestions: attempt.answeredQuestions,
            }
        }

        return {
            quota,
            activeSessionsByKey,
            materials: materials
                .filter((material) => MINI_TRYOUT_TYPES.includes(material.subjectCode as MiniTryoutType))
                .map((material) => ({
                    key: getDrillingMaterialKey(material.subjectCode as MiniTryoutType, material.name),
                    type: material.subjectCode as MiniTryoutType,
                    subCategory: material.name,
                    questionCount: material.questionCount,
                })),
        }
    }

    async getHistoryPageData(userId: string) {
        const attempts = await practiceOverviewRepository.listCompletedAttempts(userId, 24)
        return attempts.map((attempt) => {
            const kind = practiceKind(attempt)
            const subjectCode = metadataString(attempt.metadata, 'subjectCode')
            const knowledgeNode = metadataString(attempt.metadata, 'knowledgeNode')
            const event = attempt.examTypeCode === 'EVENT'
            const historyKind = event
                ? 'event' as const
                : kind === 'drill'
                    ? 'drilling-materi' as const
                    : kind === 'mini_tryout'
                        ? 'mini-tryout' as const
                        : 'full-tryout' as const
            const title = event
                ? attempt.examTitle
                : kind === 'drill'
                    ? `Drilling Materi ${knowledgeNode ?? ''}`.trim()
                    : kind === 'mini_tryout'
                        ? `Mini Tryout ${subjectCode ?? ''}`.trim()
                        : attempt.examTitle || 'Tryout SKD Full'
            const completedAt = attempt.submittedAt ?? attempt.startedAt ?? new Date(0).toISOString()
            return {
                id: attempt.id,
                title,
                kind: historyKind,
                isEvent: event,
                subCategory: kind === 'drill' ? knowledgeNode : null,
                completedAt,
                completedAtLabel: formatCompletedAt(completedAt),
                totalScore: attempt.totalScore,
                scoreTwk: subjectScore(attempt, 'TWK'),
                scoreTiu: subjectScore(attempt, 'TIU'),
                scoreTkp: subjectScore(attempt, 'TKP'),
                passed: attempt.passed,
            }
        })
    }

    async getDashboardData(userId: string) {
        const [profile, streak, quota, rank, attempts, activeAttempts] = await Promise.all([
            practiceOverviewRepository.getProfile(userId),
            practiceOverviewRepository.getStreak(userId),
            practiceOverviewRepository.getWalletBalance(userId),
            practiceOverviewRepository.getCurrentRank(userId),
            practiceOverviewRepository.listCompletedAttempts(userId, 100),
            this.activeAttempts(userId),
        ])

        const recent = attempts.slice(0, 10)
        const averages = { TWK: 0, TIU: 0, TKP: 0 }
        for (const code of ['TWK', 'TIU', 'TKP'] as const) {
            const values = recent.map((attempt) => subjectScore(attempt, code)).filter((score) => score > 0)
            averages[code] = values.length ? Math.round(values.reduce((sum, score) => sum + score, 0) / values.length) : 0
        }

        const xp = attempts.reduce((sum, attempt) => sum + attempt.totalScore, 0)
        const level = getLevel(xp)
        const last = attempts[0] ?? null
        const best = attempts.reduce<CompletedAttemptOverview | null>((current, attempt) => {
            if (!current || attempt.totalScore > current.totalScore) return attempt
            return current
        }, null)
        const toExam = (attempt: CompletedAttemptOverview | null) => attempt ? {
            id: attempt.id,
            date: formatCompletedAt(attempt.submittedAt ?? attempt.startedAt ?? new Date(0).toISOString()),
            score_twk: subjectScore(attempt, 'TWK'),
            score_tiu: subjectScore(attempt, 'TIU'),
            score_tkp: subjectScore(attempt, 'TKP'),
            total_score: attempt.totalScore,
            passed: attempt.passed === true,
        } : null
        const activeSession = activeAttempts.map(dashboardKind).find((value) => value !== null) ?? null

        return {
            user: { id: userId, name: profile?.full_name || 'Calon ASN', streak, tryoutQuota: quota },
            stats: {
                totalSessions: attempts.length,
                xp,
                level: level.level,
                levelName: level.name,
                levelProgress: getLevelProgress(xp),
                rank,
            },
            progress: {
                twk: { score: averages.TWK, target: PASSING_GRADES.TWK, passed: averages.TWK >= PASSING_GRADES.TWK },
                tiu: { score: averages.TIU, target: PASSING_GRADES.TIU, passed: averages.TIU >= PASSING_GRADES.TIU },
                tkp: { score: averages.TKP, target: PASSING_GRADES.TKP, passed: averages.TKP >= PASSING_GRADES.TKP },
            },
            lastExam: toExam(last),
            bestExam: toExam(best),
            nextTryout: null,
            activeSession,
        }
    }
}

export const practiceOverviewService = new PracticeOverviewService()
