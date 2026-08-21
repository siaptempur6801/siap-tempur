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
    }).format(value)
}

export default function TkaPassPackagesClient({
    level,
    packages,
}: {
    level: string
    packages: TkaPassPackage[]
}) {
    const router = useRouter()
    const [buying, setBuying] = useState<string | null>(null)

    const buy = async (productCode: string) => {
        if (buying) return
        setBuying(productCode)
        const loadingToast = toast.loading('Menyiapkan Tempur Pass...')
        try {
            const transaction = await createTkaPassTransaction(productCode, level)
            if (!transaction.success) {
                toast.error('Checkout belum bisa dibuat', {
                    id: loadingToast,
                    description: transaction.message,
                })
                return
            }

            toast.dismiss(loadingToast)
            if (!window.snap?.pay) {
                toast.error('Midtrans Snap belum siap', {
                    description: 'Muat ulang halaman lalu coba lagi.',
                })
                return
            }

            window.snap.pay(transaction.token, {
                onSuccess: async () => {
                    const id = toast.loading('Mengaktifkan Tempur Pass...')
                    const ok = await syncPaymentStatus(transaction.orderId)
                    if (ok) {
                        toast.success('Tempur Pass aktif!', {
                            id,
                            description: 'Akses premium TKA sudah diperbarui.',
                        })
                        router.refresh()
                    } else {
                        toast.info('Pembayaran diterima', {
                            id,
                            description: 'Status sedang diverifikasi. Muat ulang halaman sebentar lagi.',
                        })
                    }
                },
                onPending: async () => {
                    const id = toast.loading('Memperbarui status pembayaran...')
                    await syncPaymentStatus(transaction.orderId)
                    toast.info('Pembayaran masih tertunda', { id })
                },
                onError: () => {
                    toast.error('Pembayaran gagal.')
                },
                onClose: async () => {
                    const id = toast.loading('Memeriksa status terakhir...')
                    await syncPaymentStatus(transaction.orderId)
                    toast.info('Pembayaran ditutup', { id })
                    router.refresh()
                },
            })
        } catch (error) {
            toast.dismiss(loadingToast)
            toast.error('Gagal membuat checkout', {
                description: error instanceof Error ? error.message : 'Silakan coba lagi.',
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
                <h2 className="mt-2 text-2xl font-black">Buka akses premium TKA {level}</h2>
                <p className="mt-1 text-sm font-semibold text-gray-600">
                    Tempur Pass membuka Full Tryout dan Mini Tryout unlimited selama masa aktif paket.
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
                                {pkg.description || `Akses premium TKA ${level} selama ${days} hari.`}
                            </p>
                            <div className="mt-4 text-4xl font-black text-blue-700">{rupiah(pkg.price)}</div>
                            <div className="mt-1 text-xs font-bold text-gray-500">+ biaya admin Rp500 saat checkout</div>

                            <div className="my-5 space-y-2 text-sm font-bold text-gray-700">
                                <div className="flex items-start gap-2"><CheckCircle2 size={18} className="mt-0.5 shrink-0 text-green-700"/> Full Tryout TKA {level}</div>
                                <div className="flex items-start gap-2"><CheckCircle2 size={18} className="mt-0.5 shrink-0 text-green-700"/> Mini Tryout unlimited</div>
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
                                {buying === pkg.code ? 'Menyiapkan...' : `Pilih ${days} Hari`}
                            </button>
                        </article>
                    )
                })}
            </div>
        </section>
    )
}
