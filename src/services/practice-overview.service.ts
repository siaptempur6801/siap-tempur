import { MINI_TRYOUT_TYPES, SUBJECTS, type MiniTryoutType } from '@/lib/constants'
import { getGamificationProgress } from '@/lib/gamification'
import { getDrillingMaterialKey, type DashboardActiveSessionKind } from '@/lib/practice-session'
import {
  practiceOverviewRepository,
  type ActiveAttemptOverview,
  type CompletedAttemptOverview,
} from '@/src/repositories/practice-overview.repository'
import {
  subjectProgressReadRepository,
  type SubjectProgressOverview,
} from '@/src/repositories/subject-progress-read.repository'
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
  return (
    attempt.subjectScores.find((score) => score.subjectCode.toUpperCase() === code)?.rawScore ?? 0
  )
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

function dashboardKind(
  attempt: ActiveAttemptOverview,
): { mode: 'practice' | 'tryout'; kind: DashboardActiveSessionKind } | null {
  const kind = practiceKind(attempt)
  if (kind === 'full_tryout') return { mode: 'tryout', kind: 'full-tryout' }
  if (kind === 'mini_tryout') return { mode: 'practice', kind: 'mini-tryout' }
  if (kind === 'drill') return { mode: 'practice', kind: 'drilling-materi' }
  if (metadataString(attempt.metadata, 'examTypeCode') === 'EVENT')
    return { mode: 'tryout', kind: 'event' }
  return null
}

type CpnsSubjectCode = SubjectProgressOverview['subjectCode']

function canonicalDashboardProgress(rows: SubjectProgressOverview[], code: CpnsSubjectCode) {
  const row = rows.find((item) => item.subjectCode === code)
  const subject = SUBJECTS[code]
  const masteryScore = Math.min(100, Math.max(0, row?.masteryScore ?? 0))
  const score = Math.round((masteryScore / 100) * subject.fullMark)

  return {
    score,
    target: subject.passing,
    passed: score >= subject.passing,
    masteryScore: Number(masteryScore.toFixed(2)),
    accuracy: Number((row?.accuracy ?? 0).toFixed(2)),
    attempts: row?.attempts ?? 0,
    questionsAnswered: row?.questionsAnswered ?? 0,
    updatedAt: row?.updatedAt ?? null,
  }
}

class PracticeOverviewService {
  private async activeAttempts(userId: string) {
    const attempts = await practiceOverviewRepository.listActiveAttempts(userId)
    const expired = attempts.filter(isExpired)
    if (expired.length > 0) {
      await Promise.all(
        expired.map((attempt) =>
          examCompletionService.completeAttempt(userId, attempt.id).catch(() => undefined),
        ),
      )
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
      activeResumeQuestionNumber: active
        ? Math.max(1, (active.lastQuestionPosition ?? 0) + 1)
        : null,
      activeAnsweredQuestions: active?.answeredQuestions ?? null,
      activeStartedAt: active?.startedAt ?? null,
    }
  }

  async getMiniTryoutPageData(userId: string) {
    const [quota, attempts] = await Promise.all([
      practiceOverviewRepository.getWalletBalance(userId),
      this.activeAttempts(userId),
    ])
    const activeSessionsByType: Partial<
      Record<
        MiniTryoutType,
        {
          sessionId: string
          startedAt: string | null
          resumeQuestionNumber: number
          answeredQuestions: number
        }
      >
    > = {}

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

    const activeSessionsByKey: Record<
      string,
      | {
          sessionId: string
          startedAt: string | null
          resumeQuestionNumber: number
          answeredQuestions: number
        }
      | undefined
    > = {}

    for (const attempt of attempts) {
      if (practiceKind(attempt) !== 'drill') continue
      const subjectCode = metadataString(attempt.metadata, 'subjectCode')
      const knowledgeNode = metadataString(attempt.metadata, 'knowledgeNode')
      if (
        !subjectCode ||
        !knowledgeNode ||
        !MINI_TRYOUT_TYPES.includes(subjectCode as MiniTryoutType)
      )
        continue
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
      const event =
        attempt.examTypeCode === 'EVENT' || Boolean(metadataString(attempt.metadata, 'eventId'))
      const historyKind = event
        ? ('event' as const)
        : kind === 'drill'
          ? ('drilling-materi' as const)
          : kind === 'mini_tryout'
            ? ('mini-tryout' as const)
            : ('full-tryout' as const)
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
    const [profile, streak, quota, rank, attempts, totals, activeAttempts, subjectProgress] =
      await Promise.all([
        practiceOverviewRepository.getProfile(userId),
        practiceOverviewRepository.getStreak(userId),
        practiceOverviewRepository.getWalletBalance(userId),
        practiceOverviewRepository.getCurrentRank(userId),
        practiceOverviewRepository.listCompletedAttempts(userId, 100),
        practiceOverviewRepository.getCompletedAttemptTotals(userId),
        this.activeAttempts(userId),
        subjectProgressReadRepository.listCpnsProgress(userId),
      ])

    const gamification = getGamificationProgress(totals.totalXp)
    const last = attempts[0] ?? null
    const best = attempts.reduce<CompletedAttemptOverview | null>((current, attempt) => {
      if (!current || attempt.totalScore > current.totalScore) return attempt
      return current
    }, null)
    const toExam = (attempt: CompletedAttemptOverview | null) =>
      attempt
        ? {
            id: attempt.id,
            date: formatCompletedAt(
              attempt.submittedAt ?? attempt.startedAt ?? new Date(0).toISOString(),
            ),
            score_twk: subjectScore(attempt, 'TWK'),
            score_tiu: subjectScore(attempt, 'TIU'),
            score_tkp: subjectScore(attempt, 'TKP'),
            total_score: attempt.totalScore,
            passed: attempt.passed === true,
          }
        : null
    const activeSession = activeAttempts.map(dashboardKind).find((value) => value !== null) ?? null

    return {
      user: { id: userId, name: profile?.full_name || 'Calon ASN', streak, tryoutQuota: quota },
      stats: {
        totalSessions: totals.totalSessions,
        xp: gamification.xp,
        level: gamification.level,
        levelName: gamification.levelName,
        levelProgress: gamification.progress,
        xpToNext: gamification.xpToNext,
        nextLevelName: gamification.nextLevelName,
        rank,
      },
      progress: {
        twk: canonicalDashboardProgress(subjectProgress, 'TWK'),
        tiu: canonicalDashboardProgress(subjectProgress, 'TIU'),
        tkp: canonicalDashboardProgress(subjectProgress, 'TKP'),
      },
      lastExam: toExam(last),
      bestExam: toExam(best),
      nextTryout: null,
      activeSession,
    }
  }
}

export const practiceOverviewService = new PracticeOverviewService()
