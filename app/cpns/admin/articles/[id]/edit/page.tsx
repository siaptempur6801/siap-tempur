import { notFound, redirect } from 'next/navigation'
import ArticleForm from '@/components/admin/ArticleForm'
import { updateArticle } from '@/app/actions/articles'
import { createClient } from '@/lib/utils/supabase/server'
import { getCurrentUserRole, isAdminRole } from '@/lib/utils/admin'
import { PERMISSIONS } from '@/src/auth/permissions'

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

export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const actor = await getCurrentUserRole()
    if (!actor?.permissions.includes(PERMISSIONS.CONTENT_UPDATE)) redirect('/admin/content/articles')

    const supabase = await createClient()
    const { data: article, error } = await supabase
        .from('articles')
        .select('id, title, slug, excerpt, content, category, cover_image_url, status, author_id')
        .eq('id', id)
        .maybeSingle()

    if (error || !article) notFound()

    const row = article as Article
    const canEdit = isAdminRole(actor.role) || (row.author_id === actor.userId && row.status !== 'published')
    if (!canEdit) redirect('/admin/content/articles')

    return <ArticleForm title="Edit Artikel" action={updateArticle.bind(null, row.id)} defaultValues={row}/>
}
