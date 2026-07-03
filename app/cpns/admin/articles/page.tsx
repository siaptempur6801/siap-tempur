import Link from 'next/link'
import { Eye, Plus } from 'lucide-react'
import { createAdminClient } from '@/lib/utils/supabase/server'
import { canPublishArticle, getCurrentUserRole, isAdminRole } from '@/lib/utils/admin'
import { formatArticleDate } from '@/lib/articles'
import ArticleStatusActions from '@/components/admin/ArticleStatusActions'

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

function statusClass(status: ArticleStatus) {
    if (status === 'published') return 'bg-green-100 text-green-800 border-green-700'
    if (status === 'archived') return 'bg-gray-100 text-gray-600 border-gray-500'
    return 'bg-yellow-100 text-yellow-800 border-yellow-700'
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

    if (!canManageAll && actor?.userId) {
        query = query.eq('author_id', actor.userId)
    }

    const { data: articles, error } = await query

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Admin Artikel</p>
                    <h1 className="font-handwriting text-4xl font-black text-gray-900">Kelola Artikel</h1>
                    <p className="mt-1 max-w-2xl text-sm font-medium text-gray-600">
                        Writer hanya bisa mengelola draft sendiri. Publish tetap dikunci untuk admin dan superadmin.
                    </p>
                </div>
                <Link
                    href="/cpns/admin/articles/create"
                    className="inline-flex w-fit items-center gap-2 rounded-md border-2 border-gray-900 bg-gray-900 px-5 py-3 font-black text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,0.25)] transition hover:-translate-y-0.5"
                >
                    <Plus size={18} />
                    Artikel Baru
                </Link>
            </div>

            {error && (
                <div className="border-2 border-red-700 bg-red-50 p-4 font-bold text-red-700">
                    Gagal memuat artikel: {error.message}
                </div>
            )}

            <div className="space-y-4">
                {(articles as Article[] | null)?.map((article) => {
                    const canEdit = canManageAll || (article.author_id === actor?.userId && article.status !== 'published')
                    const canArchive = canManageAll || (article.author_id === actor?.userId && article.status !== 'published')

                    return (
                        <article key={article.id} className="border-2 border-gray-900 bg-white p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <div className="min-w-0 flex-1">
                                    <div className="mb-3 flex flex-wrap items-center gap-2">
                                        <span className={`rounded-sm border px-2 py-1 text-xs font-black uppercase ${statusClass(article.status)}`}>
                                            {article.status}
                                        </span>
                                        <span className="text-xs font-bold text-gray-500">
                                            {getAuthorName(article)} | Update {formatArticleDate(article.updated_at)}
                                        </span>
                                    </div>
                                    <h2 className="font-handwriting text-2xl font-black text-gray-900">{article.title}</h2>
                                    <p className="mt-1 text-sm font-bold text-blue-600">/blog/{article.slug}</p>
                                    {article.excerpt && <p className="mt-3 max-w-3xl text-sm font-medium text-gray-600">{article.excerpt}</p>}
                                    {article.published_at && (
                                        <p className="mt-2 text-xs font-bold text-gray-400">Publish: {formatArticleDate(article.published_at)}</p>
                                    )}
                                </div>

                                <div className="flex flex-col gap-2 lg:min-w-48">
                                    {article.status === 'published' && (
                                        <Link
                                            href={`/blog/${article.slug}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center justify-center gap-2 rounded-md border-2 border-gray-900 bg-blue-600 px-3 py-2 text-center text-sm font-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition hover:-translate-y-0.5"
                                        >
                                            <Eye size={16} />
                                            Lihat Artikel
                                        </Link>
                                    )}
                                    {canEdit && (
                                        <Link
                                            href={`/cpns/admin/articles/${article.id}/edit`}
                                            className="rounded-md border-2 border-gray-900 bg-white px-3 py-2 text-center text-sm font-black text-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                        >
                                            Edit
                                        </Link>
                                    )}
                                    <ArticleStatusActions
                                        articleId={article.id}
                                        status={article.status}
                                        canPublish={canPublishArticle(actor?.role)}
                                        canArchive={canArchive}
                                        canDelete={canManageAll && article.status !== 'published'}
                                    />
                                </div>
                            </div>
                        </article>
                    )
                })}
            </div>

            {!error && (!articles || articles.length === 0) && (
                <div className="border-2 border-dashed border-gray-300 bg-white p-10 text-center">
                    <h2 className="font-handwriting text-3xl font-black text-gray-900">Belum ada artikel</h2>
                    <p className="mt-2 text-sm font-bold text-gray-500">Buat draft pertama untuk mulai mengisi blog Siap Tempur.</p>
                </div>
            )}
        </div>
    )
}
