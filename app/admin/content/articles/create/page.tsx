import { redirect } from 'next/navigation'
import ArticleForm from '@/components/admin/ArticleForm'
import { createArticle } from '@/app/actions/articles'
import { PERMISSIONS } from '@/src/auth/permissions'
import { authorizationService } from '@/src/services/authorization.service'

export const dynamic = 'force-dynamic'

export default async function CreateArticlePage() {
    const authorization = await authorizationService.getCurrentAuthorization()
    if (!authorization?.permissions.includes(PERMISSIONS.CONTENT_CREATE)) redirect('/admin/content/articles')

    return <ArticleForm title="Buat Artikel Baru" action={createArticle} />
}
