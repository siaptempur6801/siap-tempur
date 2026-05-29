import QuestionEditorForm from '@/components/admin/QuestionEditorForm'
import { buildCategoryMap, sanitizeAdminReturnPath } from '@/lib/admin-dashboard'
import { createClient } from '@/lib/utils/supabase/server'

export const dynamic = 'force-dynamic'

export default async function CreateQuestionPage({
    searchParams,
}: {
    searchParams: Promise<{ returnTo?: string }>
}) {
    const supabase = await createClient()
    const { returnTo } = await searchParams

    const { data: configs } = await supabase
        .from('tryout_configurations')
        .select('type, sub_category, is_active')
        .order('sort_order', { ascending: true })

    return (
        <QuestionEditorForm
            mode="create"
            categoryMap={buildCategoryMap(configs || [])}
            returnHref={sanitizeAdminReturnPath(returnTo)}
        />
    )
}
