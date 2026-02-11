import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import LeaderboardClient from '@/components/dashboard/LeaderboardClient'

export default async function RankingPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // Fetch snapshot data ordered by rank_pos
    const { data: rankings, error } = await supabase
        .from('leaderboard_snapshot')
        .select('*')
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
