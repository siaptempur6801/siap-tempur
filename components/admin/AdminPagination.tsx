import { adminSecondaryButtonClass } from '@/components/admin/AdminUi'
import { adminPageHref, adminPageSummaryLabel, type AdminPageSummary } from '@/lib/admin-pagination'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from '@/components/admin/navigation/AdminLink'

/**
 * Pager daftar admin.
 *
 * Semua daftar sebelumnya memuat satu jendela tetap dan diam tentang sisanya.
 * Komponen ini menampilkan posisi halaman secara eksplisit, dan — lewat
 * `adminPageSummaryLabel` — menyatakan "ini baru sepotong" alih-alih membiarkan
 * admin mengira sudah melihat semuanya.
 *
 * Pager sengaja tidak dirender bila hanya ada satu halaman: kontrol yang tidak
 * bisa dipakai lebih baik tidak ditampilkan (`docs/ADMIN_UI_UX_STANDARD.md` §8).
 */
export default function AdminPagination({
  pathname,
  params,
  summary,
  noun = 'data',
  plural,
  className,
  pageKey = 'page',
}: {
  pathname: string
  pageKey?: string
  /** Filter aktif yang harus dipertahankan saat berpindah halaman. */
  params: Record<string, string | undefined>
  summary: AdminPageSummary
  noun?: string
  /** Bentuk jamak untuk label; jatuh ke `noun` bila tidak diisi. */
  plural?: string
  className?: string
}) {
  const { page, totalPages } = summary
  const label = plural ?? noun
  const href = (nextPage: number) => {
    if (pageKey === 'page') return adminPageHref(pathname, params, nextPage)
    const q = new URLSearchParams(
      Object.entries(params).filter((entry): entry is [string, string] => Boolean(entry[1])),
    )
    if (nextPage > 1) q.set(pageKey, String(nextPage))
    else q.delete(pageKey)
    return `${pathname}?${q}`
  }
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 border-t border-border p-4',
        className,
      )}
    >
      <p className="text-xs font-medium text-muted-foreground">
        {adminPageSummaryLabel(summary, noun, label)}
      </p>

      {totalPages > 1 ? (
        <nav className="flex items-center gap-2" aria-label={`Navigasi halaman ${noun}`}>
          {page > 1 ? (
            <Link
              className={cn(adminSecondaryButtonClass, 'px-2.5 text-xs')}
              href={href(page - 1)}
              rel="prev"
              aria-label={`Halaman sebelumnya dari ${totalPages}`}
            >
              <ChevronLeft size={14} /> Sebelumnya
            </Link>
          ) : (
            <span
              className={cn(
                adminSecondaryButtonClass,
                'min-h-9 cursor-not-allowed bg-muted px-3 text-xs text-muted-foreground',
              )}
              aria-hidden="true"
            >
              <ChevronLeft size={14} /> Sebelumnya
            </span>
          )}

          <span className="px-1 text-xs font-semibold text-muted-foreground" aria-live="polite">
            {page} / {totalPages}
          </span>

          {page < totalPages ? (
            <Link
              className={cn(adminSecondaryButtonClass, 'px-2.5 text-xs')}
              href={href(page + 1)}
              rel="next"
              aria-label={`Halaman berikutnya dari ${totalPages}`}
            >
              Berikutnya <ChevronRight size={14} />
            </Link>
          ) : (
            <span
              className={cn(
                adminSecondaryButtonClass,
                'min-h-9 cursor-not-allowed bg-muted px-3 text-xs text-muted-foreground',
              )}
              aria-hidden="true"
            >
              Berikutnya <ChevronRight size={14} />
            </span>
          )}
        </nav>
      ) : null}
    </div>
  )
}
