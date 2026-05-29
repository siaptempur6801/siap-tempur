import { createAdminClient } from '@/lib/utils/supabase/server'
import { Plus, FileText } from 'lucide-react'
import Link from 'next/link'
import QuestionCard, { type Question } from '@/components/admin/QuestionCard'
import AdminSearch from '@/components/admin/AdminSearch'
import ExcelImportDialog from '@/components/admin/ExcelImportDialog'
import AdminOverview from '@/components/admin/AdminOverview'
import AdminPagination from '@/components/admin/AdminPagination'
import { buildActiveCategoryMap, buildCategoryMap, normalizeAdminFilters } from '@/lib/admin-dashboard'

type QuestionWithOptions = Question

export const dynamic = 'force-dynamic'

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
    const supabase = await createAdminClient()
    const filters = normalizeAdminFilters(await searchParams)
    let filteredCountQuery = supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('type', filters.category)

    if (filters.subCategory) {
        filteredCountQuery = filteredCountQuery.eq('sub_category', filters.subCategory)
    }

    if (filters.q) {
        filteredCountQuery = filteredCountQuery.or(`content.ilike.%${filters.q}%,question_code.ilike.%${filters.q}%`)
    }

    const [
        { count: filteredCount },
        { count: totalQuestionCount },
        { data: configs },
    ] = await Promise.all([
        filteredCountQuery,
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
    let questionsQuery = supabase
        .from('questions')
        .select('*, options(*)')
        .order('created_at', { ascending: false })
        .range(from, to)
        .eq('type', filters.category)

    if (filters.subCategory) {
        questionsQuery = questionsQuery.eq('sub_category', filters.subCategory)
    }

    if (filters.q) {
        questionsQuery = questionsQuery.or(`content.ilike.%${filters.q}%,question_code.ilike.%${filters.q}%`)
    }

    const { data: questions } = await questionsQuery
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
    const currentAdminHref = `/cpns/admin?${paginationParams.toString()}`

    return (
        <div className="space-y-8 pb-10">
            <div className="relative overflow-hidden border-2 border-gray-900 bg-white p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] md:flex md:items-center md:justify-between md:gap-4">
                <div className="pointer-events-none absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '10px 10px' }}></div>
                <div>
                    <p className="relative mb-2 inline-flex border-2 border-gray-900 bg-gray-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        Admin Console
                    </p>
                    <h1 className="relative font-handwriting text-4xl font-black text-gray-900">
                        Bank Soal
                    </h1>
                    <p className="relative mt-2 text-sm font-medium text-gray-600">
                        Kelola soal, import CSV, dan periksa materi aktif dari area admin.
                    </p>
                </div>
                <div className="relative mt-5 flex flex-wrap items-center gap-3 md:mt-0">
                    <ExcelImportDialog />
                    <Link
                        href={`/cpns/admin/create?returnTo=${encodeURIComponent(currentAdminHref)}`}
                        className="inline-flex items-center gap-2 rounded-md border-2 border-gray-900 bg-gray-900 px-4 py-3 font-bold text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,0.25)] transition hover:-translate-y-0.5"
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
                        editHref={`/cpns/admin/edit/${q.id}?returnTo=${encodeURIComponent(currentAdminHref)}`}
                    />
                ))}

                {(!questions || questions.length === 0) && (
                    <div className="border-2 border-dashed border-gray-900 bg-white py-20 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,0.12)]">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center border-2 border-gray-900 bg-gray-100">
                            <FileText className="h-8 w-8 text-gray-500" />
                        </div>
                        <h3 className="font-handwriting text-2xl font-black text-gray-900">Tidak ada soal ditemukan</h3>
                        <p className="mb-6 text-gray-500">Coba ubah filter atau buat soal baru.</p>
                        <Link
                            href={`/cpns/admin/create?returnTo=${encodeURIComponent(currentAdminHref)}`}
                            className="inline-flex items-center gap-2 rounded-md border-2 border-gray-900 bg-gray-900 px-4 py-2 font-bold text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,0.25)] transition hover:-translate-y-0.5"
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
