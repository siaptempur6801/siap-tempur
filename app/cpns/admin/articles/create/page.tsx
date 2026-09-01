import { redirect } from 'next/navigation'
import ArticleForm from '@/components/admin/ArticleForm'
import { createArticle } from '@/app/actions/articles'
import { getCurrentUserRole } from '@/lib/utils/admin'
import { PERMISSIONS } from '@/src/auth/permissions'

export const dynamic = 'force-dynamic'

export default async function CreateArticlePage() {
    const actor = await getCurrentUserRole()
    if (!actor?.permissions.includes(PERMISSIONS.CONTENT_CREATE)) redirect('/admin/content/articles')

    return <ArticleForm title="Buat Artikel Baru" action={createArticle} />
}
