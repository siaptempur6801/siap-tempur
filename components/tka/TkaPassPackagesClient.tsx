'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Crown, Loader2, ShieldCheck, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { createTkaPassTransaction, syncPaymentStatus } from '@/app/actions/payment'

export type TkaPassPackage = {
    code: string
    name: string
    description: string | null
    price: number
    currency: string
    durationDays: number | null
}

function rupiah(value: number) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(value).replace(/\s+/g, '')
}

export default function TkaPassPackagesClient({
    level,
    packages,
    hasActivePass = false,
}: {
    level: string
    packages: TkaPassPackage[]
    hasActivePass?: boolean
}) {
    const router = useRouter()
    const [buying, setBuying] = useState<string | null>(null)

    const buy = async (productCode: string) => {
        if (buying) return
        setBuying(productCode)
        const loadingToast = toast.loading(hasActivePass ? 'Menyiapkan perpanjangan akses...' : 'Menyiapkan pembayaran...')
        try {
            const transaction = await createTkaPassTransaction(productCode, level)
            if (!transaction.success) {
                toast.error('Pembayaran belum bisa dimulai', {
                    id: loadingToast,
                    description: transaction.message,
                })
                return
            }

            toast.dismiss(loadingToast)
            if (!window.snap?.pay) {
                toast.error('Pembayaran belum siap dimuat', {
                    description: 'Muat ulang halaman lalu coba lagi.',
                })
                return
            }

            window.snap.pay(transaction.token, {
                onSuccess: async () => {
                    const id = toast.loading(hasActivePass ? 'Memperpanjang akses...' : 'Mengaktifkan akses...')
                    const ok = await syncPaymentStatus(transaction.orderId)
                    if (ok) {
                        toast.success(hasActivePass ? 'Akses berhasil diperpanjang' : 'Akses belajar sudah aktif', {
                            id,
                            description: hasActivePass
                                ? 'Durasi tambahan akan dimulai setelah masa aktif kamu saat ini berakhir.'
                                : 'Kamu sudah bisa menggunakan fitur belajar yang termasuk dalam paket.',
                        })
                        router.refresh()
                    } else {
                        toast.info('Pembayaran sedang diverifikasi', {
                            id,
                            description: 'Tunggu sebentar lalu muat ulang halaman untuk melihat status terbaru.',
                        })
                    }
                },
                onPending: async () => {
                    const id = toast.loading('Memperbarui status pembayaran...')
                    await syncPaymentStatus(transaction.orderId)
                    toast.info('Menunggu pembayaran', {
                        id,
                        description: 'Selesaikan pembayaran sesuai petunjuk pada metode yang kamu pilih.'
                    })
                },
                onError: () => {
                    toast.error('Pembayaran belum berhasil', {
                        description: 'Coba lagi atau pilih metode pembayaran lain.'
                    })
                },
                onClose: async () => {
                    const id = toast.loading('Memeriksa status pembayaran...')
                    await syncPaymentStatus(transaction.orderId)
                    toast.info('Pembayaran belum selesai', {
                        id,
                        description: 'Kamu bisa mencoba pembayaran lagi jika belum menyelesaikannya.'
                    })
                    router.refresh()
                },
            })
        } catch (error) {
            toast.dismiss(loadingToast)
            toast.error('Pembayaran belum bisa dimulai', {
                description: error instanceof Error ? error.message : 'Coba lagi beberapa saat.',
            })
        } finally {
            setBuying(null)
        }
    }

    if (packages.length === 0) return null

    return (
        <section className="space-y-3">
            <div>
                <div className="inline-flex items-center gap-2 border-2 border-gray-900 bg-yellow-100 px-3 py-1 text-xs font-black uppercase">
                    <Crown size={15}/> Tempur Pass
                </div>
                <h2 className="mt-2 text-2xl font-black">
                    {hasActivePass ? `Perpanjang akses TKA ${level}` : `Pilih akses belajar TKA ${level}`}
                </h2>
                <p className="mt-1 text-sm font-semibold text-gray-600">
                    {hasActivePass
                        ? 'Pilih durasi tambahan. Masa aktif baru akan dimulai setelah akses kamu saat ini berakhir.'
                        : 'Pilih durasi akses untuk membuka full tryout dan mini tryout tanpa batas selama masa aktif paket.'}
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                {packages.map((pkg) => {
                    const days = pkg.durationDays ?? 0
                    const isLongPass = days >= 90
                    return (
                        <article
                            key={pkg.code}
                            className={`relative border-2 border-gray-900 p-5 shadow-[5px_5px_0_0_#111] ${isLongPass ? 'bg-yellow-50' : 'bg-white'}`}
                        >
                            {isLongPass && (
                                <span className="absolute -right-2 -top-2 border-2 border-gray-900 bg-green-300 px-2 py-1 text-xs font-black uppercase">
                                    Lebih hemat
                                </span>
                            )}
                            <h3 className="text-xl font-black">{pkg.name}</h3>
                            <p className="mt-2 min-h-10 text-sm font-semibold text-gray-600">
                                {pkg.description || `Akses belajar TKA ${level} selama ${days} hari.`}
                            </p>
                            <div className="mt-4 text-4xl font-black text-blue-700">{rupiah(pkg.price)}</div>
                            <div className="mt-1 text-xs font-bold text-gray-500">Biaya admin Rp500 ditambahkan saat pembayaran</div>

                            <div className="my-5 space-y-2 text-sm font-bold text-gray-700">
                                <div className="flex items-start gap-2"><CheckCircle2 size={18} className="mt-0.5 shrink-0 text-green-700"/> Full tryout TKA {level}</div>
                                <div className="flex items-start gap-2"><CheckCircle2 size={18} className="mt-0.5 shrink-0 text-green-700"/> Mini tryout tanpa batas</div>
                                <div className="flex items-start gap-2"><CheckCircle2 size={18} className="mt-0.5 shrink-0 text-green-700"/> Masa aktif {days} hari</div>
                                <div className="flex items-start gap-2"><ShieldCheck size={18} className="mt-0.5 shrink-0 text-blue-700"/> Akses aktif otomatis setelah pembayaran terverifikasi</div>
                            </div>

                            <button
                                type="button"
                                disabled={Boolean(buying)}
                                onClick={() => void buy(pkg.code)}
                                className="inline-flex w-full items-center justify-center gap-2 border-2 border-gray-900 bg-blue-700 px-4 py-3 font-black text-white shadow-[3px_3px_0_0_#111] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {buying === pkg.code ? <Loader2 size={18} className="animate-spin"/> : <Zap size={18}/>} 
                                {buying === pkg.code
                                    ? 'Menyiapkan...'
                                    : hasActivePass
                                        ? `Perpanjang ${days} hari`
                                        : `Pilih akses ${days} hari`}
                            </button>
                        </article>
                    )
                })}
            </div>
        </section>
    )
}
