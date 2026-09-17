'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
    CheckCircle2,
    Coins,
    Copy,
    ExternalLink,
    Loader2,
    Package,
    QrCode,
    RefreshCw,
    ShieldCheck,
    Sparkles,
    Wallet,
    Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import {
    createPackageTransaction,
    createQrisQaTransaction,
    syncPaymentStatus,
    type CreateQrisQaTransactionResult,
} from '@/app/actions/payment'

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
    level,
    tokenBalance,
}: {
    packages: CommercePackage[]
    qaQrisEnabled?: boolean
    program?: 'CPNS' | 'TKA'
    level?: string
    tokenBalance?: number
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

    const effectiveLevel = level || 'SMP'

    return (
        <div className="space-y-6 md:space-y-8">
            {/* Header Section */}
            <header className="border-b border-slate-200/80 pb-6 text-slate-950">
                <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700 ring-1 ring-indigo-200/50">
                    <Coins size={14} className="text-indigo-600" aria-hidden="true" />
                    <span>
                        {program === 'TKA' ? `Beli Token · TKA ${effectiveLevel}` : 'Beli Paket Token CPNS'}
                    </span>
                </div>
                <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                    {program === 'TKA' ? 'Beli Paket Token Ujian' : 'Beli Paket Token Tryout SKD CPNS'}
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">
                    {program === 'TKA'
                        ? 'Siapkan token untuk mengikuti tryout CAT dan sesi latihan terpandu. Pilih paket sesuai kebutuhan belajarmu, token berlaku selamanya dan tersimpan aman di akunmu.'
                        : 'Pilih token sesuai ritme tryout-mu. Token digunakan untuk akses simulasi CAT SKD dan drilling materi berstandar nasional.'}
                </p>
            </header>

            {/* Quick Context & Stat Tiles */}
            <div className="grid gap-4 sm:grid-cols-3">
                <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition hover:border-indigo-200">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
                        <Wallet size={20} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Saldo Akunmu</p>
                        <p className="text-base font-extrabold text-slate-900">
                            {tokenBalance !== undefined ? `${tokenBalance} Token Tersedia` : 'Token Terintegrasi'}
                        </p>
                        <Link
                            href={program === 'TKA' ? `/tka/${effectiveLevel.toLowerCase()}/profile?tab=history` : '/cpns/dashboard/profile'}
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
                        >
                            Lihat riwayat transaksi →
                        </Link>
                    </div>
                </div>

                <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition hover:border-emerald-200">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
                        <Sparkles size={20} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Masa Berlaku</p>
                        <p className="text-base font-extrabold text-slate-900">Aktif Selamanya</p>
                        <p className="text-xs text-slate-500">Tanpa batas waktu kedaluwarsa</p>
                    </div>
                </div>

                <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition hover:border-blue-200">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
                        <ShieldCheck size={20} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Verifikasi Instan</p>
                        <p className="text-base font-extrabold text-slate-900">Otomatis & Aman</p>
                        <p className="text-xs text-slate-500">QRIS, VA Bank & E-Wallet via Midtrans</p>
                    </div>
                </div>
            </div>

            {/* QA QRIS Panel (Staging Admin Only) */}
            {qaQrisEnabled && (
                <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 shadow-xs" aria-label="Staging QRIS QA">
                    <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                            <QrCode size={20} />
                        </div>
                        <div>
                            <div className="text-sm font-bold text-amber-950">Staging Admin · QRIS Sandbox QA</div>
                            <p className="mt-0.5 text-xs text-amber-900">
                                Panel ini hanya tampil untuk akun berizin di staging. Pembelian pengguna biasa tetap menggunakan alur checkout resmi Midtrans.
                            </p>
                        </div>
                    </div>
                </section>
            )}

            {/* Empty State */}
            {packages.length === 0 ? (
                <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                        <Package size={24} />
                    </div>
                    <h2 className="mt-3 text-lg font-bold text-slate-900">Belum ada paket token aktif.</h2>
                    <p className="mt-1 text-sm text-slate-500">Pilihan paket akan otomatis muncul di sini setelah katalog diperbarui.</p>
                </section>
            ) : (
                /* Packages Grid */
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {packages.map((pkg) => {
                        const saving = referenceUnitPrice > 0 && pkg.tokenGrant > 0
                            ? Math.max(0, Math.round(referenceUnitPrice * pkg.tokenGrant - pkg.price))
                            : 0
                        const isBestValue = pkg.code === bestValueCode
                        const isBuying = buying === pkg.code

                        return (
                            <article
                                key={pkg.code}
                                className={`relative flex flex-col justify-between rounded-2xl border bg-white p-6 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                                    isBestValue
                                        ? 'border-indigo-300 bg-gradient-to-b from-indigo-50/40 via-white to-white ring-2 ring-indigo-600/90 ring-offset-2'
                                        : 'border-slate-200/80 hover:border-slate-300'
                                }`}
                            >
                                {/* Best Value Top Badge */}
                                {isBestValue && (
                                    <div className="absolute -top-3 right-5">
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 px-3 py-1 text-[11px] font-black tracking-wide text-white shadow-xs">
                                            <Sparkles size={12} />
                                            <span>Nilai Terbaik · Paling Hemat</span>
                                        </span>
                                    </div>
                                )}

                                <div>
                                    {/* Card Header */}
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-xs ${
                                                isBestValue
                                                    ? 'bg-indigo-600 text-white'
                                                    : 'bg-slate-100 text-slate-700'
                                            }`}
                                        >
                                            <Coins size={22} />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold tracking-tight text-slate-950">
                                                {pkg.name}
                                            </h2>
                                            <span className="text-xs font-semibold text-slate-500">
                                                {pkg.tokenGrant} Token Siap Pakai
                                            </span>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <p className="mt-3 min-h-10 text-xs font-medium leading-relaxed text-slate-600 sm:text-sm">
                                        {program === 'TKA'
                                            ? (pkg.code === unitPackage?.code
                                                ? 'Mulai secukupnya, fokus pada sesi latihan yang paling kamu perlukan.'
                                                : 'Siapkan bekal untuk latihan berikutnya dan bangun ritme belajar yang konsisten.')
                                            : pkg.description || `${pkg.tokenGrant} token untuk akses simulasi tryout.`}
                                    </p>

                                    {/* Price & Unit Metric */}
                                    <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Harga</p>
                                        <p className="mt-1 text-3xl font-extrabold tracking-tight text-slate-950">
                                            {rupiah(pkg.price)}
                                        </p>
                                        <p className="mt-0.5 text-xs font-medium text-slate-600">
                                            {pkg.tokenGrant} token · sekitar{' '}
                                            <b className="text-slate-900">{rupiah(Math.round(pkg.price / pkg.tokenGrant))}</b>/token
                                        </p>
                                    </div>

                                    {/* Saving Pill */}
                                    {saving > 0 && (
                                        <div className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
                                            <Sparkles size={13} />
                                            <span>Hemat {rupiah(saving)} dibanding paket satuan</span>
                                        </div>
                                    )}

                                    {/* Benefits List */}
                                    <div className="my-5 flex-1 space-y-2 text-xs font-medium text-slate-700">
                                        <Benefit text={`${pkg.tokenGrant} token otomatis masuk ke akun setelah pembayaran`} />
                                        <Benefit text={program === 'TKA' ? 'Digunakan untuk Tryout CAT & modul latihan terpandu' : 'Digunakan untuk simulasi Tryout CAT & drilling materi'} />
                                        <Benefit text="Sisa token tersimpan aman tanpa masa kedaluwarsa" />
                                    </div>
                                </div>

                                {/* Purchase Action Button */}
                                <div className="space-y-2.5 border-t border-slate-100 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => handleBuy(pkg.code)}
                                        disabled={Boolean(buying)}
                                        aria-busy={isBuying}
                                        className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${
                                            isBestValue
                                                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs hover:shadow'
                                                : 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs'
                                        }`}
                                    >
                                        {isBuying ? (
                                            <>
                                                <Loader2 size={16} className="animate-spin" />
                                                <span>Menyiapkan pembayaran...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Zap size={16} />
                                                <span>Pilih & Beli {pkg.tokenGrant} Token</span>
                                            </>
                                        )}
                                    </button>

                                    {qaQrisEnabled && (
                                        <button
                                            type="button"
                                            onClick={() => handleQaQris(pkg.code)}
                                            className="flex min-h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-950 transition hover:bg-amber-100"
                                        >
                                            <QrCode size={14} />
                                            <span>QRIS QA Sandbox</span>
                                        </button>
                                    )}
                                </div>
                            </article>
                        )
                    })}
                </div>
            )}

            {/* Staging Simulator Panel */}
            {qaQrisEnabled && qaQris && (
                <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs sm:p-6">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                        <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600">Staging QA Simulator</span>
                            <h2 className="text-xl font-bold text-slate-900">QRIS Sandbox Siap Disimulasikan</h2>
                        </div>
                        <div className="rounded-xl bg-amber-50 px-3 py-1.5 text-sm font-bold text-amber-900 ring-1 ring-amber-200">
                            {rupiah(qaQris.amount)}
                        </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-[240px_1fr]">
                        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={qaQris.qrImageUrlV2 || qaQris.qrImageUrl} alt="QRIS Sandbox QA" className="h-auto w-full rounded-lg" />
                        </div>
                        <div className="space-y-3.5">
                            <div>
                                <span className="text-xs font-bold text-slate-500">Order ID</span>
                                <code className="mt-1 block break-all rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs font-mono text-slate-800">
                                    {qaQris.orderNumber}
                                </code>
                            </div>
                            <div>
                                <span className="text-xs font-bold text-slate-500">QR Code Image URL</span>
                                <div className="mt-1 flex gap-2">
                                    <input readOnly value={qaQris.qrImageUrl} className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700" />
                                    <button
                                        type="button"
                                        onClick={copyQrisUrl}
                                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs"
                                        title="Salin URL QR"
                                    >
                                        <Copy size={14} /> Salin
                                    </button>
                                </div>
                            </div>
                            <div className="flex flex-col gap-2.5 sm:flex-row pt-1">
                                <button
                                    type="button"
                                    onClick={openSimulator}
                                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
                                >
                                    <ExternalLink size={14} /> Buka Simulator QRIS
                                </button>
                                <button
                                    type="button"
                                    onClick={checkQaStatus}
                                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                                >
                                    <RefreshCw size={14} /> Sinkronkan Status
                                </button>
                            </div>
                            <p className="rounded-lg bg-amber-50 p-2.5 text-xs text-amber-900 border border-amber-200/60">
                                Gunakan hanya Sandbox Simulator resmi Midtrans. Jangan scan QR Sandbox dengan aplikasi e-wallet nyata.
                            </p>
                        </div>
                    </div>
                </section>
            )}

            {/* Reassurance Footer Notice */}
            <section className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/70 via-white to-blue-50/40 p-4 sm:p-5 text-xs text-indigo-950 shadow-xs">
                <div className="flex items-start gap-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 shadow-xs">
                        <ShieldCheck size={20} />
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-bold text-slate-900 text-sm">
                            {program === 'TKA' ? 'Pembayaran Aman & Verifikasi Otomatis' : 'Token Masuk Otomatis Setelah Pembayaran'}
                        </h3>
                        <p className="mt-1 text-slate-600 leading-relaxed">
                            {program === 'TKA'
                                ? 'Seluruh pembayaran diproses secara resmi melalui payment gateway Midtrans. Token akan otomatis ditambahkan ke saldo akunmu seketika setelah transaksi terverifikasi. Jika proses pembayaran ditutup sebelum selesai, saldo tidak akan berkurang.'
                                : 'Jika pembayaran masih menunggu atau ditutup sebelum selesai, saldo token tidak berubah. Status terbaru akan otomatis diperbarui setelah pembayaran berhasil diverifikasi.'}
                        </p>
                    </div>
                </div>
            </section>
        </div>
    )
}

function Benefit({ text }: { text: string }) {
    return (
        <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <span>{text}</span>
        </div>
    )
}
