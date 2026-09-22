import Link from 'next/link'
import { Eye, Plus } from 'lucide-react'
import { createClient } from '@/lib/utils/supabase/server'
import { formatArticleDate } from '@/lib/articles'
import { PERMISSIONS } from '@/src/auth/permissions'
import { authorizationService } from '@/src/services/authorization.service'
import { ADMIN_PAGE_SIZE, adminPageSummary, adminPageSummaryLabel, parseAdminPage } from '@/lib/admin-pagination'
import ArticleStatusActions from '@/components/admin/ArticleStatusActions'
import AdminListToolbar from '@/components/admin/AdminListToolbar'
import AdminPagination from '@/components/admin/AdminPagination'
import {
    AdminCard,
    AdminEmptyState,
    AdminPage,
    AdminPageHeader,
    AdminStatusBadge,
    adminPrimaryButtonClass,
    adminSecondaryButtonClass,
} from '@/components/admin/AdminUi'
import { adminStatusLabel } from '@/lib/admin-format'

export const dynamic = 'force-dynamic'

/**
 * Articles.
 *
 * Sebelum S11 halaman ini adalah satu-satunya permukaan admin yang masih memakai
 * stack V1: `getCurrentUserRole()` (adapter transisional) + klien lama, query
 * TANPA batas sama sekali, tanpa pencarian, tanpa paginasi, dan badge status
 * mentah (`draft` alih-alih "Draf"). Untuk blog yang tumbuh, "tanpa batas" itu
 * berarti setiap kunjungan memuat seluruh artikel beserta penulisnya.
 *
 * Aturan visibilitas dipertahankan persis: editor hanya melihat artikelnya
 * sendiri, reviewer/pemegang `content.publish` melihat semuanya.
 */

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
}

type SearchParams = {
    q?: string
    status?: string
    page?: string
}

const STATUS_OPTIONS = ['draft', 'published', 'archived'] as const

export default async function AdminArticlesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
    const params = await searchParams
    const authorization = await authorizationService.requireAuthenticated()
    const permissions = new Set(authorization.permissions)

    const canCreate = permissions.has(PERMISSIONS.CONTENT_CREATE)
    const canUpdate = permissions.has(PERMISSIONS.CONTENT_UPDATE)
    const canPublish = permissions.has(PERMISSIONS.CONTENT_PUBLISH)
    const canReviewAll = permissions.has(PERMISSIONS.CONTENT_REVIEW) || canPublish
    // `admin.access` adalah pengganti peran ADMIN yang dulu dibaca dari
    // `profiles.role` — kolom itu sudah tidak ada di Schema V2.
    const isAdmin = permissions.has(PERMISSIONS.ADMIN_ACCESS)
    const canReadAll = isAdmin || canReviewAll

    const page = parseAdminPage(params.page)
    const search = (params.q || '').trim()
    const status = (params.status || '').trim()

    const supabase = await createClient()
    let query = supabase
        .from('articles')
        .select('id, title, slug, excerpt, status, author_id, published_at, updated_at', { count: 'exact' })
        .order('updated_at', { ascending: false })

    // Editor fokus pada artikelnya sendiri; reviewer melihat seluruh draft.
    if (!canReadAll) query = query.eq('author_id', authorization.userId)
    if (status) query = query.eq('status', status)
    if (search) query = query.or(`title.ilike.%${escapePostgrestValue(search)}%,slug.ilike.%${escapePostgrestValue(search)}%`)

    const from = (page - 1) * ADMIN_PAGE_SIZE
    const { data, count, error } = await query.range(from, from + ADMIN_PAGE_SIZE - 1)
    const rows = (data as Article[] | null) ?? []
    const total = count ?? 0
    const outOfRange = total > 0 && from >= total
    const summary = adminPageSummary(outOfRange ? Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)) : page, rows.length, total)

    // Nama penulis diambil sekali untuk baris yang tampil. Sebelumnya memakai
    // embedding `profiles(full_name)` per baris; dengan paginasi, satu query
    // untuk 25 id jauh lebih murah daripada 25 join.
    const authorIds = [...new Set(rows.map((row) => row.author_id).filter((id): id is string => Boolean(id)))]
    const authorById = new Map<string, string>()
    if (authorIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', authorIds)
        for (const profile of profiles ?? []) {
            authorById.set(String(profile.id), String(profile.full_name ?? ''))
        }
    }

    const filters = { q: search, status }
    const hasFilter = Boolean(search || status)

    return (
        <AdminPage>
            <AdminPageHeader
                title="Articles"
                description="Kelola draft, publikasi, dan arsip artikel sesuai permission konten. Editor fokus pada artikelnya sendiri; reviewer dapat membaca draft yang perlu dipublikasikan."
                action={canCreate ? <Link href="/admin/content/articles/create" className={adminPrimaryButtonClass}><Plus size={16}/>Artikel baru</Link> : undefined}
            />

            {error ? (
                <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
                    Gagal memuat artikel: {error.message}
                </div>
            ) : null}

            <AdminListToolbar
                pathname="/admin/content/articles"
                search={search}
                status={status}
                statusOptions={STATUS_OPTIONS.map((option) => ({ value: option, label: adminStatusLabel(option) }))}
                placeholder="Cari judul atau slug artikel…"
                resultCount={total}
                contextHidden={false}
            />

            <AdminCard className="overflow-hidden">
                <div className="border-b border-slate-200 p-5">
                    <h2 className="text-base font-black text-slate-950">Daftar artikel</h2>
                    <p className="mt-0.5 text-sm font-medium text-slate-500">{adminPageSummaryLabel(summary, 'artikel')}</p>
                </div>

                {rows.length ? (
                    <div className="divide-y divide-slate-100">
                        {rows.map((article) => {
                            const ownsEditableDraft = article.author_id === authorization.userId && article.status !== 'published'
                            const canEdit = canUpdate && (isAdmin || ownsEditableDraft)
                            const canArchive = canUpdate && (isAdmin || ownsEditableDraft)
                            return (
                                <article key={article.id} className="p-5 transition hover:bg-slate-50/70 sm:p-6">
                                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <AdminStatusBadge status={article.status}/>
                                                <span className="text-xs font-semibold text-slate-500">{(article.author_id && authorById.get(article.author_id)) || 'Penulis'} · Diperbarui {formatArticleDate(article.updated_at)}</span>
                                            </div>
                                            <h3 className="mt-3 text-lg font-black text-slate-950 sm:text-xl">{article.title}</h3>
                                            <p className="mt-1 text-xs font-bold text-blue-600">/blog/{article.slug}</p>
                                            {article.excerpt ? <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-slate-600">{article.excerpt}</p> : null}
                                            {article.published_at ? <p className="mt-2 text-xs font-medium text-slate-500">Terbit {formatArticleDate(article.published_at)}</p> : null}
                                        </div>

                                        <div className="flex shrink-0 flex-wrap gap-2 xl:max-w-sm xl:justify-end">
                                            {article.status === 'published' ? <Link href={`/blog/${article.slug}`} target="_blank" rel="noopener noreferrer" className={adminSecondaryButtonClass}><Eye size={16}/>Lihat</Link> : null}
                                            {canEdit ? <Link href={`/admin/content/articles/${article.id}/edit`} className={adminSecondaryButtonClass}>Ubah</Link> : null}
                                            <ArticleStatusActions articleId={article.id} status={article.status} canPublish={canPublish} canArchive={canArchive} canDelete={isAdmin && article.status !== 'published'}/>
                                        </div>
                                    </div>
                                </article>
                            )
                        })}
                    </div>
                ) : error ? null : outOfRange ? (
                    <AdminEmptyState
                        title="Tidak ada artikel di halaman ini"
                        description={`Daftar hanya punya ${summary.totalPages} halaman. Nomor halaman di alamat mungkin sudah usang.`}
                        action={<Link className={adminSecondaryButtonClass} href={`/admin/content/articles?page=${summary.totalPages}${status ? `&status=${status}` : ''}`}>Ke halaman {summary.totalPages}</Link>}
                    />
                ) : (
                    <AdminEmptyState
                        title={hasFilter ? 'Tidak ada artikel yang cocok' : 'Belum ada artikel'}
                        description={hasFilter
                            ? 'Tidak ada artikel yang cocok dengan filter ini. Coba ubah kata kunci atau status.'
                            : canCreate
                                ? 'Buat draft pertama untuk mulai mengisi blog Siap Tempur.'
                                : 'Belum ada artikel yang dapat diakses oleh akun ini.'}
                        action={!hasFilter && canCreate ? <Link href="/admin/content/articles/create" className={adminPrimaryButtonClass}><Plus size={16}/>Buat artikel</Link> : undefined}
                    />
                )}

                {summary.total > 0 && (rows.length > 0 || outOfRange) ? (
                    <AdminPagination pathname="/admin/content/articles" params={filters} summary={summary} noun="artikel"/>
                ) : null}
            </AdminCard>
        </AdminPage>
    )
}

/**
 * Membersihkan nilai pencarian sebelum masuk ekspresi `or` PostgREST.
 *
 * Koma dan tanda kurung adalah pemisah kondisi di `or=(...)`, jadi nilai yang
 * memuatnya bisa mengubah bentuk filter — bukan sekadar gagal.
 */
function escapePostgrestValue(value: string) {
    return value.replace(/[,()*%\\]/g, ' ').trim()
}
