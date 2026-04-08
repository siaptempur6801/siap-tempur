import { createClient } from '@/utils/supabase/server'
// Cache leaderboard 5 menit — data diupdate via cron, tidak perlu real-time
export const revalidate = 300
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

    // Fetch top 100 dan urutan user saat ini secara paralel
    const [{ data: rankings, error }, { data: currentUserRank }] = await Promise.all([
        supabase.rpc('get_leaderboard_snapshot').order('rank_pos', { ascending: true }),
        supabase.rpc('get_user_leaderboard_rank', { p_user_id: user.id }).maybeSingle(),
    ])

    if (error) {
        console.error('Leaderboard Fetch Error:', error)
        return <div className="p-8 text-center">Error loading leaderboard. Please try again later.</div>
    }

    return (
        <LeaderboardClient
            data={(rankings as LeaderboardEntry[] | null) || []}
            currentUserId={user.id}
            periodText={periodText}
            currentUserRank={(currentUserRank as LeaderboardEntry | null) ?? null}
        />
    )
}
