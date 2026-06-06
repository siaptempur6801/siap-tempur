import { createClient } from '@/lib/utils/supabase/server'
import LeaderboardClient from '@/components/dashboard/LeaderboardClient'
import { getNationalLeaderboardAction } from '@/app/actions/leaderboard'

export const dynamic = 'force-dynamic'

export default async function RankingPage() {
    const supabase = await createClient()

    // Middleware sudah handle redirect kalau user belum login
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null // guard ringan, middleware yang utama

    const periodText = 'All-Time Best'
    const leaderboard = await getNationalLeaderboardAction()

    if (leaderboard.error) {
        return <div className="p-8 text-center">Error loading leaderboard. Please try again later.</div>
    }

    return (
        <LeaderboardClient
            data={leaderboard.rankings}
            currentUserId={user.id}
            periodText={periodText}
            currentUserRank={leaderboard.currentUserRank}
        />
    )
}
