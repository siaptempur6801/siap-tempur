'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
    Calendar,
    CalendarRange,
    ChevronLeft,
    ChevronRight,
    ClipboardList,
    Coins,
    CreditCard,
    FileText,
    Gift,
    RotateCcw,
    ShoppingCart,
    Ticket,
} from 'lucide-react'
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
    label: string
    amount: number
    balance_after: number
    start_time: string
}

type TokenCreditItem = {
    id: string
    created_at: string
    amount: number
    balance_after: number
    source_label: string
    source_detail: string
}

type HistoryPageInfo = {
    page: number
    pageSize: number
    total: number
    from: string
    to: string
}

interface HistoryTabProps {
    transactions: TransactionHistoryItem[]
    usageSessions: UsageSessionItem[]
    tokenCredits: TokenCreditItem[]
    transactionPage: HistoryPageInfo
    usagePage: HistoryPageInfo
    creditPage: HistoryPageInfo
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

export function HistoryTab({
    transactions,
    usageSessions,
    tokenCredits,
    transactionPage,
    usagePage,
    creditPage,
}: HistoryTabProps) {
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
            <HistorySection
                eyebrow="Pembelian token"
                title="Riwayat pembayaran"
                description="Lihat paket yang pernah kamu pilih dan lanjutkan pembayaran yang masih tersedia."
                icon={<CreditCard size={21} />}
                iconTone="bg-blue-50"
                filterPrefix="tx"
                pageInfo={transactionPage}
            >
                {transactions.length > 0 ? (
                    <div className="space-y-3">
                        {transactions.map((transaction) => {
                            const status = statusMeta(transaction.status, transaction.created_at)
                            return (
                                <article key={transaction.id} className="border-2 border-[var(--st-ink)] bg-white p-4">
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="flex min-w-0 items-start gap-3">
                                            <div className="flex h-11 w-11 shrink-0 items-center justify-center border-2 border-[var(--st-ink)] bg-blue-50"><Coins size={20} /></div>
                                            <div className="min-w-0">
                                                <h3 className="break-words font-black">{transaction.package_name}</h3>
                                                <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-gray-500"><Calendar size={13} /> {formatDate(transaction.created_at, true)}</p>
                                            </div>
                                        </div>
                                        <div className="sm:text-right">
                                            <p className="text-xl font-black">Rp {transaction.amount.toLocaleString('id-ID')}</p>
                                            <span className={`st-pill mt-2 ${status.className}`}>{status.label}</span>
                                        </div>
                                    </div>
                                    {status.value === 'pending' && transaction.snap_token && (
                                        <div className="mt-4 border-t-2 border-dashed border-gray-300 pt-4">
                                            <button type="button" onClick={(event) => handlePayPending(transaction.snap_token!, transaction.order_id, event)} className="st-button inline-flex min-h-11 items-center justify-center bg-blue-600 px-4 py-2.5 text-sm font-black text-white">
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
                        title={transactionPage.from || transactionPage.to ? 'Tidak ada pembayaran pada tanggal ini.' : 'Belum ada pembelian token.'}
                        description="Paket token yang kamu pilih akan muncul di sini."
                        action={!transactionPage.from && !transactionPage.to ? <Link href="/cpns/dashboard/beli-paket" className="st-button inline-flex min-h-11 items-center justify-center bg-blue-600 px-4 py-2.5 text-sm font-black text-white">Lihat paket token</Link> : undefined}
                    />
                )}
            </HistorySection>

            <HistorySection
                eyebrow="Penggunaan token"
                title="Sesi yang menggunakan token"
                description="Setiap pengurangan token dicatat dari ledger agar jumlah dan saldo akhirnya tetap akurat."
                icon={<Ticket size={21} />}
                iconTone="bg-[var(--st-yellow)]"
                filterPrefix="usage"
                pageInfo={usagePage}
            >
                {usageSessions.length > 0 ? (
                    <div className="space-y-3">
                        {usageSessions.map((session) => (
                            <article key={session.id} className="flex flex-col gap-3 border-2 border-[var(--st-ink)] bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex min-w-0 items-center gap-3">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center border-2 border-[var(--st-ink)] bg-orange-50"><FileText size={20} /></div>
                                    <div className="min-w-0">
                                        <h3 className="break-words font-black">{session.label}</h3>
                                        <p className="mt-1 text-xs font-semibold text-gray-500">{formatDate(session.start_time, true)}</p>
                                        <p className="mt-1 text-xs font-bold text-gray-600">Saldo setelah digunakan: {session.balance_after} token</p>
                                    </div>
                                </div>
                                <span className="st-pill shrink-0 bg-red-50 text-red-800">-{session.amount} token</span>
                            </article>
                        ))}
                    </div>
                ) : (
                    <EmptyState icon={<ClipboardList size={25} />} title={usagePage.from || usagePage.to ? 'Tidak ada penggunaan pada tanggal ini.' : 'Belum ada penggunaan token.'} description="Sesi berbayar yang kamu mulai akan tercatat di sini." />
                )}
            </HistorySection>

            <HistorySection
                eyebrow="Token masuk"
                title="Dari mana token diperoleh"
                description="Lihat token yang berasal dari pembelian, voucher, hadiah, atau penyesuaian admin."
                icon={<Gift size={21} />}
                iconTone="bg-green-50"
                filterPrefix="credit"
                pageInfo={creditPage}
            >
                {tokenCredits.length > 0 ? (
                    <div className="space-y-3">
                        {tokenCredits.map((credit) => (
                            <article key={credit.id} className="flex flex-col gap-3 border-2 border-[var(--st-ink)] bg-green-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex min-w-0 items-center gap-3">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center border-2 border-[var(--st-ink)] bg-white"><Gift size={20} /></div>
                                    <div className="min-w-0">
                                        <h3 className="font-black">{credit.source_label}</h3>
                                        <p className="break-words text-sm font-semibold text-gray-700">{credit.source_detail}</p>
                                        <p className="mt-1 text-xs font-semibold text-gray-500">{formatDate(credit.created_at, true)}</p>
                                        <p className="mt-1 text-xs font-bold text-gray-600">Saldo setelah diterima: {credit.balance_after} token</p>
                                    </div>
                                </div>
                                <span className="st-pill shrink-0 bg-green-100 text-green-800">+{credit.amount} token</span>
                            </article>
                        ))}
                    </div>
                ) : (
                    <EmptyState icon={<Gift size={25} />} title={creditPage.from || creditPage.to ? 'Tidak ada token masuk pada tanggal ini.' : 'Belum ada token masuk.'} description="Pembelian, voucher, hadiah, dan penyesuaian token akan tercatat di sini." />
                )}
            </HistorySection>
        </div>
    )
}

function HistorySection({ eyebrow, title, description, icon, iconTone, filterPrefix, pageInfo, children }: {
    eyebrow: string
    title: string
    description: string
    icon: React.ReactNode
    iconTone: string
    filterPrefix: 'tx' | 'usage' | 'credit'
    pageInfo: HistoryPageInfo
    children: React.ReactNode
}) {
    return (
        <section className="st-card-md bg-white p-5 md:p-6">
            <div className="flex items-start gap-3">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center border-2 border-[var(--st-ink)] ${iconTone}`}>{icon}</div>
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">{eyebrow}</p>
                    <h2 className="st-heading mt-1 text-2xl">{title}</h2>
                    <p className="st-muted mt-1 text-sm font-semibold">{description}</p>
                </div>
            </div>

            <HistoryControls key={`${filterPrefix}-${pageInfo.from}-${pageInfo.to}`} prefix={filterPrefix} pageInfo={pageInfo} />
            <div className="mt-5">{children}</div>
            <HistoryPagination prefix={filterPrefix} pageInfo={pageInfo} />
        </section>
    )
}

function HistoryControls({ prefix, pageInfo }: { prefix: 'tx' | 'usage' | 'credit'; pageInfo: HistoryPageInfo }) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [from, setFrom] = useState(pageInfo.from)
    const [to, setTo] = useState(pageInfo.to)
    const [isPending, startTransition] = useTransition()
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })

    const navigate = (nextFrom: string, nextTo: string) => {
        if (nextFrom && nextTo && nextFrom > nextTo) {
            toast.error('Tanggal mulai tidak boleh setelah tanggal akhir.')
            return
        }

        const params = new URLSearchParams(searchParams.toString())
        params.set('tab', 'history')
        params.delete(`${prefix}_page`)
        if (nextFrom) params.set(`${prefix}_from`, nextFrom)
        else params.delete(`${prefix}_from`)
        if (nextTo) params.set(`${prefix}_to`, nextTo)
        else params.delete(`${prefix}_to`)
        startTransition(() => router.push(`/cpns/dashboard/profile?${params.toString()}`, { scroll: false }))
    }

    return (
        <div className="mt-5 border-y-2 border-dashed border-gray-200 py-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <DateField label="Dari tanggal" value={from} max={today} onChange={setFrom} />
                <DateField label="Sampai tanggal" value={to} max={today} onChange={setTo} />
                <div className="flex gap-2">
                    <button type="button" onClick={() => navigate(from, to)} disabled={isPending} className="st-button inline-flex min-h-11 flex-1 items-center justify-center gap-2 bg-blue-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50 sm:flex-none">
                        <CalendarRange size={16} /> Terapkan
                    </button>
                    {(pageInfo.from || pageInfo.to) && (
                        <button type="button" onClick={() => { setFrom(''); setTo(''); navigate('', '') }} disabled={isPending} aria-label="Reset filter tanggal" title="Reset filter tanggal" className="st-button st-focus flex h-11 w-11 items-center justify-center bg-white disabled:opacity-50">
                            <RotateCcw size={16} />
                        </button>
                    )}
                </div>
            </div>
            <p className="mt-3 text-xs font-bold text-gray-500">{pageInfo.total} catatan ditemukan</p>
        </div>
    )
}

function DateField({ label, value, max, onChange }: { label: string; value: string; max: string; onChange: (value: string) => void }) {
    return (
        <label>
            <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.12em] text-gray-500">{label}</span>
            <input type="date" value={value} max={max} onChange={(event) => onChange(event.target.value)} className="st-input text-sm font-bold" />
        </label>
    )
}

function HistoryPagination({ prefix, pageInfo }: { prefix: 'tx' | 'usage' | 'credit'; pageInfo: HistoryPageInfo }) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [isPending, startTransition] = useTransition()
    const totalPages = Math.max(1, Math.ceil(pageInfo.total / pageInfo.pageSize))
    const currentPage = Math.min(pageInfo.page, totalPages)
    if (pageInfo.total <= pageInfo.pageSize) return null

    const goToPage = (page: number) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set('tab', 'history')
        params.set(`${prefix}_page`, String(page))
        startTransition(() => router.push(`/cpns/dashboard/profile?${params.toString()}`, { scroll: false }))
    }

    const firstItem = (currentPage - 1) * pageInfo.pageSize + 1
    const lastItem = Math.min(currentPage * pageInfo.pageSize, pageInfo.total)

    return (
        <div className="mt-5 flex flex-col gap-3 border-t-2 border-dashed border-gray-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-gray-600">{firstItem}-{lastItem} dari {pageInfo.total} catatan</p>
            <div className="flex items-center gap-2">
                <button type="button" onClick={() => goToPage(currentPage - 1)} disabled={isPending || currentPage === 1} aria-label="Halaman sebelumnya" title="Halaman sebelumnya" className="st-button st-focus flex h-11 w-11 items-center justify-center bg-white disabled:opacity-40"><ChevronLeft size={18} /></button>
                <span className="min-w-16 text-center text-sm font-black">{currentPage}/{totalPages}</span>
                <button type="button" onClick={() => goToPage(currentPage + 1)} disabled={isPending || currentPage === totalPages} aria-label="Halaman berikutnya" title="Halaman berikutnya" className="st-button st-focus flex h-11 w-11 items-center justify-center bg-[var(--st-yellow)] disabled:opacity-40"><ChevronRight size={18} /></button>
            </div>
        </div>
    )
}

function EmptyState({ icon, title, description, action }: { icon: React.ReactNode; title: string; description: string; action?: React.ReactNode }) {
    return (
        <div className="border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center border-2 border-[var(--st-ink)] bg-white">{icon}</div>
            <h3 className="mt-4 font-black">{title}</h3>
            <p className="st-muted mt-1 text-sm font-semibold">{description}</p>
            {action && <div className="mt-5">{action}</div>}
        </div>
    )
}
