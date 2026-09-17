import Link from 'next/link'
import { ADMIN_BASE_PATH } from '@/lib/admin-dashboard'

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
    return `${ADMIN_BASE_PATH}?${params.toString()}`
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
        <div className="flex flex-col gap-3 border-2 border-gray-900 bg-white p-4 st-shadow-md sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-bold text-gray-600">
                Menampilkan {startItem}-{endItem} dari {totalItems} soal
            </p>

            <div className="flex items-center gap-2">
                <Link
                    href={buildPageHref(baseParams, currentPage - 1)}
                    aria-disabled={currentPage <= 1}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                        currentPage <= 1
                            ? 'pointer-events-none border-2 border-gray-200 bg-gray-100 text-gray-400'
                            : 'border-2 border-gray-900 bg-white text-gray-900 st-shadow-sm hover:-translate-y-0.5'
                    }`}
                >
                    Sebelumnya
                </Link>

                <span className="text-sm font-bold text-gray-600">
                    Halaman {currentPage} / {totalPages}
                </span>

                <Link
                    href={buildPageHref(baseParams, currentPage + 1)}
                    aria-disabled={currentPage >= totalPages}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                        currentPage >= totalPages
                            ? 'pointer-events-none border-2 border-gray-200 bg-gray-100 text-gray-400'
                            : 'border-2 border-gray-900 bg-white text-gray-900 st-shadow-sm hover:-translate-y-0.5'
                    }`}
                >
                    Berikutnya
                </Link>
            </div>
        </div>
    )
}
