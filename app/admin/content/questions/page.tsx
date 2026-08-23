import AdminOperationsWorkspace from '@/app/admin/AdminOperationsWorkspace'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function QuestionBankRoute({ searchParams }: { searchParams: Promise<{ program?: string; track?: string; edit?: string; ok?: string; error?: string }> }) {
    return <AdminOperationsWorkspace mode="questions" searchParams={searchParams}/>
}
