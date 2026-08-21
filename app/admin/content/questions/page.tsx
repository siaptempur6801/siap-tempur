import { redirect } from 'next/navigation'

export default async function QuestionBankRoute({ searchParams }: { searchParams: Promise<{ program?: string; track?: string }> }) {
    const params = await searchParams
    const query = new URLSearchParams({
        program: (params.program || 'TKA').toUpperCase(),
        track: (params.track || 'SMP').toUpperCase(),
        tab: 'questions',
    })
    redirect(`/admin?${query.toString()}`)
}
