import { LEVEL_THRESHOLDS } from '@/lib/constants'

export type GamificationProgress = {
  xp: number
  level: number
  levelName: string
  levelStartXp: number
  nextLevel: number | null
  nextLevelName: string | null
  nextLevelXp: number | null
  progress: number
  xpToNext: number
}

function normalizeXp(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0
}

export function getAttemptXp(score: number, practiceKind?: string | null) {
  const scoreXp = normalizeXp(score)
  const minimumXp =
    practiceKind === 'drill'
      ? 10
      : practiceKind === 'mini_tryout'
        ? 20
        : practiceKind === 'full_tryout' || practiceKind === 'event'
          ? 30
          : 10

  return Math.max(scoreXp, minimumXp)
}

export function getGamificationProgress(value: number): GamificationProgress {
  const xp = normalizeXp(value)
  let currentIndex = 0

  for (let index = 0; index < LEVEL_THRESHOLDS.length; index += 1) {
    if (xp < LEVEL_THRESHOLDS[index].xp) break
    currentIndex = index
  }

  const current = LEVEL_THRESHOLDS[currentIndex]
  const next = LEVEL_THRESHOLDS[currentIndex + 1] ?? null
  const levelSpan = next ? next.xp - current.xp : 0
  const progress =
    next && levelSpan > 0
      ? Math.min(100, Math.max(0, Math.round(((xp - current.xp) / levelSpan) * 100)))
      : 100

  return {
    xp,
    level: current.level,
    levelName: current.name,
    levelStartXp: current.xp,
    nextLevel: next?.level ?? null,
    nextLevelName: next?.name ?? null,
    nextLevelXp: next?.xp ?? null,
    progress,
    xpToNext: next ? Math.max(0, next.xp - xp) : 0,
  }
}

export function getGamificationReward(totalXp: number, earnedXp: number) {
  const newXP = normalizeXp(totalXp)
  const xpEarned = Math.min(newXP, normalizeXp(earnedXp))
  const previousXP = newXP - xpEarned
  const previous = getGamificationProgress(previousXP)
  const current = getGamificationProgress(newXP)

  return {
    xpEarned,
    previousXP,
    newXP,
    previousLevel: previous.level,
    newLevel: current.level,
    newLevelName: current.levelName,
    leveledUp: current.level > previous.level,
    progress: current.progress,
    xpToNext: current.xpToNext,
    nextLevel: current.nextLevel,
    nextLevelName: current.nextLevelName,
  }
}
