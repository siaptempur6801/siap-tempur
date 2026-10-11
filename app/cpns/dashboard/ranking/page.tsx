import { createClient } from '@/lib/utils/supabase/server'
import LeaderboardClient from '@/components/dashboard/LeaderboardClient'
import { getNationalLeaderboardAction } from '@/app/actions/leaderboard'
import { redirect } from 'next/navigation'
import LeaderboardError from '@/components/dashboard/LeaderboardError'

export const dynamic = 'force-dynamic'

export default async function RankingPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?returnTo=%2Fcpns%2Fdashboard%2Franking')

  const periodText = 'Skor terbaik sepanjang waktu'
  const leaderboard = await getNationalLeaderboardAction()

  if (leaderboard.error) {
    return <LeaderboardError />
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
