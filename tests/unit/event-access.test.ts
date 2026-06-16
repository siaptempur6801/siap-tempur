import { describe, expect, it } from 'vitest'
import {
    canViewCompletedEventLeaderboard,
    getEffectiveEventCloseTime,
    getVisibleEventGroupLink,
} from '@/lib/event-access'

describe('getVisibleEventGroupLink', () => {
    it('returns the group link when the user is registered', () => {
        expect(getVisibleEventGroupLink('https://chat.whatsapp.com/example', 'participant-id')).toBe('https://chat.whatsapp.com/example')
    })

    it('hides the group link when the user is not registered', () => {
        expect(getVisibleEventGroupLink('https://chat.whatsapp.com/example', null)).toBeNull()
    })

    it('hides empty group links even when the user is registered', () => {
        expect(getVisibleEventGroupLink('   ', 'participant-id')).toBeNull()
    })
})

describe('getEffectiveEventCloseTime', () => {
    it('uses the synchronized close time from start, duration, and grace period', () => {
        const closeTime = getEffectiveEventCloseTime({
            starts_at: '2026-06-16T03:15:00.000Z',
            duration_minutes: 100,
            start_grace_minutes: 30,
        })

        expect(closeTime.toISOString()).toBe('2026-06-16T05:25:00.000Z')
    })
})

describe('canViewCompletedEventLeaderboard', () => {
    const baseEvent = {
        status: 'live',
        starts_at: '2026-06-16T03:15:00.000Z',
        duration_minutes: 100,
        start_grace_minutes: 30,
    }

    it('allows registered users after the effective event close time', () => {
        expect(
            canViewCompletedEventLeaderboard({
                event: baseEvent,
                participantId: 'participant-id',
                now: new Date('2026-06-16T05:26:00.000Z'),
            })
        ).toBe(true)
    })

    it('allows registered users when the event status is closed', () => {
        expect(
            canViewCompletedEventLeaderboard({
                event: { ...baseEvent, status: 'closed' },
                participantId: 'participant-id',
                now: new Date('2026-06-16T04:00:00.000Z'),
            })
        ).toBe(true)
    })

    it('does not allow unregistered users after the event closes', () => {
        expect(
            canViewCompletedEventLeaderboard({
                event: baseEvent,
                participantId: null,
                now: new Date('2026-06-16T05:26:00.000Z'),
            })
        ).toBe(false)
    })
})
