import { createClient } from '@/utils/supabase/server'
import { Plus, FileText, Settings } from 'lucide-react'
import Link from 'next/link'
import QuestionCard, { type Question } from '@/components/admin/QuestionCard'
import AdminSearch from '@/components/admin/AdminSearch'
import ExcelImportDialog from '@/components/admin/ExcelImportDialog'
import AdminOverview from '@/components/admin/AdminOverview'
import AdminPagination from '@/components/admin/AdminPagination'
import { buildActiveCategoryMap, buildCategoryMap, normalizeAdminFilters } from '@/lib/admin-dashboard'

type QuestionWithOptions = Question

export const dynamic = 'force-dynamic'

type FilterableQuery = {
    eq: (column: string, value: string) => FilterableQuery
    or: (filters: string) => FilterableQuery
}

export default async function AdminDashboard({
    searchParams,
}: {
    searchParams: Promise<{
        q?: string
        category?: string
        sub_category?: string
        page?: string
        page_size?: string
    }>
}) {
    const supabase = await createClient()
    const filters = normalizeAdminFilters(await searchParams)

    const applyQuestionFilters = (query: FilterableQuery) => {
        let nextQuery = query

        nextQuery = nextQuery.eq('type', filters.category)

        if (filters.subCategory) {
            nextQuery = nextQuery.eq('sub_category', filters.subCategory)
        }

        if (filters.q) {
            nextQuery = nextQuery.or(`content.ilike.%${filters.q}%,question_code.ilike.%${filters.q}%`)
        }

        return nextQuery
    }

    const [
        { count: filteredCount },
        { count: totalQuestionCount },
        { data: configs },
    ] = await Promise.all([
        applyQuestionFilters(
            supabase.from('questions').select('*', { count: 'exact', head: true })
        ),
        supabase.from('questions').select('*', { count: 'exact', head: true }),
        supabase
            .from('tryout_configurations')
            .select('type, sub_category, is_active')
            .order('sort_order', { ascending: true }),
    ])

    const allCategories = buildCategoryMap(configs || [])
    const activeCategories = buildActiveCategoryMap(configs || [])
    const selectedTypeCategories = allCategories[filters.category] || []
    const selectedTypeActiveCategories = activeCategories[filters.category] || []
    const totalPages = Math.max(1, Math.ceil((filteredCount || 0) / filters.pageSize))
    const currentPage = Math.min(filters.page, totalPages)
    const from = (currentPage - 1) * filters.pageSize
    const to = from + filters.pageSize - 1
    const { data: questions } = await applyQuestionFilters(
        supabase
            .from('questions')
            .select('*, options(*)')
            .order('created_at', { ascending: false })
            .range(from, to)
    )
    const paginationParams = new URLSearchParams()

    paginationParams.set('category', filters.category)
    paginationParams.set('page_size', String(filters.pageSize))

    if (filters.q) {
        paginationParams.set('q', filters.q)
    }

    if (filters.subCategory) {
        paginationParams.set('sub_category', filters.subCategory)
    }

    paginationParams.set('page', String(currentPage))
    const currentAdminHref = `/cpns/dashboard/admin?${paginationParams.toString()}`

    return (
        <div className="space-y-8 pb-10">
            <div className="flex flex-col gap-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">
                        Dashboard Admin Bank Soal
                    </h1>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                        <p className="text-sm text-slate-600">
                            Kelola soal, materi aktif, dan struktur tryout dari satu alur kerja.
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Link
                        href="/cpns/dashboard/admin/tryout-config"
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                        <Settings size={20} /> Konfigurasi Tryout
                    </Link>
                    <ExcelImportDialog />
                    <Link
                        href={`/cpns/dashboard/admin/create?returnTo=${encodeURIComponent(currentAdminHref)}`}
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-800"
                    >
                        <Plus size={20} /> Buat Soal Baru
                    </Link>
                </div>
            </div>

            <AdminOverview
                totalQuestions={totalQuestionCount || 0}
                filteredQuestions={filteredCount || 0}
                activeCategories={selectedTypeActiveCategories.length}
                totalCategories={selectedTypeCategories.length}
                selectedType={filters.category}
            />

            <AdminSearch categoryMap={allCategories} />

            <div className="grid grid-cols-1 gap-4">
                {questions?.map((q) => (
                    <QuestionCard
                        key={q.id}
                        q={q as QuestionWithOptions}
                        editHref={`/cpns/dashboard/admin/edit/${q.id}?returnTo=${encodeURIComponent(currentAdminHref)}`}
                    />
                ))}

                {(!questions || questions.length === 0) && (
                    <div className="rounded-3xl border border-dashed border-slate-300 bg-white py-20 text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                            <FileText className="h-8 w-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">Tidak ada soal ditemukan</h3>
                        <p className="mb-6 text-slate-500">Coba ubah filter atau buat soal baru.</p>
                        <Link
                            href={`/cpns/dashboard/admin/create?returnTo=${encodeURIComponent(currentAdminHref)}`}
                            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700"
                        >
                            <Plus size={18} /> Buat Soal Baru
                        </Link>
                    </div>
                )}
            </div>

            <AdminPagination
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={filters.pageSize}
                totalItems={filteredCount || 0}
                baseParams={paginationParams}
            />
        </div>
    )
}
