import { createClient } from '@/utils/supabase/server'
export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import LeaderboardClient from '@/components/dashboard/LeaderboardClient'

export default async function RankingPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // Fetch snapshot data using secure RPC instead of direct table access
    // We'll apply sorting and limit here just as we would on a table
    const { data: rankings, error } = await supabase
        .rpc('get_leaderboard_snapshot')
        .order('rank_pos', { ascending: true })
        .limit(100)

    if (error) {
        console.error('Leaderboard Fetch Error:', error)
        return <div className="p-8 text-center">Error loading leaderboard. Please try again later.</div>
    }

    return (
        <LeaderboardClient
            data={rankings || []}
            currentUserId={user.id}
        />
    )
}
