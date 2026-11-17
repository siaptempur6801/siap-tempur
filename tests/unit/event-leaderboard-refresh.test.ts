import { describe, expect, it } from 'vitest'
import { shouldRefreshEventLeaderboard } from '@/lib/event-leaderboard-refresh'

describe('shouldRefreshEventLeaderboard', () => {
  it('does not refresh closed event leaderboards', () => {
    expect(shouldRefreshEventLeaderboard('closed')).toBe(false)
  })

  it('keeps refreshing live event leaderboards', () => {
    expect(shouldRefreshEventLeaderboard('live')).toBe(true)
  })

  it('does not refresh scheduled event leaderboards', () => {
    expect(shouldRefreshEventLeaderboard('scheduled')).toBe(false)
  })
})
