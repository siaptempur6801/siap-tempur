import ExportDataClient from '@/components/admin/ExportDataClient'
import { createAdminClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

export default async function ExportDataPage() {
    const supabase = await createAdminClient()
    const { data: events, error } = await supabase
        .from('tryout_events')
        .select('id, title, status, starts_at')
        .order('starts_at', { ascending: false })

    if (error) {
        console.error('[export-events]', error)
    }

    return (
        <div className="space-y-8 pb-10">
            <div className="relative overflow-hidden border-2 border-gray-900 bg-white p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
                <div className="pointer-events-none absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '10px 10px' }}></div>
                <div className="relative">
                    <p className="mb-2 inline-flex border-2 border-gray-900 bg-gray-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        Admin Console
                    </p>
                    <h1 className="font-handwriting text-4xl font-black text-gray-900">Export Data</h1>
                    <p className="mt-2 text-sm font-medium text-gray-600">
                        Unduh data operasional dalam format XLSX atau CSV untuk laporan, backup, dan audit.
                    </p>
                </div>
            </div>

            <ExportDataClient events={events || []} />
        </div>
    )
}
