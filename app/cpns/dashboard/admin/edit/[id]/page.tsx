import { createClient } from '@/utils/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import EditQuestionForm from '@/components/admin/EditQuestionForm'

export const dynamic = 'force-dynamic'

export default async function EditQuestionPage({ params }: { params: Promise<{ id: string }> }) {
    const supabase = await createClient()

    // In Next.js 15/16, params is a Promise
    const { id } = await params

    const { data: question } = await supabase
        .from('questions')
        .select('*, options(*)')
        .eq('id', id)
        .single()

    if (!question) {
        notFound()
    }

    return (
        <div className="w-full pb-10">
            <Link href="/cpns/dashboard/admin" className="inline-flex items-center text-gray-500 hover:text-gray-900 mb-6">
                <ArrowLeft size={18} className="mr-2" /> Kembali ke Manager
            </Link>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
                    <h1 className="font-bold text-2xl text-gray-900">Edit Soal</h1>
                    <div className="text-sm text-gray-500">
                        ID: {question.id}
                    </div>
                </div>

                <EditQuestionForm question={question} />
            </div>
        </div>
    )
}
