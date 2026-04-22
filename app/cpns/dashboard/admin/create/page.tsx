import { redirect } from 'next/navigation'
import { sanitizeAdminReturnPath } from '@/lib/admin-dashboard'

export default async function LegacyCreateQuestionPage({
    searchParams,
}: {
    searchParams: Promise<{ returnTo?: string }>
}) {
    const { returnTo } = await searchParams
    redirect(`/cpns/admin/create?returnTo=${encodeURIComponent(sanitizeAdminReturnPath(returnTo))}`)
}
