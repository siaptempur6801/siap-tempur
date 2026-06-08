import { AlertCircle, Banknote, CheckCircle2, ReceiptText, Users } from 'lucide-react'
import { createAdminClient } from '@/lib/utils/supabase/server'
import { logger } from '@/lib/logger'
import { getTransactionStatus, type MidtransTransactionStatus } from '@/lib/midtrans'

export const dynamic = 'force-dynamic'

const MAX_MIDTRANS_STATUS_CHECKS = 100

type Profile = {
    full_name: string | null
    phone_number: string | null
}

type FinanceRow = {
    id: string
    userId: string
    userName: string
    phoneNumber: string
    orderId: string
    amount: number
    status: string
    product: string
    source: 'Paket Token' | 'Tiket Event'
    channel: string
    createdAt: string
}

function formatCurrency(amount: number) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(amount)
}

function formatDate(date: string) {
    return new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Jakarta',
    }).format(new Date(date))
}

function formatMidtransDate(date: string) {
    const normalizedDate = date.includes('T') ? date : `${date.replace(' ', 'T')}+07:00`

    return formatDate(normalizedDate)
}

function getRelation<T>(value: T | T[] | null | undefined): T | null {
    if (Array.isArray(value)) return value[0] || null
    return value || null
}

function getMidtransAmount(status: MidtransTransactionStatus) {
    const amount = Number(status.gross_amount)
    return Number.isFinite(amount) ? amount : 0
}

async function getSettledMidtransStatus(orderId: string) {
    try {
        const status = await getTransactionStatus(orderId)
        if (status?.transaction_status !== 'settlement') return null
        return status
    } catch (error) {
        logger.warn('[finance-admin-midtrans-status]', { orderId, error })
        return null
    }
}

export default async function FinanceAdminPage() {
    const supabase = await createAdminClient()

    const [tokenPaymentsResult, eventPaymentsResult] = await Promise.all([
        supabase
            .from('transactions')
            .select('id, user_id, order_id, amount, status, package_name, created_at, profiles(full_name, phone_number)')
            .order('created_at', { ascending: false }),
        supabase
            .from('event_payments')
            .select('id, user_id, order_id, amount, status, created_at, profiles(full_name, phone_number), tryout_events(title)')
            .order('created_at', { ascending: false }),
    ])

    if (tokenPaymentsResult.error || eventPaymentsResult.error) {
        logger.warn('[finance-admin]', {
            tokenPaymentsError: tokenPaymentsResult.error,
            eventPaymentsError: eventPaymentsResult.error,
        })

        return (
            <div className="border-2 border-gray-900 bg-white p-8 text-center shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
                <AlertCircle className="mx-auto mb-3 h-10 w-10 text-gray-900" />
                <h1 className="font-handwriting text-3xl font-black text-gray-900">Gagal memuat data keuangan</h1>
                <p className="mt-2 text-sm font-semibold text-gray-600">Cek log server untuk detail error query pembayaran.</p>
            </div>
        )
    }

    const tokenPaymentCandidates = (tokenPaymentsResult.data || []).slice(0, MAX_MIDTRANS_STATUS_CHECKS)
    const eventPaymentCandidates = (eventPaymentsResult.data || []).slice(0, MAX_MIDTRANS_STATUS_CHECKS)

    const [tokenMidtransStatuses, eventMidtransStatuses] = await Promise.all([
        Promise.all(tokenPaymentCandidates.map((payment) => getSettledMidtransStatus(payment.order_id))),
        Promise.all(eventPaymentCandidates.map((payment) => getSettledMidtransStatus(payment.order_id))),
    ])

    const tokenPayments: FinanceRow[] = tokenPaymentCandidates.flatMap((payment, index) => {
        const midtransStatus = tokenMidtransStatuses[index]
        if (!midtransStatus) return []

        const profile = getRelation<Profile>(payment.profiles)

        return [{
            id: payment.id,
            userId: payment.user_id,
            userName: profile?.full_name || 'User tanpa nama',
            phoneNumber: profile?.phone_number || '-',
            orderId: payment.order_id,
            amount: getMidtransAmount(midtransStatus),
            status: midtransStatus.transaction_status || 'settlement',
            product: payment.package_name,
            source: 'Paket Token',
            channel: midtransStatus.payment_type || '-',
            createdAt: midtransStatus.transaction_time || payment.created_at,
        }]
    })

    const eventPayments: FinanceRow[] = eventPaymentCandidates.flatMap((payment, index) => {
        const midtransStatus = eventMidtransStatuses[index]
        if (!midtransStatus) return []

        const profile = getRelation<Profile>(payment.profiles)
        const event = getRelation<{ title: string | null }>(payment.tryout_events)

        return [{
            id: payment.id,
            userId: payment.user_id,
            userName: profile?.full_name || 'User tanpa nama',
            phoneNumber: profile?.phone_number || '-',
            orderId: payment.order_id,
            amount: getMidtransAmount(midtransStatus),
            status: midtransStatus.transaction_status || 'settlement',
            product: event?.title ? `Tiket ${event.title}` : 'Tiket event',
            source: 'Tiket Event',
            channel: midtransStatus.payment_type || '-',
            createdAt: midtransStatus.transaction_time || payment.created_at,
        }]
    })

    const payments = [...tokenPayments, ...eventPayments].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    const totalRevenue = payments.reduce((total, payment) => total + payment.amount, 0)
    const uniqueUsers = new Set(payments.map((payment) => payment.userId)).size
    const tokenRevenue = tokenPayments.reduce((total, payment) => total + payment.amount, 0)
    const eventRevenue = eventPayments.reduce((total, payment) => total + payment.amount, 0)

    return (
        <div className="space-y-8 pb-10">
            <div className="relative overflow-hidden border-2 border-gray-900 bg-white p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
                <div className="pointer-events-none absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '10px 10px' }}></div>
                <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="mb-2 inline-flex border-2 border-gray-900 bg-gray-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            Admin Console
                        </p>
                        <h1 className="font-handwriting text-4xl font-black text-gray-900">Keuangan</h1>
                        <p className="mt-2 text-sm font-medium text-gray-600">
                            Status, nominal, channel, dan tanggal transaksi diverifikasi langsung ke Midtrans.
                        </p>
                    </div>
                    <div className="inline-flex items-center gap-2 border-2 border-gray-900 bg-gray-900 px-4 py-3 text-sm font-black uppercase text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,0.25)]">
                        <CheckCircle2 size={18} />
                        Payment Berhasil
                    </div>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <div className="border-2 border-gray-900 bg-white p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs font-black uppercase text-gray-500">Total Omzet</span>
                        <Banknote size={22} />
                    </div>
                    <p className="text-2xl font-black text-gray-900">{formatCurrency(totalRevenue)}</p>
                </div>
                <div className="border-2 border-gray-900 bg-white p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs font-black uppercase text-gray-500">Transaksi</span>
                        <ReceiptText size={22} />
                    </div>
                    <p className="text-2xl font-black text-gray-900">{payments.length}</p>
                </div>
                <div className="border-2 border-gray-900 bg-white p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs font-black uppercase text-gray-500">Pembeli Unik</span>
                        <Users size={22} />
                    </div>
                    <p className="text-2xl font-black text-gray-900">{uniqueUsers}</p>
                </div>
                <div className="border-2 border-gray-900 bg-white p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs font-black uppercase text-gray-500">Token / Event</span>
                        <CheckCircle2 size={22} />
                    </div>
                    <p className="text-lg font-black text-gray-900">
                        {formatCurrency(tokenRevenue)} / {formatCurrency(eventRevenue)}
                    </p>
                </div>
            </div>

            <div className="overflow-hidden border-2 border-gray-900 bg-white shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
                <div className="border-b-2 border-gray-900 bg-gray-100 px-5 py-4">
                    <h2 className="font-handwriting text-2xl font-black text-gray-900">Daftar Pembayaran Berhasil</h2>
                </div>

                {payments.length === 0 ? (
                    <div className="p-10 text-center">
                        <ReceiptText className="mx-auto mb-3 h-10 w-10 text-gray-400" />
                        <p className="font-handwriting text-2xl font-black text-gray-900">Belum ada payment berhasil</p>
                        <p className="mt-1 text-sm font-semibold text-gray-500">Data akan muncul setelah Midtrans mengembalikan status settlement.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y-2 divide-gray-900 text-sm">
                            <thead className="bg-gray-50">
                                <tr className="text-left text-xs font-black uppercase tracking-wide text-gray-600">
                                    <th className="px-4 py-3">Tanggal</th>
                                    <th className="px-4 py-3">User</th>
                                    <th className="px-4 py-3">Produk</th>
                                    <th className="px-4 py-3">Order ID</th>
                                    <th className="px-4 py-3">Channel</th>
                                    <th className="px-4 py-3">Sumber</th>
                                    <th className="px-4 py-3 text-right">Nominal</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {payments.map((payment) => (
                                    <tr key={`${payment.source}-${payment.id}`} className="align-top hover:bg-gray-50">
                                        <td className="whitespace-nowrap px-4 py-3 font-semibold text-gray-700">{formatMidtransDate(payment.createdAt)}</td>
                                        <td className="px-4 py-3">
                                            <p className="font-black text-gray-900">{payment.userName}</p>
                                            <p className="text-xs font-semibold text-gray-500">{payment.phoneNumber}</p>
                                            <p className="mt-1 max-w-44 truncate text-[11px] font-mono text-gray-400">{payment.userId}</p>
                                        </td>
                                        <td className="px-4 py-3 font-semibold text-gray-800">{payment.product}</td>
                                        <td className="px-4 py-3">
                                            <span className="font-mono text-xs font-semibold text-gray-600">{payment.orderId}</span>
                                        </td>
                                        <td className="px-4 py-3 font-bold uppercase text-gray-700">{payment.channel}</td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex border-2 border-gray-900 bg-white px-2 py-1 text-xs font-black text-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                                {payment.source}
                                            </span>
                                            <p className="mt-2 text-xs font-bold uppercase text-green-700">{payment.status}</p>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right font-black text-gray-900">{formatCurrency(payment.amount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
