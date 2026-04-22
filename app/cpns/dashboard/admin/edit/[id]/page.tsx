import { redirect } from 'next/navigation'
import { sanitizeAdminReturnPath } from '@/lib/admin-dashboard'

export default async function LegacyEditQuestionPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>
    searchParams: Promise<{ returnTo?: string }>
}) {
    const { id } = await params
    const { returnTo } = await searchParams
    redirect(`/cpns/admin/edit/${id}?returnTo=${encodeURIComponent(sanitizeAdminReturnPath(returnTo))}`)
}
