import { createAdminClient } from '@/lib/utils/supabase/server'
import VoucherAdminClient, { VoucherCreateController } from '@/components/admin/VoucherAdminClient'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export default async function VoucherAdminPage() {
    const supabase = await createAdminClient()
    const { data: vouchers, error } = await supabase
        .from('vouchers')
        .select('id, code, quota_amount, max_uses, used_count, expires_at, is_active, created_at, voucher_claims(id, user_email, claimed_at, profiles(full_name))')
        .order('created_at', { ascending: false })

    if (error) {
        logger.warn('[voucher-admin]', { error })
        return <div className="p-8 text-center font-bold text-gray-900">Gagal memuat data voucher</div>
    }

    return (
        <div className="space-y-8 pb-10">
            <div className="relative overflow-hidden border-2 border-gray-900 bg-white p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
                <div className="pointer-events-none absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '10px 10px' }}></div>
                <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="mb-2 inline-flex border-2 border-gray-900 bg-gray-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            Admin Console
                        </p>
                        <h1 className="font-handwriting text-4xl font-black text-gray-900">Voucher</h1>
                        <p className="mt-2 text-sm font-medium text-gray-600">
                            Buat kode voucher, pantau pemakaian, dan cek user yang sudah klaim.
                        </p>
                    </div>
                    <VoucherCreateController />
                </div>
            </div>

            <VoucherAdminClient vouchers={vouchers || []} />
        </div>
    )
}
