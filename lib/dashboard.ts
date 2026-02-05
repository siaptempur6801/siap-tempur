import { SupabaseClient } from '@supabase/supabase-js'

interface DashboardData {
    user: {
        id: string
        name: string
        streak: number
        tryoutQuota: number
    }
    stats: {
        totalSessions: number
        xp: number
        level: number
        levelName: string
    }
    progress: {
        twk: { score: number; target: number; passed: boolean }
        tiu: { score: number; target: number; passed: boolean }
        tkp: { score: number; target: number; passed: boolean }
    }
    priorityFocus: {
        type: 'TWK' | 'TIU' | 'TKP'
        reason: string
        target: string
    }
    recommendations: Array<{
        type: 'TWK' | 'TIU' | 'TKP'
        title: string
        description: string
    }>
    nextTryout: {
        name: string
        daysLeft: number
    } | null
}

// XP calculation: total_score from all completed sessions
// Level thresholds - designed to be motivating with quick early levels
// and progressively harder levels
export const LEVEL_THRESHOLDS = [
    { xp: 0, level: 1, name: 'Calon Pejuang' },          // Starting point
    { xp: 100, level: 2, name: 'Pelajar Pemula' },       // 1-2 sessions
    { xp: 250, level: 3, name: 'Siswa Rajin' },          // ~3 sessions
    { xp: 500, level: 4, name: 'Calon ASN' },            // ~5 sessions
    { xp: 800, level: 5, name: 'Pejuang SKD' },          // ~8 sessions
    { xp: 1200, level: 6, name: 'Warrior Muda' },        // ~12 sessions
    { xp: 1800, level: 7, name: 'Rising Star' },         // ~18 sessions
    { xp: 2500, level: 8, name: 'Ahli Latihan' },        // ~25 sessions
    { xp: 3500, level: 9, name: 'Semi Pro' },            // ~35 sessions
    { xp: 5000, level: 10, name: 'Pro Player' },         // ~50 sessions
    { xp: 7000, level: 11, name: 'Elite Warrior' },      // ~70 sessions
    { xp: 10000, level: 12, name: 'Master SKD' },        // ~100 sessions
    { xp: 15000, level: 13, name: 'Grand Master' },      // ~150 sessions
    { xp: 22000, level: 14, name: 'Legend SKD' },       // ~220 sessions
    { xp: 30000, level: 15, name: 'Dewa ASN' },          // Ultimate level
]

export function getLevel(xp: number) {
    let current = LEVEL_THRESHOLDS[0]
    for (const threshold of LEVEL_THRESHOLDS) {
        if (xp >= threshold.xp) current = threshold
        else break
    }
    return current
}

// Get progress to next level (percentage)
export function getLevelProgress(xp: number) {
    const currentLevel = getLevel(xp)
    const currentIndex = LEVEL_THRESHOLDS.findIndex(t => t.level === currentLevel.level)
    const nextLevel = LEVEL_THRESHOLDS[currentIndex + 1]

    if (!nextLevel) {
        // Max level reached
        return { current: currentLevel, next: null, progress: 100, xpToNext: 0 }
    }

    const xpInCurrentLevel = xp - currentLevel.xp
    const xpNeededForNext = nextLevel.xp - currentLevel.xp
    const progress = Math.round((xpInCurrentLevel / xpNeededForNext) * 100)

    return {
        current: currentLevel,
        next: nextLevel,
        progress: Math.min(progress, 100),
        xpToNext: nextLevel.xp - xp,
    }
}

export function getXPInfo(previousTotalXP: number, xpEarned: number) {
    const newTotalXP = previousTotalXP + xpEarned
    const previousLevel = getLevel(previousTotalXP)
    const newLevel = getLevel(newTotalXP)
    const levelProgress = getLevelProgress(newTotalXP)

    return {
        previousXP: previousTotalXP,
        newXP: newTotalXP,
        xpEarned,
        previousLevel: previousLevel.level,
        previousLevelName: previousLevel.name,
        newLevel: newLevel.level,
        newLevelName: newLevel.name,
        leveledUp: newLevel.level > previousLevel.level,
        progress: levelProgress.progress,
        xpToNext: levelProgress.xpToNext,
    }
}

// Passing grades
const PASSING_GRADES = {
    TWK: 65,
    TIU: 80,
    TKP: 166,
}

export async function getDashboardData(supabase: SupabaseClient, userId: string): Promise<DashboardData> {
    // Fetch profile
    // Fetch data in parallel to resolve "waterfall" slowness
    const [profileRes, sessionsRes, allSessionsRes] = await Promise.all([
        supabase
            .from('profiles')
            .select('full_name, streak_count, tryout_quota')
            .eq('id', userId)
            .single(),
        supabase
            .from('test_sessions')
            .select('id, total_score, score_twk, score_tiu, score_tkp, mode, status, start_time')
            .eq('user_id', userId)
            .eq('status', 'completed')
            .order('start_time', { ascending: false })
            .limit(10),
        supabase
            .from('test_sessions')
            .select('total_score')
            .eq('user_id', userId)
            .eq('status', 'completed')
    ])

    const profile = profileRes.data
    const sessions = sessionsRes.data
    const allSessions = allSessionsRes.data

    const totalXp = allSessions?.reduce((sum, s) => sum + (s.total_score || 0), 0) || 0
    const levelInfo = getLevel(totalXp)

    // Calculate average scores from recent sessions
    const recentSessions = sessions || []
    const avgScores = {
        twk: 0,
        tiu: 0,
        tkp: 0,
    }

    if (recentSessions.length > 0) {
        const twkSessions = recentSessions.filter(s => s.score_twk > 0)
        const tiuSessions = recentSessions.filter(s => s.score_tiu > 0)
        const tkpSessions = recentSessions.filter(s => s.score_tkp > 0)

        if (twkSessions.length > 0) {
            avgScores.twk = Math.round(twkSessions.reduce((sum, s) => sum + s.score_twk, 0) / twkSessions.length)
        }
        if (tiuSessions.length > 0) {
            avgScores.tiu = Math.round(tiuSessions.reduce((sum, s) => sum + s.score_tiu, 0) / tiuSessions.length)
        }
        if (tkpSessions.length > 0) {
            avgScores.tkp = Math.round(tkpSessions.reduce((sum, s) => sum + s.score_tkp, 0) / tkpSessions.length)
        }
    }

    // Determine priority focus (weakest category relative to passing grade)
    const gaps = {
        TWK: PASSING_GRADES.TWK - avgScores.twk,
        TIU: PASSING_GRADES.TIU - avgScores.tiu,
        TKP: PASSING_GRADES.TKP - avgScores.tkp,
    }

    let priorityType: 'TWK' | 'TIU' | 'TKP' = 'TWK'
    let maxGap = gaps.TWK

    if (gaps.TIU > maxGap) {
        priorityType = 'TIU'
        maxGap = gaps.TIU
    }
    if (gaps.TKP > maxGap) {
        priorityType = 'TKP'
    }

    // If all passed, pick random or default
    const allPassed = avgScores.twk >= PASSING_GRADES.TWK &&
        avgScores.tiu >= PASSING_GRADES.TIU &&
        avgScores.tkp >= PASSING_GRADES.TKP

    const priorityReasons: Record<'TWK' | 'TIU' | 'TKP', string> = {
        TWK: 'Skor TWK kamu masih di bawah passing grade',
        TIU: 'Skor TIU kamu perlu ditingkatkan',
        TKP: 'TKP butuh latihan lebih untuk capai target',
    }

    // Generate recommendations based on weak areas
    const recommendations: DashboardData['recommendations'] = []

    if (avgScores.twk < PASSING_GRADES.TWK) {
        recommendations.push({
            type: 'TWK',
            title: 'Latihan TWK',
            description: `Tingkatkan skor dari ${avgScores.twk} ke ${PASSING_GRADES.TWK}`,
        })
    }
    if (avgScores.tiu < PASSING_GRADES.TIU) {
        recommendations.push({
            type: 'TIU',
            title: 'Latihan TIU',
            description: `Tingkatkan skor dari ${avgScores.tiu} ke ${PASSING_GRADES.TIU}`,
        })
    }
    if (avgScores.tkp < PASSING_GRADES.TKP) {
        recommendations.push({
            type: 'TKP',
            title: 'Latihan TKP',
            description: `Tingkatkan skor dari ${avgScores.tkp} ke ${PASSING_GRADES.TKP}`,
        })
    }

    // If no recommendations (all passed), suggest maintenance
    if (recommendations.length === 0) {
        recommendations.push({
            type: 'TWK',
            title: 'Pertahankan TWK',
            description: 'Jaga konsistensi dengan latihan rutin',
        })
    }

    return {
        user: {
            id: userId,
            name: profile?.full_name || 'Calon ASN',
            streak: profile?.streak_count || 0,
            tryoutQuota: profile?.tryout_quota || 0,
        },
        stats: {
            totalSessions: recentSessions.length,
            xp: totalXp,
            level: levelInfo.level,
            levelName: levelInfo.name,
        },
        progress: {
            twk: {
                score: avgScores.twk,
                target: PASSING_GRADES.TWK,
                passed: avgScores.twk >= PASSING_GRADES.TWK,
            },
            tiu: {
                score: avgScores.tiu,
                target: PASSING_GRADES.TIU,
                passed: avgScores.tiu >= PASSING_GRADES.TIU,
            },
            tkp: {
                score: avgScores.tkp,
                target: PASSING_GRADES.TKP,
                passed: avgScores.tkp >= PASSING_GRADES.TKP,
            },
        },
        priorityFocus: {
            type: priorityType,
            reason: allPassed ? 'Semua kategori sudah lulus! Pertahankan performamu.' : priorityReasons[priorityType],
            target: allPassed ? 'Konsistensi' : `Target: ${PASSING_GRADES[priorityType]} poin`,
        },
        recommendations: recommendations.slice(0, 2),
        nextTryout: null, // Will be implemented when tryout scheduling exists
    }
}

export function getGreeting(hour: number): { greeting: string; message: string } {
    if (hour >= 4 && hour < 11) {
        return {
            greeting: 'Selamat Pagi',
            message: 'Pagi yang sempurna untuk memulai belajar! ☀️',
        }
    }
    if (hour >= 11 && hour < 15) {
        return {
            greeting: 'Selamat Siang',
            message: 'Semangat! Lanjutkan progres belajarmu. 💪',
        }
    }
    if (hour >= 15 && hour < 18) {
        return {
            greeting: 'Selamat Sore',
            message: 'Waktu yang tepat untuk review materi. 📚',
        }
    }
    return {
        greeting: 'Selamat Malam',
        message: 'Latihan sebelum tidur bisa memperkuat ingatan! 🌙',
    }
}
