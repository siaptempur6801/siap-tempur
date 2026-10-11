import { describe, expect, it } from 'vitest'
import {
  getPracticeSessionStorageKey,
  getResumeQuestionNumberFromStoredProgress,
} from '@/lib/practice-progress'

describe('practice progress storage', () => {
  it('uses the same storage key namespace as practice sessions', () => {
    expect(getPracticeSessionStorageKey('session-1')).toBe('cpns-practice-session:session-1')
  })

  it('converts the zero-based stored index to a one-based question number', () => {
    expect(
      getResumeQuestionNumberFromStoredProgress(JSON.stringify({ currentQuestionIndex: 12 })),
    ).toBe(13)
  })

  it('ignores missing, invalid, or negative progress values', () => {
    expect(getResumeQuestionNumberFromStoredProgress(null)).toBeNull()
    expect(getResumeQuestionNumberFromStoredProgress('{')).toBeNull()
    expect(
      getResumeQuestionNumberFromStoredProgress(JSON.stringify({ currentQuestionIndex: -1 })),
    ).toBeNull()
    expect(
      getResumeQuestionNumberFromStoredProgress(JSON.stringify({ currentQuestionIndex: 1.5 })),
    ).toBeNull()
  })
})
