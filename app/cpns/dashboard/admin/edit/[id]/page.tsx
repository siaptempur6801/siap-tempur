import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import EditQuestionForm from '@/components/admin/EditQuestionForm'
import { buildCategoryMap, sanitizeAdminReturnPath } from '@/lib/admin-dashboard'

export const dynamic = 'force-dynamic'

export default async function EditQuestionPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>
    searchParams: Promise<{ returnTo?: string }>
}) {
    const supabase = await createClient()

    // In Next.js 15/16, params is a Promise
    const { id } = await params
    const { returnTo } = await searchParams

    const [{ data: question }, { data: configs }] = await Promise.all([
        supabase
            .from('questions')
            .select('*, options(*)')
            .eq('id', id)
            .single(),
        supabase
            .from('tryout_configurations')
            .select('type, sub_category, is_active')
            .order('sort_order', { ascending: true }),
    ])

    if (!question) {
        notFound()
    }

    return (
        <EditQuestionForm
            question={question}
            categoryMap={buildCategoryMap(configs || [])}
            returnHref={sanitizeAdminReturnPath(returnTo)}
        />
    )
}
