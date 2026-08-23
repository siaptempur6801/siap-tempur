import Link from 'next/link'
import { Eye, Plus } from 'lucide-react'
import { createAdminClient } from '@/lib/utils/supabase/server'
import { canPublishArticle, getCurrentUserRole, isAdminRole } from '@/lib/utils/admin'
import { formatArticleDate } from '@/lib/articles'
import ArticleStatusActions from '@/components/admin/ArticleStatusActions'
import {
    AdminBadge,
    AdminCard,
    AdminEmptyState,
    AdminPageHeader,
    AdminSectionHeading,
    adminPrimaryButtonClass,
    adminSecondaryButtonClass,
} from '@/components/admin/AdminUi'

export const dynamic = 'force-dynamic'

type ArticleStatus = 'draft' | 'published' | 'archived'

type Article = {
    id: string
    title: string
    slug: string
    excerpt: string | null
    status: ArticleStatus
    author_id: string | null
    published_at: string | null
    updated_at: string
    profiles?: { full_name?: string | null } | { full_name?: string | null }[] | null
}

function statusVariant(status: ArticleStatus): 'neutral' | 'green' | 'yellow' {
    if (status === 'published') return 'green'
    if (status === 'archived') return 'neutral'
    return 'yellow'
}

function getAuthorName(article: Article) {
    const profile = Array.isArray(article.profiles) ? article.profiles[0] : article.profiles
    return profile?.full_name || 'Penulis'
}

export default async function AdminArticlesPage() {
    const actor = await getCurrentUserRole()
    const supabase = await createAdminClient()
    const canManageAll = isAdminRole(actor?.role)

    let query = supabase
        .from('articles')
        .select('id, title, slug, excerpt, status, author_id, published_at, updated_at, profiles(full_name)')
        .order('updated_at', { ascending: false })

    if (!canManageAll && actor?.userId) query = query.eq('author_id', actor.userId)

    const { data: articles, error } = await query
    const rows = (articles as Article[] | null) ?? []

    return (
        <div className="space-y-6 pb-10">
            <AdminPageHeader
                title="Articles"
                description="Kelola draft, publikasi, dan arsip artikel. Writer hanya mengelola artikelnya sendiri; publish tetap dibatasi sesuai role."
                action={<Link href="/admin/content/articles/create" className={adminPrimaryButtonClass}><Plus size={16}/>Artikel baru</Link>}
            />

            {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">Gagal memuat artikel: {error.message}</div> : null}

            <AdminCard className="overflow-hidden">
                <div className="border-b border-slate-200 p-5">
                    <AdminSectionHeading title="Daftar artikel" description={`${rows.length} artikel dapat diakses oleh akun ini.`}/>
                </div>

                {rows.length ? (
                    <div className="divide-y divide-slate-100">
                        {rows.map((article) => {
                            const canEdit = canManageAll || (article.author_id === actor?.userId && article.status !== 'published')
                            const canArchive = canManageAll || (article.author_id === actor?.userId && article.status !== 'published')
                            return (
                                <article key={article.id} className="p-5 transition hover:bg-slate-50/70 sm:p-6">
                                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <AdminBadge variant={statusVariant(article.status)}>{article.status}</AdminBadge>
                                                <span className="text-xs font-semibold text-slate-400">{getAuthorName(article)} · Update {formatArticleDate(article.updated_at)}</span>
                                            </div>
                                            <h2 className="mt-3 text-lg font-black text-slate-950 sm:text-xl">{article.title}</h2>
                                            <p className="mt-1 text-xs font-bold text-blue-600">/blog/{article.slug}</p>
                                            {article.excerpt ? <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-slate-600">{article.excerpt}</p> : null}
                                            {article.published_at ? <p className="mt-2 text-xs font-medium text-slate-400">Published {formatArticleDate(article.published_at)}</p> : null}
                                        </div>

                                        <div className="flex shrink-0 flex-wrap gap-2 xl:max-w-sm xl:justify-end">
                                            {article.status === 'published' ? <Link href={`/blog/${article.slug}`} target="_blank" rel="noopener noreferrer" className={adminSecondaryButtonClass}><Eye size={16}/>Lihat</Link> : null}
                                            {canEdit ? <Link href={`/admin/content/articles/${article.id}/edit`} className={adminSecondaryButtonClass}>Edit</Link> : null}
                                            <ArticleStatusActions articleId={article.id} status={article.status} canPublish={canPublishArticle(actor?.role)} canArchive={canArchive} canDelete={canManageAll && article.status !== 'published'}/>
                                        </div>
                                    </div>
                                </article>
                            )
                        })}
                    </div>
                ) : !error ? <AdminEmptyState title="Belum ada artikel" description="Buat draft pertama untuk mulai mengisi blog Siap Tempur." action={<Link href="/admin/content/articles/create" className={adminPrimaryButtonClass}><Plus size={16}/>Buat artikel</Link>}/> : null}
            </AdminCard>
        </div>
    )
}
