import Link from 'next/link'
import { CreditCard, Coins, Calendar, ShoppingCart, Ticket, FileText, ClipboardList } from 'lucide-react'
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

export function HistoryTab({ transactions, usageSessions }: HistoryTabProps) {
    const handlePayPending = (token: string, orderId: string, event: React.MouseEvent) => {
        event.preventDefault()
        event.stopPropagation()

        const loadingId = toast.loading("Membuka pembayaran...")

        const snap = typeof window !== "undefined"
            ? (window as Window & { snap?: SnapController }).snap
            : undefined

        if (snap) {
            try {
                snap.pay(token, {
                    onSuccess: async function () {
                        toast.loading("Memverifikasi pembayaran...", { id: loadingId })
                        await syncPaymentStatus(orderId)
                        toast.success("Pembayaran Berhasil!", {
                            id: loadingId,
                            description: "Tiket tryout kamu telah ditambahkan."
                        })
                        window.location.reload()
                    },
                    onPending: async function () {
                        toast.loading("Memperbarui status...", { id: loadingId })
                        await syncPaymentStatus(orderId)
                        toast.info("Pembayaran Tertunda", {
                            id: loadingId,
                            description: "Silakan selesaikan pembayaran sesuai instruksi."
                        })
                        window.location.reload()
                    },
                    onError: function () {
                        toast.dismiss(loadingId)
                        toast.error("Pembayaran Gagal")
                    },
                    onClose: async function () {
                        toast.loading("Memeriksa status terakhir...", { id: loadingId })
                        await syncPaymentStatus(orderId)
                        toast.info("Pembayaran Ditutup", { id: loadingId })
                        window.location.reload()
                    }
                })
            } catch (err) {
                toast.dismiss(loadingId)
                toast.error("Gagal memuat popup Snap", {
                    description: err instanceof Error ? err.message : 'Terjadi kesalahan saat membuka Snap.'
                })
            }
        } else {
            toast.dismiss(loadingId)
            toast.error("Sistem pembayaran sedang disiapkan. Memuat ulang...", {
                description: "Mohon tunggu sebentar..."
            })
            setTimeout(() => {
                window.location.reload()
            }, 1000)
        }
    }

    return (
        <div className="space-y-6 animate-in fade-in zoom-in duration-300">
            {/* Purchase History */}
            <div className="bg-white border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 relative">
                <div className="absolute -top-3 left-8 w-14 h-5 bg-green-200/80 -rotate-2 shadow-sm"></div>
                <h4 className="font-bold text-xl mb-6 text-gray-900 flex items-center gap-2">
                    <CreditCard className="w-6 h-6" /> Riwayat Pembelian Kuota
                </h4>
                {transactions.length > 0 ? (
                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                        {transactions.map((tx) => (
                            <div key={tx.id} className="w-full shrink-0 p-5 bg-white border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all relative overflow-hidden group">
                                <div className="flex items-center justify-between gap-4 relative z-10">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-blue-100 border-2 border-gray-900 flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] shrink-0 group-hover:rotate-12 transition-transform">
                                            <Coins className="w-6 h-6 text-gray-900" />
                                        </div>
                                        <div>
                                            <div className="font-black text-lg text-gray-900 mb-1">{tx.package_name}</div>
                                            <div className="flex items-center gap-2 text-sm text-gray-600 font-bold">
                                                <Calendar size={14} />
                                                {new Date(tx.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' })}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-black text-xl text-gray-900">Rp {tx.amount.toLocaleString('id-ID')}</div>
                                        {(() => {
                                            const isLocallyExpired = tx.status === 'pending' && (new Date().getTime() - new Date(tx.created_at).getTime() > 15 * 60 * 1000)
                                            const computedStatus = isLocallyExpired ? 'expire' : tx.status

                                            const statusMap: Record<string, { label: string; color: string }> = {
                                                'settlement': { label: 'Berhasil', color: 'bg-green-300' },
                                                'capture': { label: 'Berhasil', color: 'bg-green-300' },
                                                'pending': { label: 'Menunggu', color: 'bg-yellow-300' },
                                                'expire': { label: 'Kedaluwarsa', color: 'bg-gray-300' },
                                                'cancel': { label: 'Batal', color: 'bg-red-300' },
                                                'deny': { label: 'Gagal', color: 'bg-red-300' },
                                            }
                                            const s = statusMap[computedStatus] || { label: computedStatus, color: 'bg-blue-100' }

                                            return (
                                                <>
                                                    <div className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 border border-gray-900 inline-block mt-2 shadow-sm ${s.color} transform ${['settlement', 'capture'].includes(computedStatus) ? '-rotate-2' : 'rotate-2'}`}>
                                                        {s.label}
                                                    </div>
                                                    {computedStatus === 'pending' && tx.snap_token && (
                                                        <div className="mt-3">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => handlePayPending(tx.snap_token!, tx.order_id, e)}
                                                                className="px-4 py-2 bg-blue-400 text-gray-900 text-sm font-bold border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-blue-500 hover:translate-x-px hover:translate-y-px hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer relative z-20 pointer-events-auto"
                                                            >
                                                                Bayar Sekarang
                                                            </button>
                                                        </div>
                                                    )}
                                                </>
                                            )
                                        })()}
                                    </div>
                                </div>
                                <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] bg-size-[16px_16px] z-0 pointer-events-none opacity-50"></div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-gray-300 bg-gray-50">
                        <div className="w-16 h-16 bg-green-200 border-2 border-gray-900 flex items-center justify-center mb-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            <ShoppingCart className="w-8 h-8 text-gray-900" />
                        </div>
                        <p className="text-lg font-bold text-gray-700 mb-2">Belum ada pembelian</p>
                        <p className="text-sm text-gray-500 mb-4">Riwayat pembelian kuota akan muncul di sini</p>
                        <Link
                            href="/cpns/dashboard/beli-paket"
                            className="px-5 py-2.5 bg-green-400 text-gray-900 font-bold border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-px hover:translate-y-px hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all"
                        >
                            Beli Kuota Sekarang
                        </Link>
                    </div>
                )}
            </div>

            {/* Usage History */}
            <div className="bg-white border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 relative">
                <div className="absolute -top-3 right-8 w-14 h-5 bg-orange-200/80 rotate-2 shadow-sm"></div>
                <h4 className="font-bold text-xl mb-6 text-gray-900 flex items-center gap-2">
                    <Ticket className="w-6 h-6" /> Riwayat Pemakaian Kuota
                </h4>
                {usageSessions.length > 0 ? (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {usageSessions.map((session) => (
                            <div key={session.id} className="flex flex-col shrink-0 sm:flex-row sm:items-center justify-between p-4 bg-gray-50 border-2 border-gray-300 hover:border-gray-900 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all gap-3 sm:gap-0">
                                <div className="flex items-start sm:items-center gap-4">
                                    <div className="w-12 h-12 bg-orange-200 border-2 border-gray-900 flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] shrink-0">
                                        <FileText className="w-6 h-6 text-gray-900" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-base text-gray-900">
                                            {session.mode === 'tryout' ? 'Tryout SKD Full' : 'Mini Tryout'}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {new Date(session.start_time).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })}
                                        </div>
                                    </div>
                                </div>
                                <div className="pl-[64px] sm:pl-0">
                                    <span className="text-base font-bold text-red-500 bg-red-100 px-3 py-1 border-2 border-gray-900 inline-block">
                                        -1 Tiket
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-gray-300 bg-gray-50">
                        <div className="w-16 h-16 bg-orange-200 border-2 border-gray-900 flex items-center justify-center mb-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            <ClipboardList className="w-8 h-8 text-gray-900" />
                        </div>
                        <p className="text-lg font-bold text-gray-700 mb-2">Belum ada pemakaian</p>
                        <p className="text-sm text-gray-500">Riwayat pemakaian kuota akan muncul di sini</p>
                    </div>
                )}
            </div>
        </div>
    )
}
