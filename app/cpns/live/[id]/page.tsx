import { redirect } from 'next/navigation'

export default async function LegacyLiveLeaderboardPage({ params }: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    redirect(`/cpns/dashboard/event/${encodeURIComponent(id)}/live`)
}
