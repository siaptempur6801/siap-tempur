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
        <section className="space-y-5" aria-labelledby="tka-pass-packages-title">
            <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-blue-600">
                    <Crown size={17} aria-hidden="true"/> Tempur Pass
                </div>
                <h2 id="tka-pass-packages-title" className="mt-2 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
                    {hasActivePass ? 'Jaga ritme belajar, tambah masa aktifmu' : 'Pilih durasi untuk rencana belajarmu'}
                </h2>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">
                    {hasActivePass
                        ? 'Lanjutkan persiapanmu dengan durasi tambahan. Perpanjangan dimulai setelah masa aktif saat ini berakhir, sehingga sisa aksesmu tetap utuh.'
                        : 'Mulai dengan persiapan satu bulan atau beri diri lebih banyak waktu untuk latihan rutin. Mini Tryout dan Full Tryout tersedia sesuai akses paket selama masa aktif.'}
                </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
                {packages.map((pkg) => {
                    const days = pkg.durationDays ?? 0
                    const isBestValue = pkg.code === bestValueCode
                    const isBuyingThis = buying === pkg.code

                    return (
                        <article
                            key={pkg.code}
                            className={`st-card-md relative flex h-full flex-col overflow-hidden p-5 md:p-6 ${isBestValue ? 'bg-gradient-to-b from-indigo-50/80 to-white' : 'bg-white'}`}
                        >
                            {isBestValue && <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-blue-500" />}
                            {isBestValue && (
                                <span className="absolute right-4 top-4 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700 ring-1 ring-emerald-100">Hemat per hari</span>
                            )}

                            <div>
                                <h3 className="pr-24 text-xl font-black tracking-tight text-slate-950">{pkg.name}</h3>
                                <p className="mt-2 min-h-10 text-sm font-semibold leading-relaxed text-slate-500">
                                    {days === 30 ? 'Satu bulan untuk mulai rutin, mengenali kemampuan, dan menentukan fokus latihan.' : days === 90 ? 'Lebih banyak waktu untuk membangun kebiasaan, mengulang latihan, dan mengevaluasi progres.' : pkg.description || `Siapkan rencana belajarmu dengan akses TKA ${level} selama ${days} hari.`}
                                </p>
                            </div>

                            <div className="mt-5 rounded-lg border border-slate-100 bg-slate-50/80 p-4">
                                <div className="text-xs font-black uppercase tracking-wide text-slate-400">Harga</div>
                                <div className="mt-1 text-3xl font-black tracking-tight text-blue-700">{rupiah(pkg.price)}</div>
                            </div>

                            <div className="my-5 flex-1 space-y-2.5 text-sm font-bold text-slate-700">
                                <Benefit icon={<CheckCircle2 size={17}/>} text={`Ukur kesiapan dengan Full Tryout TKA ${level}`} />
                                <Benefit icon={<CheckCircle2 size={17}/>} text="Evaluasi per mata pelajaran lewat Mini Tryout" />
                                <Benefit icon={<CheckCircle2 size={17}/>} text={`${days} hari untuk menjalankan rencana belajarmu`} />
                                <Benefit icon={<ShieldCheck size={17}/>} text="Akses aktif setelah pembayaran terverifikasi" blue />
                            </div>

                            <button
                                type="button"
                                disabled={Boolean(buying)}
                                aria-busy={isBuyingThis}
                                onClick={() => void buy(pkg.code, pkg.durationDays)}
                                className="st-focus inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-none transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                            >
                                {isBuyingThis ? <Loader2 size={17} className="animate-spin" aria-hidden="true"/> : <Zap size={17} aria-hidden="true"/>}
                                {isBuyingThis
                                    ? 'Menyiapkan pembayaran...'
                                    : hasActivePass
                                        ? `Perpanjang ${days} hari · ${rupiah(pkg.price)}`
                                        : `Aktifkan ${days} hari · ${rupiah(pkg.price)}`}
                            </button>
                        </article>
                    )
                })}
            </div>

            <p className="text-xs font-semibold leading-relaxed text-slate-500">Pembayaran diproses melalui Midtrans. Akses tidak berubah jika pembayaran dibatalkan atau belum terverifikasi.</p>
        </section>
    )
}

function Benefit({ icon, text, blue = false }: { icon: React.ReactNode; text: string; blue?: boolean }) {
    return (
        <div className="flex items-start gap-2.5">
            <span className={`mt-0.5 shrink-0 ${blue ? 'text-blue-600' : 'text-emerald-600'}`}>{icon}</span>
            <span>{text}</span>
        </div>
    )
}
