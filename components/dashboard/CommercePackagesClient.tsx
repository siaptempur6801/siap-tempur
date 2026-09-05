'use client'

import { useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { CheckCircle2, Copy, ExternalLink, Package, QrCode, RefreshCw, ShieldCheck, Sparkles, Zap } from 'lucide-react'
import { toast } from 'sonner'
import {
    createPackageTransaction,
    createQrisQaTransaction,
    syncPaymentStatus,
    type CreateQrisQaTransactionResult,
} from '@/app/actions/payment'
import { cn } from '@/lib/utils'
import tkaStyles from './TkaTokenPackages.module.css'

export type CommercePackage = {
    code: string
    name: string
    description: string | null
    price: number
    currency: string
    tokenGrant: number
}

type QrisQaData = Extract<CreateQrisQaTransactionResult, { success: true }>

function rupiah(value: number) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(value).replace(/\s+/g, '')
}

export default function CommercePackagesClient({
    packages,
    qaQrisEnabled = false,
    program = 'CPNS',
}: {
    packages: CommercePackage[]
    qaQrisEnabled?: boolean
    program?: 'CPNS' | 'TKA'
}) {
    const router = useRouter()
    const pathname = usePathname()
    const [qaQris, setQaQris] = useState<QrisQaData | null>(null)
    const [buying, setBuying] = useState<string | null>(null)

    const bestValueCode = useMemo(() => {
        const ranked = packages
            .filter((pkg) => pkg.tokenGrant > 0)
            .map((pkg) => ({ code: pkg.code, unitPrice: pkg.price / pkg.tokenGrant }))
            .sort((a, b) => a.unitPrice - b.unitPrice)
        if (ranked.length < 2) return null
        return ranked[0]?.code ?? null
    }, [packages])

    const unitPackage = packages
        .filter((pkg) => pkg.tokenGrant > 0)
        .sort((a, b) => a.tokenGrant - b.tokenGrant)[0]
    const referenceUnitPrice = unitPackage ? unitPackage.price / unitPackage.tokenGrant : 0

    const handleBuy = async (productCode: string) => {
        if (buying) return
        setBuying(productCode)
        const loadingToast = toast.loading('Menyiapkan pembayaran...')
        try {
            const returnPath = program === 'TKA'
                ? `${pathname.replace(/\/beli-token$/, '/profile')}?tab=history`
                : '/cpns/dashboard/profile'
            const transaction = await createPackageTransaction(productCode, returnPath)
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
                    const id = toast.loading('Memverifikasi pembayaran...')
                    const ok = await syncPaymentStatus(transaction.orderId)
                    if (ok) {
                        toast.success('Pembayaran berhasil', {
                            id,
                            description: 'Token akan tersedia di akunmu setelah pembayaran terverifikasi.',
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
                        description: 'Selesaikan pembayaran sesuai petunjuk pada metode yang kamu pilih.',
                    })
                },
                onError: () => {
                    toast.error('Pembayaran belum berhasil', {
                        description: 'Coba lagi atau pilih metode pembayaran lain.',
                    })
                },
                onClose: async () => {
                    const id = toast.loading('Memeriksa status pembayaran...')
                    await syncPaymentStatus(transaction.orderId)
                    toast.info('Pembayaran belum selesai', {
                        id,
                        description: 'Token tidak ditambahkan sebelum pembayaran berhasil diverifikasi.',
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

    const handleQaQris = async (productCode: string) => {
        const loadingToast = toast.loading('Membuat QRIS Sandbox QA...')
        try {
            const transaction = await createQrisQaTransaction(productCode)
            if (!transaction.success) {
                toast.error('QRIS QA gagal dibuat', { id: loadingToast, description: transaction.message })
                return
            }
            setQaQris(transaction)
            toast.success('QRIS Sandbox QA siap', { id: loadingToast })
        } catch (error) {
            toast.error('QRIS QA gagal dibuat', {
                id: loadingToast,
                description: error instanceof Error ? error.message : 'Terjadi kesalahan.',
            })
        }
    }

    const copyQrisUrl = async () => {
        if (!qaQris) return
        try {
            await navigator.clipboard.writeText(qaQris.qrImageUrl)
            toast.success('Code Img URL disalin')
        } catch {
            toast.error('Browser gagal menyalin URL.')
        }
    }

    const openSimulator = async () => {
        if (!qaQris) return
        window.open(qaQris.simulatorUrl, '_blank', 'noopener,noreferrer')
        try {
            await navigator.clipboard.writeText(qaQris.qrImageUrl)
            toast.success('Simulator dibuka dan URL QR disalin')
        } catch {
            toast.info('Simulator dibuka. Salin URL QR secara manual dari panel.')
        }
    }

    const checkQaStatus = async () => {
        if (!qaQris) return
        const id = toast.loading('Sinkronisasi status Midtrans...')
        const ok = await syncPaymentStatus(qaQris.orderId)
        if (ok) {
            toast.success('Status pembayaran sudah disinkronkan', { id })
            router.refresh()
        } else {
            toast.error('Gagal sinkronisasi status', { id })
        }
    }

    return (
        <div className={cn('st-product mx-auto w-full max-w-7xl space-y-10 font-body text-[var(--st-ink)]', program === 'TKA' && tkaStyles.packages)}>
            <header className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
                <div className="max-w-3xl">
                    <div className="st-kicker"><Package size={15} /> Paket token {program}</div>
                    <h1 className="st-heading-display mt-5 text-4xl sm:text-5xl md:text-6xl">{program === 'TKA' ? 'Beli token' : 'Pilih token sesuai ritme tryout-mu.'}</h1>
                    <p className="st-muted mt-4 max-w-2xl text-base font-semibold leading-relaxed md:text-lg">
                        {program === 'TKA'
                            ? 'Siapkan token untuk langkah belajar berikutnya. Pilih paket sesuai kebutuhan, lalu gunakan pada sesi yang ingin kamu kerjakan. Jumlah token yang diperlukan selalu terlihat sebelum mulai.'
                            : 'Token digunakan untuk akses tryout sesuai aturan yang ditampilkan sebelum sesi dimulai. Harga paket berasal dari katalog aktif SiapTempur.'}
                    </p>
                </div>
                <div className="st-card bg-blue-50 p-4 sm:min-w-64">
                    <div className="text-xs font-black uppercase tracking-[0.12em] text-blue-700">{program === 'TKA' ? 'Pilih sesuai rencana belajarmu' : 'Sebelum membayar'}</div>
                    <p className="mt-2 text-sm font-bold leading-relaxed text-gray-700">{program === 'TKA' ? 'Mulai dengan paket kecil atau siapkan lebih banyak token untuk latihan rutin. Bandingkan harga per token sebelum memilih.' : 'Periksa jumlah token, harga paket, dan total yang tampil di halaman pembayaran.'}</p>
                </div>
            </header>

            {qaQrisEnabled && (
                <section className="border-2 border-amber-800 bg-amber-50 p-4 shadow-[4px_4px_0_#92400e]" aria-label="Staging QRIS QA">
                    <div className="flex items-start gap-3">
                        <QrCode className="mt-0.5 h-6 w-6 shrink-0 text-amber-800" />
                        <div>
                            <div className="font-black text-amber-950">Staging Admin · QRIS Sandbox QA</div>
                            <p className="mt-1 text-sm font-semibold text-amber-900">Panel ini hanya tampil untuk akun berizin di staging. Pembelian user biasa tetap memakai checkout reguler.</p>
                        </div>
                    </div>
                </section>
            )}

            {packages.length === 0 ? (
                <section className="st-card-md mx-auto max-w-2xl p-8 text-center">
                    <Package className="mx-auto h-10 w-10" />
                    <h2 className="st-heading mt-3 text-xl">Belum ada paket token aktif.</h2>
                    <p className="st-muted mt-2 text-sm font-semibold">Pilihan paket akan muncul di sini setelah tersedia.</p>
                </section>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {packages.map((pkg) => {
                        const saving = referenceUnitPrice > 0 && pkg.tokenGrant > 0
                            ? Math.max(0, Math.round(referenceUnitPrice * pkg.tokenGrant - pkg.price))
                            : 0
                        const isBestValue = pkg.code === bestValueCode
                        const isBuying = buying === pkg.code

                        return (
                            <article key={pkg.code} className={cn('st-card-md relative flex flex-col p-6', isBestValue && 'bg-[var(--st-yellow-soft)]')}>
                                {isBestValue && (
                                    <span className="st-kicker absolute -right-2 -top-3 bg-[var(--st-yellow)]">{program === 'TKA' ? 'Harga per token terendah' : 'Nilai per token terbaik'}</span>
                                )}

                                <div className="pr-20">
                                    <h2 className="st-heading text-2xl">{pkg.name}</h2>
                                    <p className="st-muted mt-2 min-h-10 text-sm font-semibold leading-relaxed">
                                        {program === 'TKA' ? (pkg.code === unitPackage?.code ? 'Mulai secukupnya, fokus pada sesi yang paling kamu butuhkan.' : 'Siapkan bekal untuk latihan berikutnya dan bangun ritme belajar yang konsisten.') : pkg.description || `${pkg.tokenGrant} token untuk akses tryout CPNS.`}
                                    </p>
                                </div>

                                <div className="mt-6 border-y-2 border-[var(--st-ink)] py-4">
                                    <div className="text-4xl font-black text-blue-700">{rupiah(pkg.price)}</div>
                                    <div className="mt-1 text-sm font-bold text-gray-600">{pkg.tokenGrant} token · sekitar {rupiah(Math.round(pkg.price / pkg.tokenGrant))}/token</div>
                                </div>

                                {saving > 0 && (
                                    <div className="mt-4 inline-flex w-fit items-center gap-2 border-2 border-[var(--st-ink)] bg-green-100 px-3 py-1 text-sm font-black text-green-800">
                                        <Sparkles size={15} /> Lebih hemat {rupiah(saving)} dibanding harga paket terkecil
                                    </div>
                                )}

                                <div className="my-6 flex-1 space-y-3 text-sm font-semibold text-gray-700">
                                    <Benefit text={`${pkg.tokenGrant} token masuk ke akun setelah pembayaran terverifikasi`} />
                                    <Benefit text={program === 'TKA' ? 'Kamu pilih sesi belajarnya, kebutuhan token jelas sebelum mulai' : 'Gunakan token pada tryout yang menampilkan kebutuhan token'} />
                                    <Benefit text={program === 'TKA' ? 'Sisa token tersimpan untuk langkah belajar berikutnya' : 'Sisa token tetap tersimpan di akunmu'} />
                                </div>

                                <button
                                    type="button"
                                    onClick={() => handleBuy(pkg.code)}
                                    disabled={Boolean(buying)}
                                    className="st-button inline-flex min-h-12 w-full items-center justify-center gap-2 bg-blue-600 px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <Zap size={18} /> {isBuying ? 'Menyiapkan pembayaran...' : `${program === 'TKA' ? 'Beli' : 'Pilih'} ${pkg.tokenGrant} token`}
                                </button>

                                {qaQrisEnabled && (
                                    <button
                                        type="button"
                                        onClick={() => handleQaQris(pkg.code)}
                                        className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 border-2 border-amber-800 bg-amber-100 px-4 py-2 text-sm font-black text-amber-950 shadow-[3px_3px_0_#92400e]"
                                    >
                                        <QrCode size={17} /> QRIS QA
                                    </button>
                                )}
                            </article>
                        )
                    })}
                </div>
            )}

            {qaQrisEnabled && qaQris && (
                <section className="mx-auto w-full max-w-4xl border-2 border-[var(--st-ink)] bg-white p-5 shadow-[6px_6px_0_var(--st-ink)] sm:p-7">
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <div className="text-xs font-black uppercase tracking-widest text-amber-700">Staging QA only</div>
                            <h2 className="st-heading text-2xl">QRIS Sandbox siap disimulasikan</h2>
                        </div>
                        <div className="border-2 border-[var(--st-ink)] bg-[var(--st-yellow)] px-3 py-2 text-sm font-black">{rupiah(qaQris.amount)}</div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-[280px_1fr]">
                        <div className="border-2 border-[var(--st-ink)] bg-white p-3">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={qaQris.qrImageUrlV2 || qaQris.qrImageUrl} alt="QRIS Sandbox QA" className="h-auto w-full" />
                        </div>
                        <div className="min-w-0 space-y-4">
                            <div>
                                <div className="mb-1 text-sm font-black">Order</div>
                                <code className="block break-all border-2 border-gray-300 bg-gray-50 p-2 text-xs font-bold">{qaQris.orderNumber}</code>
                            </div>
                            <div>
                                <div className="mb-1 text-sm font-black">Code Img URL</div>
                                <div className="flex gap-2">
                                    <input readOnly value={qaQris.qrImageUrl} className="st-input min-w-0 flex-1 text-xs" />
                                    <button type="button" onClick={copyQrisUrl} className="border-2 border-[var(--st-ink)] bg-white px-3 py-2 shadow-[2px_2px_0_var(--st-ink)]" title="Copy Code Img URL"><Copy size={18} /></button>
                                </div>
                            </div>
                            <div className="flex flex-col gap-3 sm:flex-row">
                                <button type="button" onClick={openSimulator} className="st-button flex flex-1 items-center justify-center gap-2 bg-emerald-500 px-4 py-3 font-black text-white"><ExternalLink size={18} /> Simulate QRIS</button>
                                <button type="button" onClick={checkQaStatus} className="st-button flex flex-1 items-center justify-center gap-2 bg-blue-50 px-4 py-3 font-black text-blue-900"><RefreshCw size={18} /> Cek Status</button>
                            </div>
                            <div className="border-2 border-amber-700 bg-amber-50 p-3 text-sm font-semibold text-amber-950">Gunakan hanya Sandbox Simulator. Jangan gunakan aplikasi pembayaran nyata untuk QR Sandbox.</div>
                        </div>
                    </div>
                </section>
            )}

            <section className="st-card mx-auto flex max-w-3xl items-start gap-3 bg-green-50 p-5">
                <ShieldCheck className="h-6 w-6 shrink-0 text-green-700" />
                <div>
                    <h3 className="font-black">{program === 'TKA' ? 'Bayar, cek saldo, lanjut belajar.' : 'Token masuk setelah pembayaran terverifikasi.'}</h3>
                    <p className="st-muted mt-1 text-sm font-semibold leading-relaxed">{program === 'TKA' ? 'Token masuk setelah pembayaran berhasil diverifikasi. Periksa total di halaman pembayaran, lalu pantau pembelian dan saldo melalui riwayat akunmu.' : 'Jika pembayaran masih menunggu atau ditutup sebelum selesai, saldo token tidak berubah. Status terbaru akan terlihat setelah pembayaran berhasil diverifikasi.'}</p>
                </div>
            </section>
        </div>
    )
}

function Benefit({ text }: { text: string }) {
    return (
        <div className="flex items-start gap-2.5">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
            <span>{text}</span>
        </div>
    )
}
