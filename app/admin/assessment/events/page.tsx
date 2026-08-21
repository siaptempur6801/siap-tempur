import { redirect } from 'next/navigation'

export default async function EventsRoute({ searchParams }: { searchParams: Promise<{ program?: string; track?: string }> }) {
    const params = await searchParams
    const query = new URLSearchParams({
        program: (params.program || 'TKA').toUpperCase(),
        track: (params.track || 'SMP').toUpperCase(),
        tab: 'events',
    })
    redirect(`/admin?${query.toString()}`)
}
