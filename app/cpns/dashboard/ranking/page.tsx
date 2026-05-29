import { createAdminClient, createClient } from '@/lib/utils/supabase/server'
// Cache leaderboard 15 menit agar selaras dengan refresh snapshot via pg_cron.
export const revalidate = 900
import LeaderboardClient from '@/components/dashboard/LeaderboardClient'

interface LeaderboardEntry {
    rank_pos: number
    user_id: string
    full_name: string
    avatar_url: string | null
    top_score: number
    score_twk: number
    score_tiu: number
    score_tkp: number
}

export default async function RankingPage() {
    const supabase = await createClient()

    // Middleware sudah handle redirect kalau user belum login
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null // guard ringan, middleware yang utama

    // Hitung periode minggu dan bulan
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const monthName = months[now.getMonth()];
    const date = now.getDate();
    const weekOfMonth = Math.ceil(date / 7);
    const periodText = `Minggu ke-${weekOfMonth} Bulan ${monthName}`;

    const admin = await createAdminClient()

    // Fetch top 100 dan urutan user saat ini secara paralel
    const [{ data: rankings, error }, { data: currentUserRank, error: currentUserRankError }] = await Promise.all([
        supabase.rpc('get_leaderboard_snapshot').order('rank_pos', { ascending: true }).limit(100),
        admin
            .from('leaderboard_snapshot')
            .select('rank_pos, user_id, full_name, avatar_url, top_score, score_twk, score_tiu, score_tkp')
            .eq('user_id', user.id)
            .maybeSingle(),
    ])

    if (error) {
        console.error('Leaderboard Fetch Error:', error)
        return <div className="p-8 text-center">Error loading leaderboard. Please try again later.</div>
    }

    const topRankings = ((rankings as LeaderboardEntry[] | null) || []).slice(0, 100)
    let resolvedCurrentUserRank = (currentUserRank as LeaderboardEntry | null) ?? null

    if (!resolvedCurrentUserRank || currentUserRankError) {
        const { data: fallbackUserRank, error: fallbackUserRankError } = await admin
            .from('leaderboard_snapshot')
            .select('rank_pos, user_id, full_name, avatar_url, top_score, score_twk, score_tiu, score_tkp')
            .eq('user_id', user.id)
            .maybeSingle()

        if (fallbackUserRankError) {
            console.error('Current User Rank Fallback Error:', fallbackUserRankError)
        } else {
            resolvedCurrentUserRank = (fallbackUserRank as LeaderboardEntry | null) ?? null
        }
    }

    return (
        <LeaderboardClient
            data={topRankings}
            currentUserId={user.id}
            periodText={periodText}
            currentUserRank={resolvedCurrentUserRank}
        />
    )
}
