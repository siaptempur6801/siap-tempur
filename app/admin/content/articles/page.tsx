import AdminPagination from '@/components/admin/AdminPagination'
import AdminTableToolbar from '@/components/admin/AdminTableToolbar'
import {
  AdminCard,
  AdminEmptyState,
  AdminPage,
  AdminPageHeader,
  AdminRowActions,
  AdminStatusBadge,
  AdminTh,
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
  adminTableActionClass,
  adminTableHeadClass,
} from '@/components/admin/AdminUi'
import ArticleStatusActions from '@/components/admin/ArticleStatusActions'
import { AdminDataTable } from '@/components/admin/data-display/AdminDataTable'
import { AdminErrorState } from '@/components/admin/feedback/AdminErrorState'
import { AdminBreadcrumbs } from '@/components/admin/navigation/AdminBreadcrumbs'
import { adminStatusLabel } from '@/lib/admin-format'
import {
  ADMIN_PAGE_SIZE,
  adminPageSummary,
  adminPageSummaryLabel,
  parseAdminPage,
} from '@/lib/admin-pagination'
import { formatArticleDate } from '@/lib/articles'
import { createClient } from '@/lib/utils/supabase/server'
import { PERMISSIONS } from '@/src/auth/permissions'
import { authorizationService } from '@/src/services/authorization.service'
import { Plus } from 'lucide-react'
import Link from '@/components/admin/navigation/AdminLink'

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
  category: string | null
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

export default async function AdminArticlesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
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
    .select('id, title, slug, category, excerpt, status, author_id, published_at, updated_at', {
      count: 'exact',
    })
    .order('updated_at', { ascending: false })

  // Editor fokus pada artikelnya sendiri; reviewer melihat seluruh draft.
  if (!canReadAll) query = query.eq('author_id', authorization.userId)
  if (status) query = query.eq('status', status)
  if (search)
    query = query.or(
      `title.ilike.%${escapePostgrestValue(search)}%,slug.ilike.%${escapePostgrestValue(search)}%`,
    )

  const from = (page - 1) * ADMIN_PAGE_SIZE
  const { data, count, error } = await query.range(from, from + ADMIN_PAGE_SIZE - 1)
  const rows = (data as Article[] | null) ?? []
  const total = count ?? 0
  const outOfRange = total > 0 && from >= total
  const summary = adminPageSummary(
    outOfRange ? Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)) : page,
    rows.length,
    total,
  )

  // Nama penulis diambil sekali untuk baris yang tampil. Sebelumnya memakai
  // embedding `profiles(full_name)` per baris; dengan paginasi, satu query
  // untuk 25 id jauh lebih murah daripada 25 join.
  const authorIds = [
    ...new Set(rows.map((row) => row.author_id).filter((id): id is string => Boolean(id))),
  ]
  const authorById = new Map<string, string>()
  if (authorIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', authorIds)
    for (const profile of profiles ?? []) {
      authorById.set(String(profile.id), String(profile.full_name ?? ''))
    }
  }

  const filters = { q: search, status }
  const hasFilter = Boolean(search || status)

  return (
    <AdminPage>
      <AdminBreadcrumbs items={[{ label: 'Content' }, { label: 'Articles' }]} />
      <AdminPageHeader
        title="Articles"
        description="Kelola artikel, publikasi, dan arsip konten."
        action={
          canCreate ? (
            <Link
              href={`/admin/content/articles/new?${new URLSearchParams({ returnTo: `/admin/content/articles?${new URLSearchParams(filters)}` })}`}
              className={adminPrimaryButtonClass}
            >
              <Plus size={16} />
              Artikel baru
            </Link>
          ) : undefined
        }
      />

      {error ? <AdminErrorState noun="artikel" retryHref="/admin/content/articles" /> : null}

      <AdminTableToolbar
        pathname="/admin/content/articles"
        search={search}
        status={status}
        statusOptions={STATUS_OPTIONS.map((option) => ({
          value: option,
          label: adminStatusLabel(option),
        }))}
        placeholder="Cari judul atau slug artikel…"
        resultCount={total}
        contextHidden={false}
      />

      <AdminCard className="overflow-hidden">
        <div className="border-b border-border p-5">
          <h2 className="text-base font-semibold text-foreground">Daftar artikel</h2>
          <p className="mt-0.5 text-sm font-medium text-muted-foreground">
            {adminPageSummaryLabel(summary, 'artikel')}
          </p>
        </div>

        {rows.length ? (
          <AdminDataTable caption="Artikel" className="min-w-[850px]">
            <thead className={adminTableHeadClass}>
              <tr>
                {['Judul', 'Kategori', 'Status', 'Penulis / Editor', 'Diperbarui', 'Tindakan'].map(
                  (h) => (
                    <AdminTh key={h}>{h}</AdminTh>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((article) => {
                const ownsEditableDraft =
                  article.author_id === authorization.userId && article.status !== 'published'
                const canEdit = canUpdate && (isAdmin || ownsEditableDraft),
                  canArchive = canEdit
                return (
                  <tr key={article.id}>
                    <td className="max-w-md">
                      <p className="font-medium">{article.title}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        /blog/{article.slug}
                      </p>
                    </td>
                    <td>{article.category || 'Tanpa kategori'}</td>
                    <td>
                      <AdminStatusBadge status={article.status} />
                    </td>
                    <td>{(article.author_id && authorById.get(article.author_id)) || 'Penulis'}</td>
                    <td className="whitespace-nowrap text-xs">
                      {formatArticleDate(article.updated_at)}
                    </td>
                    <td>
                      <AdminRowActions>
                        {canEdit ? (
                          <Link
                            href={`/admin/content/articles/${article.id}/edit?${new URLSearchParams({ returnTo: `/admin/content/articles?${new URLSearchParams(filters)}` })}`}
                            className={adminTableActionClass}
                          >
                            Ubah
                          </Link>
                        ) : null}
                        <ArticleStatusActions
                          articleId={article.id}
                          title={article.title}
                          previewHref={
                            article.status === 'published' ? `/blog/${article.slug}` : undefined
                          }
                          status={article.status}
                          canPublish={canPublish}
                          canArchive={canArchive}
                          canDelete={isAdmin && article.status !== 'published'}
                        />
                      </AdminRowActions>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </AdminDataTable>
        ) : error ? null : outOfRange ? (
          <AdminEmptyState
            title="Tidak ada artikel di halaman ini"
            description={`Daftar hanya punya ${summary.totalPages} halaman. Nomor halaman di alamat mungkin sudah usang.`}
            action={
              <Link
                className={adminSecondaryButtonClass}
                href={`/admin/content/articles?page=${summary.totalPages}${status ? `&status=${status}` : ''}`}
              >
                Ke halaman {summary.totalPages}
              </Link>
            }
          />
        ) : (
          <AdminEmptyState
            title={hasFilter ? 'Tidak ada artikel yang cocok' : 'Belum ada artikel'}
            description={
              hasFilter
                ? 'Tidak ada artikel yang cocok dengan filter ini. Coba ubah kata kunci atau status.'
                : canCreate
                  ? 'Buat draft pertama untuk mulai mengisi blog Siap Tempur.'
                  : 'Belum ada artikel yang dapat diakses oleh akun ini.'
            }
            action={
              !hasFilter && canCreate ? (
                <Link
                  href={`/admin/content/articles/new?${new URLSearchParams({ returnTo: `/admin/content/articles?${new URLSearchParams(filters)}` })}`}
                  className={adminPrimaryButtonClass}
                >
                  <Plus size={16} />
                  Buat artikel
                </Link>
              ) : undefined
            }
          />
        )}

        {summary.total > 0 && (rows.length > 0 || outOfRange) ? (
          <AdminPagination
            pathname="/admin/content/articles"
            params={filters}
            summary={summary}
            noun="artikel"
          />
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
