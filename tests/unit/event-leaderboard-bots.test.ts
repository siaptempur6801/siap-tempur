import { describe, expect, it } from 'vitest'
import {
    buildBotScorePlan,
    computeDisplayedBotEntry,
    reconcileEventBotEntries,
    rankEventLeaderboardEntries,
    type EventBotEntry,
    type EventBotName,
} from '@/lib/event-leaderboard-bots'

const botNames: EventBotName[] = [
    { id: 'name-1', full_name: 'Andi Pratama' },
    { id: 'name-2', full_name: 'Siti Nur Aisyah' },
    { id: 'name-3', full_name: 'Rizky Maulana' },
]

describe('event leaderboard bots', () => {
    it('builds medium score plans capped at 360', () => {
        for (let seed = 1; seed <= 50; seed += 1) {
            const score = buildBotScorePlan(seed)

            expect(score.total_score).toBeGreaterThanOrEqual(260)
            expect(score.total_score).toBeLessThanOrEqual(360)
            expect(score.score_twk + score.score_tiu + score.score_tkp).toBe(score.total_score)
            expect(score.progress_count).toBe(110)
        }
    })

    it('builds TWK-only bot plans using the event question count', () => {
        const score = buildBotScorePlan(12, { twk: 30, tiu: 0, tkp: 0 })

        expect(score.progress_count).toBe(30)
        expect(score.score_twk).toBeGreaterThan(0)
        expect(score.score_tiu).toBe(0)
        expect(score.score_tkp).toBe(0)
        expect(score.total_score).toBe(score.score_twk)
    })

    it('creates stable bot entries up to the configured count without duplicate names when the pool is sufficient', () => {
        const event = {
            id: 'event-1',
            bot_count: 2,
            starts_at: '2026-07-05T03:00:00.000Z',
            duration_minutes: 100,
            start_grace_minutes: 15,
        }

        const first = reconcileEventBotEntries({ event, existingEntries: [], botNames })
        const second = reconcileEventBotEntries({ event, existingEntries: first.nextEntries, botNames })

        expect(first.nextEntries).toHaveLength(2)
        expect(new Set(first.nextEntries.map((entry) => entry.display_name)).size).toBe(2)
        expect(second.nextEntries).toEqual(first.nextEntries)
        expect(second.entriesToInsert).toHaveLength(0)
    })

    it('trims existing bot entries when the configured count is reduced', () => {
        const event = {
            id: 'event-1',
            bot_count: 1,
            starts_at: '2026-07-05T03:00:00.000Z',
            duration_minutes: 100,
            start_grace_minutes: 15,
        }
        const existingEntries = reconcileEventBotEntries({
            event: { ...event, bot_count: 3 },
            existingEntries: [],
            botNames,
        }).nextEntries

        const reconciled = reconcileEventBotEntries({ event, existingEntries, botNames })

        expect(reconciled.nextEntries).toHaveLength(1)
        expect(reconciled.entryIdsToDelete).toHaveLength(2)
    })

    it('keeps display names unique even when configured bots exceed the name pool', () => {
        const event = {
            id: 'event-1',
            bot_count: 5,
            starts_at: '2026-07-05T03:00:00.000Z',
            duration_minutes: 100,
            start_grace_minutes: 15,
        }

        const reconciled = reconcileEventBotEntries({
            event,
            existingEntries: [],
            botNames: botNames.slice(0, 2),
        })
        const names = reconciled.nextEntries.map((entry) => entry.display_name)

        expect(names).toHaveLength(5)
        expect(new Set(names).size).toBe(5)
        expect(names.every((name) => !/\d/.test(name))).toBe(true)
    })

    it('increments live bot progress over time and uses final targets when the event is closed', () => {
        const entry: EventBotEntry = {
            id: 'bot-1',
            event_id: 'event-1',
            display_name: 'Andi Pratama',
            seed: 10,
            target_progress_count: 100,
            target_score_twk: 60,
            target_score_tiu: 70,
            target_score_tkp: 150,
            target_total_score: 280,
            started_at: '2026-07-05T03:00:00.000Z',
            finished_at: '2026-07-05T04:40:00.000Z',
        }

        const liveEntry = computeDisplayedBotEntry({
            entry,
            eventStatus: 'live',
            now: new Date('2026-07-05T03:50:00.000Z'),
        })
        const finalEntry = computeDisplayedBotEntry({
            entry,
            eventStatus: 'closed',
            now: new Date('2026-07-05T05:00:00.000Z'),
        })

        expect(liveEntry.progress_count).toBeGreaterThan(0)
        expect(liveEntry.progress_count).toBeLessThan(entry.target_progress_count)
        expect(liveEntry.total_score).toBeGreaterThan(0)
        expect(liveEntry.total_score).toBeLessThan(entry.target_total_score)
        expect(finalEntry.progress_count).toBe(110)
        expect(finalEntry.total_score).toBe(entry.target_total_score)
    })

    it('keeps live bot progress monotonic while moving through section scores', () => {
        const entry: EventBotEntry = {
            id: 'bot-1',
            event_id: 'event-1',
            display_name: 'Andi Pratama',
            seed: 3606117478,
            target_progress_count: 110,
            target_score_twk: 65,
            target_score_tiu: 75,
            target_score_tkp: 160,
            target_total_score: 300,
            started_at: '2026-07-05T03:00:00.000Z',
            finished_at: '2026-07-05T04:40:00.000Z',
        }

        const early = computeDisplayedBotEntry({
            entry,
            eventStatus: 'live',
            now: new Date('2026-07-05T03:20:00.000Z'),
        })
        const middle = computeDisplayedBotEntry({
            entry,
            eventStatus: 'live',
            now: new Date('2026-07-05T03:55:00.000Z'),
        })
        const late = computeDisplayedBotEntry({
            entry,
            eventStatus: 'live',
            now: new Date('2026-07-05T04:35:00.000Z'),
        })

        expect(early.progress_count).toBeLessThanOrEqual(middle.progress_count)
        expect(middle.progress_count).toBeLessThanOrEqual(late.progress_count)
        expect(early.total_score).toBeLessThanOrEqual(middle.total_score)
        expect(middle.total_score).toBeLessThanOrEqual(late.total_score)
        expect(late.total_score).toBeLessThanOrEqual(entry.target_total_score)
    })

    it('uses TWK-first, TIU-first, and TKP-first bot categories', () => {
        const baseEntry: EventBotEntry = {
            id: 'bot-1',
            event_id: 'event-1',
            display_name: 'Andi Pratama',
            seed: 0,
            target_progress_count: 110,
            target_score_twk: 60,
            target_score_tiu: 70,
            target_score_tkp: 150,
            target_total_score: 280,
            started_at: '2026-07-05T03:00:00.000Z',
            finished_at: '2026-07-05T04:40:00.000Z',
        }

        const firstScoredSections = [0, 1, 2].map((seed) => {
            const displayed = computeDisplayedBotEntry({
                entry: { ...baseEntry, seed },
                eventStatus: 'live',
                now: new Date('2026-07-05T03:10:00.000Z'),
            })

            return {
                twk: displayed.score_twk > 0,
                tiu: displayed.score_tiu > 0,
                tkp: displayed.score_tkp > 0,
            }
        })
        const final = computeDisplayedBotEntry({
            entry: { ...baseEntry, seed: 2 },
            eventStatus: 'closed',
            now: new Date('2026-07-05T05:00:00.000Z'),
        })

        expect(firstScoredSections).toEqual([
            { twk: true, tiu: false, tkp: false },
            { twk: false, tiu: true, tkp: false },
            { twk: false, tiu: false, tkp: true },
        ])
        expect(final.progress_count).toBe(110)
        expect(final.score_twk).toBe(baseEntry.target_score_twk)
        expect(final.score_tiu).toBe(baseEntry.target_score_tiu)
        expect(final.score_tkp).toBe(baseEntry.target_score_tkp)
    })

    it('only works through TWK when the event package only contains TWK questions', () => {
        const entry: EventBotEntry = {
            id: 'bot-1',
            event_id: 'event-1',
            display_name: 'Andi Pratama',
            seed: 2,
            target_progress_count: 30,
            target_score_twk: 70,
            target_score_tiu: 0,
            target_score_tkp: 0,
            target_total_score: 70,
            started_at: '2026-07-05T03:00:00.000Z',
            finished_at: '2026-07-05T04:40:00.000Z',
            question_counts: { twk: 30, tiu: 0, tkp: 0 },
        }

        const live = computeDisplayedBotEntry({
            entry,
            eventStatus: 'live',
            now: new Date('2026-07-05T03:55:00.000Z'),
        })
        const final = computeDisplayedBotEntry({
            entry,
            eventStatus: 'closed',
            now: new Date('2026-07-05T05:00:00.000Z'),
        })

        expect(live.question_count).toBe(30)
        expect(live.progress_count).toBeGreaterThan(0)
        expect(live.progress_count).toBeLessThanOrEqual(30)
        expect(live.score_twk).toBeGreaterThan(0)
        expect(live.score_tiu).toBe(0)
        expect(live.score_tkp).toBe(0)
        expect(final.progress_count).toBe(30)
        expect(final.question_count).toBe(30)
        expect(final.total_score).toBe(entry.target_score_twk)
    })

    it('starts live bot progress from zero when the event starts', () => {
        const entry: EventBotEntry = {
            id: 'bot-1',
            event_id: 'event-1',
            display_name: 'Andi Pratama',
            seed: 10,
            target_progress_count: 100,
            target_score_twk: 60,
            target_score_tiu: 70,
            target_score_tkp: 150,
            target_total_score: 280,
            started_at: '2026-07-05T03:00:00.000Z',
            finished_at: '2026-07-05T04:40:00.000Z',
        }

        const displayed = computeDisplayedBotEntry({
            entry,
            eventStatus: 'live',
            now: new Date('2026-07-05T03:00:00.000Z'),
        })

        expect(displayed.progress_count).toBe(0)
        expect(displayed.total_score).toBe(0)
    })

    it('merges and ranks real participants with bots using score then start time', () => {
        const ranked = rankEventLeaderboardEntries([
            {
                entry_id: 'real-user-1',
                user_id: 'user-1',
                full_name: 'Peserta Asli',
                avatar_url: null,
                progress_count: 110,
                score_twk: 80,
                score_tiu: 85,
                score_tkp: 180,
                total_score: 345,
                live_rank: 0,
                is_bot: false,
                started_at: '2026-07-05T03:04:00.000Z',
            },
            {
                entry_id: 'bot-1',
                user_id: 'bot-1',
                full_name: 'Andi Pratama',
                avatar_url: null,
                progress_count: 100,
                score_twk: 60,
                score_tiu: 70,
                score_tkp: 150,
                total_score: 280,
                live_rank: 0,
                is_bot: true,
                started_at: '2026-07-05T03:01:00.000Z',
            },
            {
                entry_id: 'real-user-2',
                user_id: 'user-2',
                full_name: 'Peserta Kedua',
                avatar_url: null,
                progress_count: 105,
                score_twk: 60,
                score_tiu: 70,
                score_tkp: 150,
                total_score: 280,
                live_rank: 0,
                is_bot: false,
                started_at: '2026-07-05T03:02:00.000Z',
            },
        ])

        expect(ranked.map((entry) => entry.entry_id)).toEqual(['real-user-1', 'bot-1', 'real-user-2'])
        expect(ranked.map((entry) => entry.live_rank)).toEqual([1, 2, 3])
    })
})
