import { SupabaseClient } from '@supabase/supabase-js'
import { TOEFL_SUBJECTS } from './constants'
import { calculateCurrentStreak } from './utils'

interface ToeflDashboardData {
    user: {
        id: string
        name: string
        streak: number
        tryoutQuota: number
    }
    stats: {
        totalSessions: number
        xp: number
        avgScore: number
    }
    progress: {
        listening: { score: number; target: number; passed: boolean }
        structure: { score: number; target: number; passed: boolean }
        reading: { score: number; target: number; passed: boolean }
    }
    lastExam: {
        date: string
        score_listening: number
        score_structure: number
        score_reading: number
        total_score: number
        passed: boolean
    } | null
}

export async function getToeflDashboardData(supabase: SupabaseClient, userId: string): Promise<ToeflDashboardData> {
    const [profileRes, sessionsRes] = await Promise.all([
        supabase
            .from('profiles')
            .select('full_name, streak_count, tryout_quota_toefl, last_activity_date')
            .eq('id', userId)
            .single(),
        supabase
            .from('generic_sessions')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'completed')
            .order('start_time', { ascending: false })
            .limit(10)
    ])

    const profile = profileRes.data
    const sessions = sessionsRes.data || []

    const recentSessions = sessions
    const avgScores = { listening: 0, structure: 0, reading: 0 }

    if (recentSessions.length > 0) {
        recentSessions.forEach(s => {
            const breakdown = s.scores_breakdown || {}
            avgScores.listening += breakdown.Listening || 0
            avgScores.structure += breakdown.Structure || 0
            avgScores.reading += breakdown.Reading || 0
        })
        avgScores.listening = Math.round(avgScores.listening / recentSessions.length)
        avgScores.structure = Math.round(avgScores.structure / recentSessions.length)
        avgScores.reading = Math.round(avgScores.reading / recentSessions.length)
    }

    const lastSession = sessions.length > 0 ? sessions[0] : null
    const lastExam = lastSession ? {
        date: new Date(lastSession.start_time).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
        score_listening: lastSession.scores_breakdown?.Listening || 0,
        score_structure: lastSession.scores_breakdown?.Structure || 0,
        score_reading: lastSession.scores_breakdown?.Reading || 0,
        total_score: lastSession.total_score || 0,
        passed: (lastSession.total_score || 0) >= 450 // Arbitrary pass mark for ITP
    } : null

    const totalXp = sessions.reduce((sum, s) => sum + (s.total_score || 0), 0)

    return {
        user: { 
            id: userId, 
            name: profile?.full_name || 'Pejuang TOEFL', 
            streak: calculateCurrentStreak(profile?.streak_count, profile?.last_activity_date), 
            tryoutQuota: profile?.tryout_quota_toefl || 0 
        },
        stats: { 
            totalSessions: sessions.length, 
            xp: totalXp,
            avgScore: sessions.length > 0 ? Math.round(sessions.reduce((sum, s) => sum + (s.total_score || 0), 0) / sessions.length) : 0
        },
        progress: {
            listening: { score: avgScores.listening, target: TOEFL_SUBJECTS.LISTENING.passing, passed: avgScores.listening >= TOEFL_SUBJECTS.LISTENING.passing },
            structure: { score: avgScores.structure, target: TOEFL_SUBJECTS.STRUCTURE.passing, passed: avgScores.structure >= TOEFL_SUBJECTS.STRUCTURE.passing },
            reading: { score: avgScores.reading, target: TOEFL_SUBJECTS.READING.passing, passed: avgScores.reading >= TOEFL_SUBJECTS.READING.passing },
        },
        lastExam
    }
}
