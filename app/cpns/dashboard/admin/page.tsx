import { createClient } from '@/utils/supabase/server'
import { Plus, FileText, Settings } from 'lucide-react'
import Link from 'next/link'
import QuestionCard from '@/components/admin/QuestionCard'
import AdminSearch from '@/components/admin/AdminSearch'
import ExcelImport from '@/components/admin/ExcelImport'

export const dynamic = 'force-dynamic'

export default async function AdminDashboard({
    searchParams,
}: {
    searchParams: Promise<{
        q?: string
        category?: string
        sub_category?: string
    }>
}) {
    const supabase = await createClient()
    const params = await searchParams
    const query = params?.q || ''
    const category = params?.category || 'TWK'
    const subCategory = params?.sub_category || ''

    // Construct Query with JOIN to options
    let dbQuery = supabase
        .from('questions')
        .select('*, options(*)', { count: 'exact' })
        .order('created_at', { ascending: false })

    if (category) {
        // Here 'category' filter in UI corresponds to 'type' in DB
        dbQuery = dbQuery.eq('type', category)
    }

    if (subCategory) {
        dbQuery = dbQuery.eq('sub_category', subCategory)
    }

    if (query) {
        dbQuery = dbQuery.ilike('content', `%${query}%`)
    }

    const { data: questions, count } = await dbQuery.limit(100)

    return (
        <div className="space-y-8 pb-10">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div>
                    <h1 className="font-handwriting text-3xl font-bold text-gray-900 rotate-[-1deg] inline-block">
                        Bank Soal Manager
                    </h1>
                    <div className="flex items-center gap-3 mt-1">
                        <p className="text-gray-600 font-medium">
                            Kelola soal-soal latihan CPNS & Kedinasan.
                        </p>
                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-black border border-blue-200">
                            Total: {count || 0} Soal
                        </span>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Link
                        href="/cpns/dashboard/admin/tryout-config"
                        className="flex items-center gap-2 bg-blue-100 text-blue-700 px-5 py-3 rounded-lg hover:bg-blue-200 transition font-bold shadow-sm transform hover:-translate-y-1 active:translate-y-0 border border-blue-200"
                    >
                        <Settings size={20} /> Konfigurasi Tryout
                    </Link>
                    <ExcelImport />
                    <Link
                        href="/cpns/dashboard/admin/create"
                        className="flex items-center gap-2 bg-gray-900 text-white px-5 py-3 rounded-lg hover:bg-gray-800 transition font-bold shadow-lg transform hover:-translate-y-1 active:translate-y-0"
                    >
                        <Plus size={20} /> Buat Soal Baru
                    </Link>
                </div>
            </div>

            {/* Filter / Search Bar */}
            <AdminSearch />

            {/* Question List Grid */}
            <div className="grid grid-cols-1 gap-4">
                {questions?.map((q) => (
                    <QuestionCard key={q.id} q={q as any} />
                ))}

                {(!questions || questions.length === 0) && (
                    <div className="text-center py-20 bg-white rounded-xl border-2 border-dashed border-gray-300">
                        <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FileText className="h-8 w-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">Tidak ada soal ditemukan</h3>
                        <p className="text-gray-500 mb-6">Coba ubah filter atau buat soal baru.</p>
                        <Link
                            href="/cpns/dashboard/admin/create"
                            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-bold transition"
                        >
                            <Plus size={18} /> Buat Soal Baru
                        </Link>
                    </div>
                )}
            </div>
        </div>
    )
}
