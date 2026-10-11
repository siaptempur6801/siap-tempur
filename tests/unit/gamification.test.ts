import { describe, expect, it } from 'vitest'
import { getAttemptXp, getGamificationProgress, getGamificationReward } from '@/lib/gamification'

describe('attempt XP reward', () => {
  it('awards minimum XP for completed mini tryout and focused practice', () => {
    expect(getAttemptXp(0, 'mini_tryout')).toBe(20)
    expect(getAttemptXp(0, 'drill')).toBe(10)
  })

  it('keeps the score when it is higher than the completion minimum', () => {
    expect(getAttemptXp(75, 'mini_tryout')).toBe(75)
    expect(getAttemptXp(45, 'drill')).toBe(45)
    expect(getAttemptXp(5, 'full_tryout')).toBe(30)
  })
})

describe('gamification level calculation', () => {
  it('normalizes invalid XP and starts at level one', () => {
    expect(getGamificationProgress(-20)).toMatchObject({
      xp: 0,
      level: 1,
      levelName: 'Calon Pejuang',
      progress: 0,
      xpToNext: 100,
    })
    expect(getGamificationProgress(Number.NaN).xp).toBe(0)
  })

  it('moves levels exactly at the configured threshold', () => {
    expect(getGamificationProgress(99)).toMatchObject({ level: 1, progress: 99, xpToNext: 1 })
    expect(getGamificationProgress(100)).toMatchObject({ level: 2, progress: 0, xpToNext: 150 })
    expect(getGamificationProgress(175)).toMatchObject({ level: 2, progress: 50, xpToNext: 75 })
  })

  it('caps progress at the highest level', () => {
    expect(getGamificationProgress(50_000)).toMatchObject({
      level: 15,
      progress: 100,
      xpToNext: 0,
      nextLevel: null,
    })
  })
})

describe('gamification attempt reward', () => {
  it('derives previous XP and detects a level up', () => {
    expect(getGamificationReward(120, 30)).toMatchObject({
      xpEarned: 30,
      previousXP: 90,
      newXP: 120,
      previousLevel: 1,
      newLevel: 2,
      leveledUp: true,
    })
  })

  it('never creates negative previous XP', () => {
    expect(getGamificationReward(10, 50)).toMatchObject({
      xpEarned: 10,
      previousXP: 0,
      newXP: 10,
    })
  })
})
