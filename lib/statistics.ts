import { format, subDays, isSameDay, startOfDay } from 'date-fns'
import { id } from 'date-fns/locale'

export interface SessionData {
    id: string
    start_time: string
    total_score: number
    score_twk: number
    score_tiu: number
    score_tkp: number
    status: string
    mode: string
}

// Helper to calculate stats for a subset of sessions
const calculateStats = (sessions: SessionData[], type: 'ALL' | 'TWK' | 'TIU' | 'TKP' | 'TRYOUT') => {
    if (!sessions.length) return null

    // 1. Summary
    const totalSessions = sessions.length
    const totalScoreSum = sessions.reduce((acc, s) => acc + (s.total_score || 0), 0)
    const avgScore = Math.round(totalScoreSum / totalSessions)
    const maxScore = Math.max(...sessions.map(s => s.total_score || 0))

    // 2. Category Stats (Average)
    // Fix: Denominators must depend on "relevance".

    // For 'ALL' or 'TRYOUT', we analyze everything.
    // However, if we mix in Practice sessions where some scores are naturally 0 (because they are different modules),
    // we must NOT count those 0s in the average denominator for the other modules.

    // Logic: A session counts towards a category average IF:
    // 1. It is a TRYOUT (contains all)
    // 2. OR It is a PRACTICE session where that category score > 0
    // 3. OR It is a PRACTICE session that is technically for this category but score is 0? (We ignore this edge case to avoid dilution)

    const twkSessions = sessions.filter(s => s.mode === 'tryout' || s.score_twk > 0)
    const tiuSessions = sessions.filter(s => s.mode === 'tryout' || s.score_tiu > 0)
    const tkpSessions = sessions.filter(s => s.mode === 'tryout' || s.score_tkp > 0)

    const catSum = sessions.reduce((acc, s) => ({
        twk: acc.twk + (s.score_twk || 0),
        tiu: acc.tiu + (s.score_tiu || 0),
        tkp: acc.tkp + (s.score_tkp || 0)
    }), { twk: 0, tiu: 0, tkp: 0 })

    const categoryStats = [
        {
            subject: 'TWK',
            score: Math.round(catSum.twk / (twkSessions.length || 1)),
            fullMark: 150,
            passing: 65
        },
        {
            subject: 'TIU',
            score: Math.round(catSum.tiu / (tiuSessions.length || 1)),
            fullMark: 175,
            passing: 80
        },
        {
            subject: 'TKP',
            score: Math.round(catSum.tkp / (tkpSessions.length || 1)),
            fullMark: 225,
            passing: 166
        },
    ]

    const learningGap = categoryStats.map(c => ({
        ...c,
        gap: c.passing - c.score,
        isPassed: c.score >= c.passing
    }))

    // 3. Trend Data
    const recentSessions = [...sessions].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    const trendData = recentSessions.map((s, idx) => ({
        attempt: idx + 1,
        date: format(new Date(s.start_time), 'd MMM', { locale: id }),
        score: s.total_score,
        fullDate: s.start_time
    }))

    // Trend Direction
    // Trend Analysis
    // 1. Long Term (Default): Compare second half vs first half of recent history
    let trendDirection: 'up' | 'down' | 'flat' = 'flat'
    let trendPercentage = 0
    if (recentSessions.length >= 2) {
        const mid = Math.floor(recentSessions.length / 2)
        const firstHalf = recentSessions.slice(0, mid)
        const secondHalf = recentSessions.slice(mid)
        const avgFirst = firstHalf.reduce((acc, s) => acc + s.total_score, 0) / firstHalf.length
        const avgSecond = secondHalf.reduce((acc, s) => acc + s.total_score, 0) / secondHalf.length
        const diff = avgSecond - avgFirst
        trendDirection = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat'
        trendPercentage = Math.round((Math.abs(diff) / (avgFirst || 1)) * 100)
    }

    // 2. Short Term: Compare Last 5 vs Previous 5 (or less if not enough data)
    let shortTermTrend: 'up' | 'down' | 'flat' = 'flat'
    let shortTermPercentage = 0
    if (recentSessions.length >= 4) {
        // Take last 10 sessions max
        const last10 = recentSessions.slice(-10)
        const mid = Math.floor(last10.length / 2)
        // e.g., if 6 sessions: split 3 vs 3. if 10: 5 vs 5.

        const firstHalf = last10.slice(0, mid)
        const secondHalf = last10.slice(mid)
        const avgFirst = firstHalf.reduce((acc, s) => acc + s.total_score, 0) / firstHalf.length
        const avgSecond = secondHalf.reduce((acc, s) => acc + s.total_score, 0) / secondHalf.length
        const diff = avgSecond - avgFirst

        shortTermTrend = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat'
        shortTermPercentage = Math.round((Math.abs(diff) / (avgFirst || 1)) * 100)
    } else {
        // Fallback to main trend if very few data points
        shortTermTrend = trendDirection
        shortTermPercentage = trendPercentage
    }

    // 4. Consistency
    const today = new Date()
    const last30Days = Array.from({ length: 30 }, (_, i) => {
        const d = subDays(today, 29 - i)
        return d
    })
    const activeDaysSet = new Set(sessions.map(s => startOfDay(new Date(s.start_time)).toISOString()))
    const activeInPeriod = Array.from(activeDaysSet).filter(d => {
        const date = new Date(d)
        const cutoff = subDays(today, 30)
        return date >= cutoff
    }).length
    const consistencyData = last30Days.map(date => {
        const iso = startOfDay(date).toISOString()
        return {
            date: date,
            active: activeDaysSet.has(iso),
            dayLabel: format(date, 'EEEEE', { locale: id })
        }
    })
    const consistencyScore = Math.round((activeInPeriod / 30) * 100)

    // 5. Generate Insight
    const insights = []

    // Only generate trend insights if reasonable data exists
    if (type === 'ALL' || type === 'TRYOUT') {
        if (recentSessions.length > 1) {
            if (trendDirection === 'up') insights.push(`Grafik nilaimu **menanjak naik (${trendPercentage}%)**. Pertahankan momentum!`)
            else if (trendDirection === 'down') insights.push(`Performa sedang **turun (${trendPercentage}%)**. Ayo evaluasi lagi.`)
        }

        // Find weakest link
        const weakest = learningGap.reduce((prev, curr) => (prev.gap > curr.gap) ? prev : curr)
        if (!weakest.isPassed) insights.push(`Fokus utamamu saat ini: Kejar **${weakest.gap} poin** lagi di **${weakest.subject}**.`)
        else insights.push("Semua kategori aman! Coba tingkatkan skor untuk masuk peringkat atas.")

    } else {
        // Module specific insight
        const modStat = learningGap.find(c => c.subject === type)
        if (modStat) {
            if (!modStat.isPassed) insights.push(`Kamu masih kurang **${modStat.gap} poin** di ${type}. Perbanyak latihan soal tipe ini.`)
            else insights.push(`Skor ${type} kamu sudah **Lulus (+${Math.abs(modStat.gap)})**. Great job!`)
        }
    }

    if (consistencyScore < 30) insights.push("Konsistensi adalah kunci. Coba 'One Day One Latihan'.")

    return {
        summary: { totalSessions, avgScore, maxScore },
        categoryStats,
        trendData,
        trendDirection, // Long term
        trendPercentage,
        shortTermTrend,
        shortTermPercentage,
        consistencyData,
        consistencyScore,
        activeInPeriod,
        insights
    }
}

export const processStatistics = (sessions: SessionData[]) => {
    // 1. Initial Filtering: Only meaningful sessions (score > 0)
    // This prevents abandoned 0-score sessions from dragging down all averages
    const validSessions = sessions.filter(s => s.total_score > 0)

    // Partition sessions
    const tryoutSessions = validSessions.filter(s => s.mode === 'tryout')

    // For practice, filter strictly by non-zero component score
    const practiceSessions = validSessions.filter(s => s.mode === 'practice')

    const twkSessions = practiceSessions.filter(s => s.score_twk > 0)
    const tiuSessions = practiceSessions.filter(s => s.score_tiu > 0)
    const tkpSessions = practiceSessions.filter(s => s.score_tkp > 0)

    // Note: This logic now correctly excludes a TIU-only practice from the 'twkSessions' list.
    // And 'validSessions' excludes 0-score abandoned runs.

    return {
        all: calculateStats(validSessions, 'ALL'), // 'ALL' will now use smart denominators logic inside
        tryout: calculateStats(tryoutSessions, 'TRYOUT'),
        twk: calculateStats(twkSessions, 'TWK'),
        tiu: calculateStats(tiuSessions, 'TIU'),
        tkp: calculateStats(tkpSessions, 'TKP'),
    }
}
