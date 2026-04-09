import Link from 'next/link'

interface AdminPaginationProps {
    currentPage: number
    totalPages: number
    pageSize: number
    totalItems: number
    baseParams: URLSearchParams
}

function buildPageHref(baseParams: URLSearchParams, page: number) {
    const params = new URLSearchParams(baseParams)
    params.set('page', String(page))
    return `/cpns/dashboard/admin?${params.toString()}`
}

export default function AdminPagination({
    currentPage,
    totalPages,
    pageSize,
    totalItems,
    baseParams,
}: AdminPaginationProps) {
    if (totalItems === 0 || totalPages <= 1) {
        return null
    }

    const startItem = (currentPage - 1) * pageSize + 1
    const endItem = Math.min(currentPage * pageSize, totalItems)

    return (
        <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">
                Menampilkan {startItem}-{endItem} dari {totalItems} soal
            </p>

            <div className="flex items-center gap-2">
                <Link
                    href={buildPageHref(baseParams, currentPage - 1)}
                    aria-disabled={currentPage <= 1}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                        currentPage <= 1
                            ? 'pointer-events-none border border-slate-200 bg-slate-100 text-slate-400'
                            : 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                >
                    Sebelumnya
                </Link>

                <span className="text-sm font-medium text-slate-600">
                    Halaman {currentPage} / {totalPages}
                </span>

                <Link
                    href={buildPageHref(baseParams, currentPage + 1)}
                    aria-disabled={currentPage >= totalPages}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                        currentPage >= totalPages
                            ? 'pointer-events-none border border-slate-200 bg-slate-100 text-slate-400'
                            : 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                >
                    Berikutnya
                </Link>
            </div>
        </div>
    )
}
