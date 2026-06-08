import { describe, expect, it } from 'vitest'
import { getVisibleEventGroupLink } from '@/lib/event-access'

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
