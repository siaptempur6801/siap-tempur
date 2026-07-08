import { describe, expect, it } from 'vitest'
import {
    buildPassingGradeLeaderboardSections,
    hasPassedSkdPassingGrade,
    type PassingGradeLeaderboardEntry,
} from '@/lib/leaderboard-passing-grade'

function entry(overrides: Partial<PassingGradeLeaderboardEntry>): PassingGradeLeaderboardEntry {
    return {
        entry_id: 'entry-1',
        user_id: 'user-1',
        score_twk: 0,
        score_tiu: 0,
        score_tkp: 0,
        total_score: 0,
        live_rank: 0,
        started_at: '2026-07-05T03:00:00.000Z',
        ...overrides,
    }
}

describe('passing grade leaderboard sections', () => {
    it('requires TWK, TIU, and TKP to pass', () => {
        expect(hasPassedSkdPassingGrade(entry({
            score_twk: 65,
            score_tiu: 80,
            score_tkp: 166,
        }))).toBe(true)

        expect(hasPassedSkdPassingGrade(entry({
            score_twk: 90,
            score_tiu: 100,
            score_tkp: 165,
        }))).toBe(false)
    })

    it('uses only tested subjects for passing grade text and pass status', () => {
        const sections = buildPassingGradeLeaderboardSections([
            entry({
                entry_id: 'twk-passed',
                user_id: 'twk-passed',
                score_twk: 65,
                score_tiu: 0,
                score_tkp: 0,
                total_score: 65,
                question_counts: { twk: 30, tiu: 0, tkp: 0 },
            }),
            entry({
                entry_id: 'twk-below',
                user_id: 'twk-below',
                score_twk: 60,
                score_tiu: 0,
                score_tkp: 0,
                total_score: 60,
                question_counts: { twk: 30, tiu: 0, tkp: 0 },
            }),
        ])

        expect(sections[0].description).toBe('Peserta yang sudah memenuhi passing grade TWK.')
        expect(sections[1].description).toBe('Peserta yang sudah mulai tetapi belum memenuhi passing grade TWK.')
        expect(sections[0].entries.map((item) => item.entry_id)).toEqual(['twk-passed'])
        expect(sections[1].entries.map((item) => item.entry_id)).toEqual(['twk-below'])
    })

    it('splits participants into passing grade and below passing grade sections', () => {
        const sections = buildPassingGradeLeaderboardSections([
            entry({
                entry_id: 'below-1',
                user_id: 'below-1',
                score_twk: 50,
                score_tiu: 90,
                score_tkp: 170,
                total_score: 310,
            }),
            entry({
                entry_id: 'passed-1',
                user_id: 'passed-1',
                score_twk: 65,
                score_tiu: 80,
                score_tkp: 166,
                total_score: 311,
            }),
        ])

        expect(sections[0].key).toBe('passed')
        expect(sections[0].entries.map((item) => item.entry_id)).toEqual(['passed-1'])
        expect(sections[1].key).toBe('below')
        expect(sections[1].entries.map((item) => item.entry_id)).toEqual(['below-1'])
    })

    it('ranks sections by total score then started time while keeping continuous rank numbers', () => {
        const sections = buildPassingGradeLeaderboardSections([
            entry({
                entry_id: 'passed-later',
                user_id: 'passed-later',
                score_twk: 80,
                score_tiu: 90,
                score_tkp: 180,
                total_score: 350,
                started_at: '2026-07-05T03:05:00.000Z',
            }),
            entry({
                entry_id: 'passed-earlier',
                user_id: 'passed-earlier',
                score_twk: 80,
                score_tiu: 90,
                score_tkp: 180,
                total_score: 350,
                started_at: '2026-07-05T03:01:00.000Z',
            }),
            entry({
                entry_id: 'below-high',
                user_id: 'below-high',
                score_twk: 90,
                score_tiu: 100,
                score_tkp: 165,
                total_score: 355,
            }),
            entry({
                entry_id: 'below-low',
                user_id: 'below-low',
                score_twk: 30,
                score_tiu: 40,
                score_tkp: 80,
                total_score: 150,
            }),
        ])

        expect(sections[0].entries.map((item) => `${item.live_rank}:${item.entry_id}`)).toEqual([
            '1:passed-earlier',
            '2:passed-later',
        ])
        expect(sections[1].entries.map((item) => `${item.live_rank}:${item.entry_id}`)).toEqual([
            '3:below-high',
            '4:below-low',
        ])
    })
})
