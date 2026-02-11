import { format, subDays, isSameDay, startOfDay } from 'date-fns'
import { id } from 'date-fns/locale'
import { PASSING_GRADES, SUBJECTS } from './constants'

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
            fullMark: SUBJECTS.TWK.fullMark,
            passing: PASSING_GRADES.TWK
        },
        {
            subject: 'TIU',
            score: Math.round(catSum.tiu / (tiuSessions.length || 1)),
            fullMark: SUBJECTS.TIU.fullMark,
            passing: PASSING_GRADES.TIU
        },
        {
            subject: 'TKP',
            score: Math.round(catSum.tkp / (tkpSessions.length || 1)),
            fullMark: SUBJECTS.TKP.fullMark,
            passing: PASSING_GRADES.TKP
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

    // Short Term Trend
    let shortTermTrend: 'up' | 'down' | 'flat' = 'flat'
    let shortTermPercentage = 0
    if (recentSessions.length >= 4) {
        const last10 = recentSessions.slice(-10)
        const mid = Math.floor(last10.length / 2)
        const firstHalf = last10.slice(0, mid)
        const secondHalf = last10.slice(mid)
        const avgFirst = firstHalf.reduce((acc, s) => acc + s.total_score, 0) / firstHalf.length
        const avgSecond = secondHalf.reduce((acc, s) => acc + s.total_score, 0) / secondHalf.length
        const diff = avgSecond - avgFirst
        shortTermTrend = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat'
        shortTermPercentage = Math.round((Math.abs(diff) / (avgFirst || 1)) * 100)
    } else {
        shortTermTrend = trendDirection
        shortTermPercentage = trendPercentage
    }

    // 4. Consistency
    const today = new Date()
    const last30Days = Array.from({ length: 30 }, (_, i) => subDays(today, 29 - i))
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

    if (type === 'ALL' || type === 'TRYOUT') {
        if (recentSessions.length > 1) {
            if (trendDirection === 'up') insights.push(`Grafik nilaimu **menanjak naik (${trendPercentage}%)**. Pertahankan momentum!`)
            else if (trendDirection === 'down') insights.push(`Performa sedang **turun (${trendPercentage}%)**. Ayo evaluasi lagi.`)
        }

        const weakest = learningGap.reduce((prev, curr) => (prev.gap > curr.gap) ? prev : curr)
        if (!weakest.isPassed) insights.push(`Fokus utamamu saat ini: Kejar **${weakest.gap} poin** lagi di **${weakest.subject}**.`)
        else insights.push("Semua kategori aman! Coba tingkatkan skor untuk masuk peringkat atas.")

    } else {
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
        trendDirection,
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
    const validSessions = sessions.filter(s => s.total_score > 0)
    const tryoutSessions = validSessions.filter(s => s.mode === 'tryout')
    const practiceSessions = validSessions.filter(s => s.mode === 'practice')

    const twkSessions = practiceSessions.filter(s => s.score_twk > 0)
    const tiuSessions = practiceSessions.filter(s => s.score_tiu > 0)
    const tkpSessions = practiceSessions.filter(s => s.score_tkp > 0)

    return {
        all: calculateStats(validSessions, 'ALL'),
        tryout: calculateStats(tryoutSessions, 'TRYOUT'),
        twk: calculateStats(twkSessions, 'TWK'),
        tiu: calculateStats(tiuSessions, 'TIU'),
        tkp: calculateStats(tkpSessions, 'TKP'),
    }
}
