'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Crown, Loader2, ShieldCheck, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { createTkaPassTransaction, syncPaymentStatus } from '@/app/actions/payment'
import { trackProductEvent } from '@/lib/product-analytics'

export type TkaPassPackage = {
    code: string
    name: string
    description: string | null
    price: number
    currency: string
    durationDays: number | null
}

const ADMIN_FEE = 500

function rupiah(value: number) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(value).replace(/\s+/g, '')
}

function analyticsPackageDays(days: number | null): 30 | 90 | undefined {
    if (days === 30 || days === 90) return days
    return undefined
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

    useEffect(() => {
        if (packages.length === 0) return
        trackProductEvent('px_package_view', {
            program: 'tka_smp',
            surface: 'pass',
        })
    }, [packages.length])

    const bestValueCode = useMemo(() => {
        const pricedByDay = packages
            .filter((pkg) => (pkg.durationDays ?? 0) > 0)
            .map((pkg) => ({
                code: pkg.code,
                pricePerDay: pkg.price / Number(pkg.durationDays),
            }))
            .sort((a, b) => a.pricePerDay - b.pricePerDay)

        if (pricedByDay.length < 2) return null
        return pricedByDay[0]?.code ?? null
    }, [packages])

    const buy = async (productCode: string, durationDays: number | null) => {
        if (buying) return
        const packageDays = analyticsPackageDays(durationDays)

        trackProductEvent('px_package_select', {
            program: 'tka_smp',
            surface: 'pass',
            package_days: packageDays,
        })

        setBuying(productCode)
        const loadingToast = toast.loading(hasActivePass ? 'Menyiapkan perpanjangan akses...' : 'Menyiapkan pembayaran...')
        try {
            const transaction = await createTkaPassTransaction(productCode, level)
            if (!transaction.success) {
                toast.error('Pembayaran belum bisa dimulai', {
                    id: loadingToast,
                    description: transaction.message,
                })
                trackProductEvent('px_checkout_state', {
                    program: 'tka_smp',
                    surface: 'pass',
                    package_days: packageDays,
                    payment_state: 'error',
                })
                return
            }

            toast.dismiss(loadingToast)
            if (!window.snap?.pay) {
                toast.error('Pembayaran belum siap dimuat', {
                    description: 'Muat ulang halaman lalu coba lagi.',
                })
                trackProductEvent('px_checkout_state', {
                    program: 'tka_smp',
                    surface: 'pass',
                    package_days: packageDays,
                    payment_state: 'error',
                })
                return
            }

            trackProductEvent('px_checkout_state', {
                program: 'tka_smp',
                surface: 'pass',
                package_days: packageDays,
                payment_state: 'opened',
            })

            window.snap.pay(transaction.token, {
                onSuccess: async () => {
                    trackProductEvent('px_checkout_state', {
                        program: 'tka_smp',
                        surface: 'pass',
                        package_days: packageDays,
                        payment_state: 'success',
                    })
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
                        trackProductEvent('px_checkout_state', {
                            program: 'tka_smp',
                            surface: 'pass',
                            package_days: packageDays,
                            payment_state: 'verifying',
                        })
                        toast.info('Pembayaran sedang diverifikasi', {
                            id,
                            description: 'Tunggu sebentar lalu muat ulang halaman untuk melihat status terbaru.',
                        })
                    }
                },
                onPending: async () => {
                    trackProductEvent('px_checkout_state', {
                        program: 'tka_smp',
                        surface: 'pass',
                        package_days: packageDays,
                        payment_state: 'pending',
                    })
                    const id = toast.loading('Memperbarui status pembayaran...')
                    await syncPaymentStatus(transaction.orderId)
                    toast.info('Menunggu pembayaran', {
                        id,
                        description: 'Selesaikan pembayaran sesuai petunjuk pada metode yang kamu pilih.',
                    })
                },
                onError: () => {
                    trackProductEvent('px_checkout_state', {
                        program: 'tka_smp',
                        surface: 'pass',
                        package_days: packageDays,
                        payment_state: 'error',
                    })
                    toast.error('Pembayaran belum berhasil', {
                        description: 'Coba lagi atau pilih metode pembayaran lain.',
                    })
                },
                onClose: async () => {
                    trackProductEvent('px_checkout_state', {
                        program: 'tka_smp',
                        surface: 'pass',
                        package_days: packageDays,
                        payment_state: 'closed',
                    })
                    const id = toast.loading('Memeriksa status pembayaran...')
                    await syncPaymentStatus(transaction.orderId)
                    toast.info('Pembayaran belum selesai', {
                        id,
                        description: 'Tidak ada akses yang diaktifkan sebelum pembayaran berhasil diverifikasi.',
                    })
                    router.refresh()
                },
            })
        } catch (error) {
            toast.dismiss(loadingToast)
            trackProductEvent('px_checkout_state', {
                program: 'tka_smp',
                surface: 'pass',
                package_days: packageDays,
                payment_state: 'error',
            })
            toast.error('Pembayaran belum bisa dimulai', {
                description: error instanceof Error ? error.message : 'Coba lagi beberapa saat.',
            })
        } finally {
            setBuying(null)
        }
    }

    if (packages.length === 0) return null

    return (
        <section className="space-y-4" aria-labelledby="tka-pass-packages-title">
            <div>
                <div className="inline-flex items-center gap-2 border-2 border-gray-900 bg-yellow-100 px-3 py-1 text-xs font-black uppercase">
                    <Crown size={15} aria-hidden="true"/> Tempur Pass
                </div>
                <h2 id="tka-pass-packages-title" className="mt-2 text-2xl font-black">
                    {hasActivePass ? `Perpanjang akses TKA ${level}` : `Pilih akses belajar TKA ${level}`}
                </h2>
                <p className="mt-1 max-w-3xl text-sm font-semibold leading-relaxed text-gray-600">
                    {hasActivePass
                        ? 'Pilih durasi tambahan. Perpanjangan dimulai setelah masa aktifmu saat ini selesai, jadi sisa akses tidak terbuang.'
                        : 'Pilih durasi yang sesuai kebutuhanmu untuk membuka Full Tryout dan Mini Tryout selama masa aktif paket.'}
                </p>
                <p className="mt-2 text-xs font-bold text-gray-500">
                    Semua pilihan di bawah dikenai biaya admin {rupiah(ADMIN_FEE)} satu kali pada setiap pembayaran.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                {packages.map((pkg) => {
                    const days = pkg.durationDays ?? 0
                    const totalPayment = pkg.price + ADMIN_FEE
                    const isBestValue = pkg.code === bestValueCode
                    const isBuyingThis = buying === pkg.code

                    return (
                        <article
                            key={pkg.code}
                            className={`relative flex h-full flex-col border-2 border-gray-900 p-5 shadow-[5px_5px_0_0_#111] ${isBestValue ? 'bg-yellow-50' : 'bg-white'}`}
                        >
                            {isBestValue && (
                                <span className="absolute -right-2 -top-2 border-2 border-gray-900 bg-green-300 px-2 py-1 text-xs font-black uppercase">
                                    Nilai terbaik
                                </span>
                            )}

                            <div>
                                <h3 className="pr-16 text-xl font-black">{pkg.name}</h3>
                                <p className="mt-2 min-h-10 text-sm font-semibold leading-relaxed text-gray-600">
                                    {pkg.description || `Akses belajar TKA ${level} selama ${days} hari.`}
                                </p>
                            </div>

                            <div className="mt-5 border-y-2 border-dashed border-gray-300 py-4">
                                <div className="flex flex-wrap items-end justify-between gap-3">
                                    <div>
                                        <div className="text-xs font-black uppercase tracking-wide text-gray-500">Harga paket</div>
                                        <div className="mt-1 text-3xl font-black text-blue-700">{rupiah(pkg.price)}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs font-black uppercase tracking-wide text-gray-500">Total dibayar</div>
                                        <div className="mt-1 text-xl font-black text-gray-900">{rupiah(totalPayment)}</div>
                                    </div>
                                </div>
                                <p className="mt-2 text-xs font-semibold text-gray-500">
                                    Total = harga paket {rupiah(pkg.price)} + biaya admin {rupiah(ADMIN_FEE)}.
                                </p>
                            </div>

                            <div className="my-5 flex-1 space-y-2 text-sm font-bold text-gray-700">
                                <div className="flex items-start gap-2"><CheckCircle2 size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-green-700"/> Full Tryout TKA {level}</div>
                                <div className="flex items-start gap-2"><CheckCircle2 size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-green-700"/> Mini Tryout selama paket aktif</div>
                                <div className="flex items-start gap-2"><CheckCircle2 size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-green-700"/> Masa aktif {days} hari</div>
                                <div className="flex items-start gap-2"><ShieldCheck size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-blue-700"/> Akses aktif setelah pembayaran terverifikasi</div>
                            </div>

                            <button
                                type="button"
                                disabled={Boolean(buying)}
                                aria-busy={isBuyingThis}
                                onClick={() => void buy(pkg.code, pkg.durationDays)}
                                className="inline-flex min-h-11 w-full items-center justify-center gap-2 border-2 border-gray-900 bg-blue-700 px-4 py-3 font-black text-white shadow-[3px_3px_0_0_#111] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-300 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isBuyingThis ? <Loader2 size={18} className="animate-spin" aria-hidden="true"/> : <Zap size={18} aria-hidden="true"/>}
                                {isBuyingThis
                                    ? 'Menyiapkan pembayaran...'
                                    : hasActivePass
                                        ? `Perpanjang ${days} hari · ${rupiah(totalPayment)}`
                                        : `Pilih ${days} hari · ${rupiah(totalPayment)}`}
                            </button>
                        </article>
                    )
                })}
            </div>

            <p className="text-xs font-semibold leading-relaxed text-gray-500">
                Pembayaran diproses melalui Midtrans. Akses tidak berubah jika pembayaran dibatalkan atau belum terverifikasi.
            </p>
        </section>
    )
}
