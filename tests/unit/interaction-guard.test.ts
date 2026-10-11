import { describe, expect, it } from 'vitest'
import {
  BUTTON_REPEAT_WINDOW_MS,
  FORM_REPEAT_WINDOW_MS,
  isRapidRepeat,
} from '@/lib/interaction-guard'

describe('interaction guard', () => {
  it('blocks an activation inside the debounce window', () => {
    expect(isRapidRepeat(1_000, 1_000 + BUTTON_REPEAT_WINDOW_MS - 1, BUTTON_REPEAT_WINDOW_MS)).toBe(
      true,
    )
    expect(isRapidRepeat(1_000, 1_000 + BUTTON_REPEAT_WINDOW_MS, BUTTON_REPEAT_WINDOW_MS)).toBe(
      false,
    )
  })

  it('allows a first activation and protects against a reversed timestamp', () => {
    expect(isRapidRepeat(undefined, 1_000, BUTTON_REPEAT_WINDOW_MS)).toBe(false)
    expect(isRapidRepeat(1_000, 999, BUTTON_REPEAT_WINDOW_MS)).toBe(false)
  })

  it('uses a longer protection window for form submissions', () => {
    expect(FORM_REPEAT_WINDOW_MS).toBeGreaterThan(BUTTON_REPEAT_WINDOW_MS)
  })
})
