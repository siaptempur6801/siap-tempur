import { notFound, redirect } from 'next/navigation'
import ArticleForm from '@/components/admin/ArticleForm'
import { updateArticle } from '@/app/actions/articles'
import { createAdminClient } from '@/lib/utils/supabase/server'
import { getCurrentUserRole, isAdminRole } from '@/lib/utils/admin'

export const dynamic = 'force-dynamic'

type Article = {
    id: string
    title: string
    slug: string
    excerpt: string | null
    content: string
    category: string | null
    cover_image_url: string | null
    status: 'draft' | 'published' | 'archived'
    author_id: string | null
}

export default async function EditArticlePage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const actor = await getCurrentUserRole()
    const supabase = await createAdminClient()

    const { data: article, error } = await supabase
        .from('articles')
        .select('id, title, slug, excerpt, content, category, cover_image_url, status, author_id')
        .eq('id', id)
        .maybeSingle()

    if (error || !article) notFound()

    const row = article as Article
    const canEdit = isAdminRole(actor?.role) || (row.author_id === actor?.userId && row.status !== 'published')
    if (!canEdit) redirect('/cpns/admin/articles')

    return (
        <ArticleForm
            title="Edit Artikel"
            action={updateArticle.bind(null, row.id)}
            defaultValues={row}
        />
    )
}
