import { createArticle } from '@/app/actions/articles'
import ArticleForm from '@/components/admin/ArticleForm'
import { adminReturnUrl } from '@/lib/admin-return-url'
import { PERMISSIONS } from '@/src/auth/permissions'
import { authorizationService } from '@/src/services/authorization.service'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function CreateArticlePage({searchParams}:{searchParams:Promise<{returnTo?:string}>}) {
    const returnTo=adminReturnUrl((await searchParams).returnTo,'/admin/content/articles')
    const authorization = await authorizationService.getCurrentAuthorization()
    if (!authorization?.permissions.includes(PERMISSIONS.CONTENT_CREATE)) redirect('/admin/content/articles')

    return <ArticleForm returnTo={returnTo} title="Buat Artikel Baru" action={createArticle} />
}
