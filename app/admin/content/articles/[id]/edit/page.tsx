import { updateArticle } from '@/app/actions/articles'
import ArticleForm from '@/components/admin/ArticleForm'
import { adminReturnUrl } from '@/lib/admin-return-url'
import { createClient } from '@/lib/utils/supabase/server'
import { PERMISSIONS } from '@/src/auth/permissions'
import { authorizationService } from '@/src/services/authorization.service'
import { notFound, redirect } from 'next/navigation'

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
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ returnTo?: string }>
}) {
  const returnTo = adminReturnUrl((await searchParams).returnTo, '/admin/content/articles')
  const { id } = await params
  // Stack V2: permission dari AuthorizationService, bukan adapter peran lama.
  const authorization = await authorizationService.getCurrentAuthorization()
  if (!authorization?.permissions.includes(PERMISSIONS.CONTENT_UPDATE))
    redirect('/admin/content/articles')

  const supabase = await createClient()
  const { data: article, error } = await supabase
    .from('articles')
    .select('id, title, slug, excerpt, content, category, cover_image_url, status, author_id')
    .eq('id', id)
    .maybeSingle()

  if (error || !article) notFound()

  const row = article as Article
  // Aturan yang sama seperti sebelumnya, tetapi `admin` kini berarti pemegang
  // `admin.access` — bukan peran yang dulu dibaca dari `profiles.role`.
  const isAdmin = authorization.permissions.includes(PERMISSIONS.ADMIN_ACCESS)
  const canEdit = isAdmin || (row.author_id === authorization.userId && row.status !== 'published')
  if (!canEdit) redirect('/admin/content/articles')

  return (
    <ArticleForm
      returnTo={returnTo}
      title="Edit Artikel"
      action={updateArticle.bind(null, row.id)}
      defaultValues={row}
    />
  )
}
