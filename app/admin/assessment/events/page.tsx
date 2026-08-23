import AdminOperationsWorkspace from '@/app/admin/AdminOperationsWorkspace'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function EventsRoute({ searchParams }: { searchParams: Promise<{ program?: string; track?: string; edit?: string; ok?: string; error?: string }> }) {
    return <AdminOperationsWorkspace mode="events" searchParams={searchParams}/>
}
