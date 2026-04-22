import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import TryoutConfigClient from '@/components/admin/TryoutConfigClient'

export const dynamic = 'force-dynamic'

export default async function TryoutConfigPage() {
    const supabase = await createClient()

    const { data: configs, error } = await supabase
        .from('tryout_configurations')
        .select('*')
        .order('sort_order', { ascending: true })

    if (error) {
        console.error('Error fetching tryout configurations:', error)
        return <div className="p-8 text-center font-bold text-red-500">Gagal memuat data konfigurasi</div>
    }

    return (
        <div className="space-y-8">
            <div className="relative overflow-hidden border-2 border-gray-900 bg-white p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
                <div className="pointer-events-none absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '10px 10px' }}></div>
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-8">
                    <Link href="/cpns/admin" className="group relative inline-flex shrink-0 items-center rounded-md border-2 border-gray-900 bg-white px-3 py-2 font-bold text-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition hover:-translate-y-0.5">
                        <ArrowLeft size={18} className="mr-2 transition-transform group-hover:-translate-x-1" /> Kembali
                    </Link>

                    <div className="hidden h-10 w-1 bg-gray-900 md:block"></div>

                    <div className="relative">
                        <h1 className="mb-1 font-handwriting text-4xl font-black text-gray-900">Konfigurasi Tryout</h1>
                        <p className="text-sm font-medium text-gray-600">
                            Atur komposisi materi, jumlah soal, dan urutan kategori.
                        </p>
                    </div>
                </div>
            </div>

            <TryoutConfigClient initialConfigs={configs || []} />
        </div>
    )
}
