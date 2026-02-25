import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { isAdmin } from '@/utils/admin'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import TryoutConfigClient from '@/components/admin/TryoutConfigClient'

export default async function TryoutConfigPage() {
    const isUserAdmin = await isAdmin();
    if (!isUserAdmin) {
        redirect('/dashboard');
    }

    const supabase = await createClient()

    // Fetch configurations ordered by sort_order
    const { data: configs, error } = await supabase
        .from('tryout_configurations')
        .select('*')
        .order('sort_order', { ascending: true })

    if (error) {
        console.error("Error fetching tryout configurations:", error)
        return <div className="p-8 text-center text-red-500 font-bold">Gagal memuat data konfigurasi</div>
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
                    <Link href="/dashboard/admin" className="inline-flex items-center text-gray-400 hover:text-gray-900 font-bold transition-colors group shrink-0">
                        <ArrowLeft size={18} className="mr-2 group-hover:-translate-x-1 transition-transform" /> Kembali
                    </Link>

                    <div className="h-8 w-1 bg-gray-200 hidden md:block rounded-full"></div>

                    <div>
                        <h1 className="font-handwriting text-3xl sm:text-4xl font-black text-gray-900 mb-1">Konfigurasi Tryout</h1>
                        <p className="text-gray-500 text-sm font-medium">
                            Atur komposisi materi, jumlah soal, dan urutan kategori.
                        </p>
                    </div>
                </div>
            </div>

            <TryoutConfigClient initialConfigs={configs || []} />
        </div>
    )
}
