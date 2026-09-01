import Link from 'next/link'
import { Calendar, CheckCircle2, ClipboardList, Coins, CreditCard, FileText, ShoppingCart, Ticket } from 'lucide-react'
import { syncPaymentStatus } from '@/app/actions/payment'
import { toast } from 'sonner'

type SnapController = {
    pay: (
        token: string,
        callbacks: {
            onSuccess?: () => void | Promise<void>
            onPending?: () => void | Promise<void>
            onError?: () => void
            onClose?: () => void | Promise<void>
        }
    ) => void
}

type TransactionHistoryItem = {
    id: string
    package_name: string
    amount: number
    status: string
    created_at: string
    snap_token?: string | null
    order_id: string
}

type UsageSessionItem = {
    id: string
    mode: string
    start_time: string
}

interface HistoryTabProps {
    transactions: TransactionHistoryItem[]
    usageSessions: UsageSessionItem[]
}

function formatDate(value: string, withTime = false) {
    return new Date(value).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
        timeZone: 'Asia/Jakarta',
    })
}

function statusMeta(status: string, createdAt: string) {
    const locallyExpired = status === 'pending' && (Date.now() - new Date(createdAt).getTime() > 15 * 60 * 1000)
    const value = locallyExpired ? 'expire' : status
    const map: Record<string, { label: string; className: string }> = {
        settlement: { label: 'Berhasil', className: 'bg-green-100 text-green-800' },
        capture: { label: 'Berhasil', className: 'bg-green-100 text-green-800' },
        pending: { label: 'Menunggu pembayaran', className: 'bg-yellow-100 text-yellow-900' },
        expire: { label: 'Kedaluwarsa', className: 'bg-gray-100 text-gray-700' },
        cancel: { label: 'Dibatalkan', className: 'bg-red-100 text-red-800' },
        deny: { label: 'Belum berhasil', className: 'bg-red-100 text-red-800' },
    }
    return { value, ...(map[value] || { label: value, className: 'bg-blue-50 text-blue-800' }) }
}

export function HistoryTab({ transactions, usageSessions }: HistoryTabProps) {
    const handlePayPending = (token: string, orderId: string, event: React.MouseEvent) => {
        event.preventDefault()
        event.stopPropagation()
        const loadingId = toast.loading('Membuka pembayaran...')
        const snap = typeof window !== 'undefined'
            ? (window as Window & { snap?: SnapController }).snap
            : undefined

        if (!snap) {
            toast.dismiss(loadingId)
            toast.error('Pembayaran belum siap dimuat', { description: 'Muat ulang halaman lalu coba lagi.' })
            return
        }

        try {
            snap.pay(token, {
                onSuccess: async () => {
                    toast.loading('Memverifikasi pembayaran...', { id: loadingId })
                    await syncPaymentStatus(orderId)
                    toast.success('Pembayaran berhasil', {
                        id: loadingId,
                        description: 'Token akan tersedia setelah pembayaran terverifikasi.',
                    })
                    window.location.reload()
                },
                onPending: async () => {
                    toast.loading('Memperbarui status pembayaran...', { id: loadingId })
                    await syncPaymentStatus(orderId)
                    toast.info('Menunggu pembayaran', {
                        id: loadingId,
                        description: 'Selesaikan pembayaran sesuai petunjuk metode yang kamu pilih.',
                    })
                    window.location.reload()
                },
                onError: () => {
                    toast.dismiss(loadingId)
                    toast.error('Pembayaran belum berhasil')
                },
                onClose: async () => {
                    toast.loading('Memeriksa status pembayaran...', { id: loadingId })
                    await syncPaymentStatus(orderId)
                    toast.info('Pembayaran belum selesai', { id: loadingId })
                    window.location.reload()
                },
            })
        } catch (error) {
            toast.dismiss(loadingId)
            toast.error('Pembayaran belum bisa dibuka', {
                description: error instanceof Error ? error.message : 'Coba lagi beberapa saat.',
            })
        }
    }

    return (
        <div className="space-y-6">
            <section className="st-card-md bg-white p-5 md:p-6">
                <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center border-2 border-[var(--st-ink)] bg-blue-50"><CreditCard size={21} /></div>
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">Pembelian token</p>
                        <h2 className="st-heading mt-1 text-2xl">Riwayat pembayaran</h2>
                        <p className="st-muted mt-1 text-sm font-semibold">Lihat paket yang pernah kamu pilih dan lanjutkan pembayaran yang masih tersedia.</p>
                    </div>
                </div>

                {transactions.length > 0 ? (
                    <div className="mt-6 space-y-3">
                        {transactions.map((transaction) => {
                            const status = statusMeta(transaction.status, transaction.created_at)
                            return (
                                <article key={transaction.id} className="border-2 border-[var(--st-ink)] bg-white p-4">
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="flex min-w-0 items-start gap-3">
                                            <div className="flex h-11 w-11 shrink-0 items-center justify-center border-2 border-[var(--st-ink)] bg-blue-50"><Coins size={20} /></div>
                                            <div className="min-w-0">
                                                <h3 className="truncate font-black">{transaction.package_name}</h3>
                                                <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-gray-500"><Calendar size={13} /> {formatDate(transaction.created_at)}</p>
                                            </div>
                                        </div>
                                        <div className="sm:text-right">
                                            <p className="text-xl font-black">Rp {transaction.amount.toLocaleString('id-ID')}</p>
                                            <span className={`st-pill mt-2 ${status.className}`}>{status.label}</span>
                                        </div>
                                    </div>
                                    {status.value === 'pending' && transaction.snap_token && (
                                        <div className="mt-4 border-t-2 border-dashed border-gray-300 pt-4">
                                            <button
                                                type="button"
                                                onClick={(event) => handlePayPending(transaction.snap_token!, transaction.order_id, event)}
                                                className="st-button inline-flex min-h-11 items-center justify-center bg-blue-600 px-4 py-2.5 text-sm font-black text-white"
                                            >
                                                Lanjutkan pembayaran
                                            </button>
                                        </div>
                                    )}
                                </article>
                            )
                        })}
                    </div>
                ) : (
                    <EmptyState
                        icon={<ShoppingCart size={25} />}
                        title="Belum ada pembelian token."
                        description="Paket yang kamu beli akan muncul di sini."
                        action={<Link href="/cpns/dashboard/beli-paket" className="st-button inline-flex min-h-11 items-center justify-center bg-blue-600 px-4 py-2.5 text-sm font-black text-white">Lihat paket token</Link>}
                    />
                )}
            </section>

            <section className="st-card-md bg-white p-5 md:p-6">
                <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center border-2 border-[var(--st-ink)] bg-[var(--st-yellow)]"><Ticket size={21} /></div>
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">Penggunaan token</p>
                        <h2 className="st-heading mt-1 text-2xl">Sesi yang menggunakan token</h2>
                        <p className="st-muted mt-1 text-sm font-semibold">Riwayat ini membantu kamu melihat kapan token digunakan untuk memulai sesi.</p>
                    </div>
                </div>

                {usageSessions.length > 0 ? (
                    <div className="mt-6 space-y-3">
                        {usageSessions.map((session) => (
                            <article key={session.id} className="flex flex-col gap-3 border-2 border-[var(--st-ink)] bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center border-2 border-[var(--st-ink)] bg-orange-50"><FileText size={20} /></div>
                                    <div>
                                        <h3 className="font-black">{session.mode === 'tryout' ? 'Full Tryout SKD' : 'Mini Tryout'}</h3>
                                        <p className="mt-1 text-xs font-semibold text-gray-500">{formatDate(session.start_time, true)}</p>
                                    </div>
                                </div>
                                <span className="st-pill bg-red-50 text-red-800">-1 token</span>
                            </article>
                        ))}
                    </div>
                ) : (
                    <EmptyState icon={<ClipboardList size={25} />} title="Belum ada penggunaan token." description="Sesi berbayar yang kamu mulai akan tercatat di sini." />
                )}
            </section>
        </div>
    )
}

function EmptyState({ icon, title, description, action }: { icon: React.ReactNode; title: string; description: string; action?: React.ReactNode }) {
    return (
        <div className="mt-6 border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center border-2 border-[var(--st-ink)] bg-white">{icon}</div>
            <h3 className="mt-4 font-black">{title}</h3>
            <p className="st-muted mt-1 text-sm font-semibold">{description}</p>
            {action && <div className="mt-5">{action}</div>}
        </div>
    )
}
