import { redirect } from 'next/navigation'

export default async function LegacyDashboardLeaderboardPage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    redirect(`/cpns/live/${encodeURIComponent(id)}`)
}
