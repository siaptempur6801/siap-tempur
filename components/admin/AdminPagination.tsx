import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ADMIN_PAGE_SIZE, adminPageHref, adminPageSummaryLabel, type AdminPageSummary } from '@/lib/admin-pagination'
import { adminSecondaryButtonClass } from '@/components/admin/AdminUi'
import { cn } from '@/lib/utils'

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
}: {
    pathname: string
    /** Filter aktif yang harus dipertahankan saat berpindah halaman. */
    params: Record<string, string | undefined>
    summary: AdminPageSummary
    noun?: string
    /** Bentuk jamak untuk label; jatuh ke `noun` bila tidak diisi. */
    plural?: string
    className?: string
}) {
    const { page, totalPages, total } = summary
    const label = (plural ?? noun)
    return (
        <div className={cn('flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-4', className)}>
            <p className="text-xs font-bold text-slate-500">{adminPageSummaryLabel(summary, noun, label)}</p>

            {totalPages > 1 ? (
                <nav className="flex items-center gap-2" aria-label={`Navigasi halaman ${noun}`}>
                    {page > 1 ? (
                        <Link
                            className={cn(adminSecondaryButtonClass, 'min-h-9 px-3 text-xs')}
                            href={adminPageHref(pathname, params, page - 1)}
                            rel="prev"
                            aria-label={`Halaman sebelumnya dari ${totalPages}`}
                        >
                            <ChevronLeft size={14}/> Sebelumnya
                        </Link>
                    ) : (
                        <span className={cn(adminSecondaryButtonClass, 'min-h-9 cursor-not-allowed px-3 text-xs opacity-40')} aria-hidden="true">
                            <ChevronLeft size={14}/> Sebelumnya
                        </span>
                    )}

                    <span className="px-1 text-xs font-black text-slate-600" aria-live="polite">
                        {page} / {totalPages}
                    </span>

                    {page < totalPages ? (
                        <Link
                            className={cn(adminSecondaryButtonClass, 'min-h-9 px-3 text-xs')}
                            href={adminPageHref(pathname, params, page + 1)}
                            rel="next"
                            aria-label={`Halaman berikutnya dari ${totalPages}`}
                        >
                            Berikutnya <ChevronRight size={14}/>
                        </Link>
                    ) : (
                        <span className={cn(adminSecondaryButtonClass, 'min-h-9 cursor-not-allowed px-3 text-xs opacity-40')} aria-hidden="true">
                            Berikutnya <ChevronRight size={14}/>
                        </span>
                    )}
                </nav>
            ) : (
                <span className="text-xs font-bold text-slate-400">{total} {noun}</span>
            )}
        </div>
    )
}

export { ADMIN_PAGE_SIZE }
