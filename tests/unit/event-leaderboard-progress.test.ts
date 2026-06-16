import { describe, expect, it } from 'vitest'
import { buildAnsweredProgressMap } from '@/lib/event-leaderboard-progress'

describe('buildAnsweredProgressMap', () => {
    it('counts answered options by session', () => {
        const progress = buildAnsweredProgressMap([
            { session_id: 'session-a', option_id: 'option-1' },
            { session_id: 'session-a', option_id: 'option-2' },
            { session_id: 'session-b', option_id: 'option-3' },
        ])

        expect(progress.get('session-a')).toBe(2)
        expect(progress.get('session-b')).toBe(1)
    })

    it('ignores unanswered rows with null option_id', () => {
        const progress = buildAnsweredProgressMap([
            { session_id: 'session-a', option_id: null },
            { session_id: 'session-a', option_id: 'option-1' },
        ])

        expect(progress.get('session-a')).toBe(1)
    })
})
