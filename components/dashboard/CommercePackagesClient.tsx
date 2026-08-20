'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Copy, ExternalLink, Flame, Package, QrCode, RefreshCw, ShieldCheck, Sparkles, Zap } from 'lucide-react'
import { toast } from 'sonner'
import {
    createPackageTransaction,
    createQrisQaTransaction,
    syncPaymentStatus,
    type CreateQrisQaTransactionResult,
} from '@/app/actions/payment'
import { cn } from '@/lib/utils'

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
    }).format(value)
}

export default function CommercePackagesClient({
    packages,
    qaQrisEnabled = false,
}: {
    packages: CommercePackage[]
    qaQrisEnabled?: boolean
}) {
    const router = useRouter()
    const [qaQris, setQaQris] = useState<QrisQaData | null>(null)
    const unitPackage = packages
        .filter((pkg) => pkg.tokenGrant > 0)
        .sort((a, b) => a.tokenGrant - b.tokenGrant)[0]
    const referenceUnitPrice = unitPackage ? unitPackage.price / unitPackage.tokenGrant : 0

    const handleBuy = async (productCode: string) => {
        const loadingToast = toast.loading('Memproses pesanan...')
        try {
            const transaction = await createPackageTransaction(productCode)
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
                    const id = toast.loading('Memverifikasi pembayaran...')
                    await syncPaymentStatus(transaction.orderId)
                    toast.success('Pembayaran berhasil!', {
                        id,
                        description: 'Token akan masuk otomatis setelah pembayaran terverifikasi.',
                    })
                    router.refresh()
                },
                onPending: async () => {
                    const id = toast.loading('Memperbarui status...')
                    await syncPaymentStatus(transaction.orderId)
                    toast.info('Pembayaran tertunda', { id })
                },
                onError: () => {
                    toast.error('Pembayaran gagal')
                },
                onClose: async () => {
                    const id = toast.loading('Memeriksa status terakhir...')
                    await syncPaymentStatus(transaction.orderId)
                    toast.info('Pembayaran ditutup', { id })
                },
            })
        } catch (error) {
            toast.dismiss(loadingToast)
            toast.error('Terjadi kesalahan', {
                description: error instanceof Error ? error.message : 'Gagal membuat transaksi.',
            })
        }
    }

    const handleQaQris = async (productCode: string) => {
        const loadingToast = toast.loading('Membuat QRIS Sandbox QA...')
        try {
            const transaction = await createQrisQaTransaction(productCode)
            if (!transaction.success) {
                toast.error('QRIS QA gagal dibuat', {
                    id: loadingToast,
                    description: transaction.message,
                })
                return
            }

            setQaQris(transaction)
            toast.success('QRIS Sandbox QA siap', {
                id: loadingToast,
                description: 'Direct QR image URL sudah disimpan di metadata payment.',
            })
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
            toast.error('Browser gagal menyalin URL. Salin manual dari kolom URL.')
        }
    }

    const openSimulator = async () => {
        if (!qaQris) return
        window.open(qaQris.simulatorUrl, '_blank', 'noopener,noreferrer')
        try {
            await navigator.clipboard.writeText(qaQris.qrImageUrl)
            toast.success('Simulator dibuka', {
                description: 'Code Img URL sudah dicopy. Paste ke kolom Code Img URL lalu klik Scan QR.',
            })
        } catch {
            toast.info('Simulator dibuka', {
                description: 'Copy URL QR secara manual dari panel lalu paste ke Code Img URL.',
            })
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
        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-8 sm:px-6 sm:py-12">
            <div className="mb-10 text-center">
                <h1 className="font-handwriting flex items-center justify-center gap-3 text-4xl font-bold text-gray-900 sm:text-6xl">
                    <Package className="h-11 w-11 text-indigo-600" /> Beli Paket
                </h1>
                <p className="font-handwriting mt-3 text-xl text-gray-600 sm:text-2xl">
                    Harga dan benefit langsung dari katalog SiapTempur.
                </p>
            </div>

            {qaQrisEnabled && (
                <div className="mb-8 border-2 border-amber-800 bg-amber-50 p-4 shadow-[4px_4px_0_0_#92400e]">
                    <div className="flex items-start gap-3">
                        <QrCode className="mt-0.5 h-6 w-6 shrink-0 text-amber-800" />
                        <div>
                            <div className="font-black text-amber-950">Staging Admin — QRIS Sandbox QA</div>
                            <p className="mt-1 text-sm font-semibold text-amber-900">
                                Tombol QRIS QA memakai Midtrans Core API Sandbox agar direct QR image URL tersimpan otomatis. Jalur pembelian user biasa tetap menggunakan Snap.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {packages.length === 0 ? (
                <div className="mx-auto w-full max-w-2xl border-2 border-gray-900 bg-white p-8 text-center shadow-[6px_6px_0_0_#111]">
                    <Package className="mx-auto h-10 w-10" />
                    <h2 className="mt-3 text-xl font-black">Belum ada paket aktif</h2>
                    <p className="mt-2 text-gray-600">Admin belum mengaktifkan harga produk.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                    {packages.map((pkg) => {
                        const saving = referenceUnitPrice > 0 && pkg.tokenGrant > 0
                            ? Math.max(0, Math.round(referenceUnitPrice * pkg.tokenGrant - pkg.price))
                            : 0
                        const bestSeller = pkg.tokenGrant === 5
                        const features = [
                            `${pkg.tokenGrant} token Full Tryout CPNS`,
                            '110 soal SKD per Full Tryout',
                            'Masuk Ranking Nasional',
                            'Token tersimpan di wallet akun',
                        ]

                        return (
                            <article
                                key={pkg.code}
                                className={cn(
                                    'relative flex flex-col border-2 border-gray-900 bg-white p-6 shadow-[7px_7px_0_0_#111]',
                                    bestSeller && 'bg-yellow-50 lg:-translate-y-3'
                                )}
                            >
                                {bestSeller && (
                                    <div className="absolute -right-3 -top-3 flex items-center gap-1 border-2 border-gray-900 bg-red-500 px-3 py-1 text-sm font-black text-white">
                                        <Flame className="h-4 w-4" /> BEST SELLER
                                    </div>
                                )}

                                <h2 className="font-handwriting text-3xl font-black text-gray-900">{pkg.name}</h2>
                                <p className="mt-2 min-h-12 font-semibold text-gray-500">
                                    {pkg.description || `${pkg.tokenGrant} token Full Tryout CPNS`}
                                </p>

                                <div className="mt-5">
                                    <div className="text-4xl font-black text-indigo-600">{rupiah(pkg.price)}</div>
                                    <div className="mt-1 font-bold text-gray-500">{pkg.tokenGrant} token</div>
                                </div>

                                {saving > 0 && (
                                    <div className="mt-4 flex w-fit items-center gap-2 border-2 border-green-700 bg-green-100 px-3 py-1 font-bold text-green-800">
                                        <Sparkles className="h-4 w-4" /> Hemat {rupiah(saving)}
                                    </div>
                                )}

                                <div className="my-6 flex-1 space-y-3">
                                    {features.map((feature) => (
                                        <div key={feature} className="flex items-start gap-2 font-semibold text-gray-700">
                                            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                                            <span>{feature}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-3">
                                    <button
                                        onClick={() => handleBuy(pkg.code)}
                                        className={cn(
                                            'flex w-full items-center justify-center gap-2 border-2 border-gray-900 py-3 text-lg font-black shadow-[4px_4px_0_0_#111] transition hover:translate-x-1 hover:translate-y-1 hover:shadow-none',
                                            bestSeller ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700'
                                        )}
                                    >
                                        <Zap className="h-5 w-5" /> Pilih Paket
                                    </button>

                                    {qaQrisEnabled && (
                                        <button
                                            onClick={() => handleQaQris(pkg.code)}
                                            className="flex w-full items-center justify-center gap-2 border-2 border-amber-800 bg-amber-100 py-2.5 font-black text-amber-950 shadow-[3px_3px_0_0_#92400e] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
                                        >
                                            <QrCode className="h-5 w-5" /> QRIS QA
                                        </button>
                                    )}
                                </div>
                            </article>
                        )
                    })}
                </div>
            )}

            {qaQrisEnabled && qaQris && (
                <section className="mx-auto mt-12 w-full max-w-4xl border-2 border-gray-900 bg-white p-5 shadow-[7px_7px_0_0_#111] sm:p-7">
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <div className="text-xs font-black uppercase tracking-widest text-amber-700">Staging QA only</div>
                            <h2 className="font-handwriting text-3xl font-black text-gray-900">QRIS Sandbox siap disimulasikan</h2>
                        </div>
                        <div className="border-2 border-gray-900 bg-yellow-100 px-3 py-2 text-sm font-black">
                            {rupiah(qaQris.amount)}
                        </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-[280px_1fr]">
                        <div className="border-2 border-gray-900 bg-white p-3">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={qaQris.qrImageUrlV2 || qaQris.qrImageUrl}
                                alt="QRIS Sandbox QA"
                                className="h-auto w-full"
                            />
                        </div>

                        <div className="min-w-0 space-y-4">
                            <div>
                                <div className="mb-1 text-sm font-black text-gray-700">Order</div>
                                <code className="block break-all border-2 border-gray-300 bg-gray-50 p-2 text-xs font-bold">
                                    {qaQris.orderNumber}
                                </code>
                            </div>

                            <div>
                                <div className="mb-1 text-sm font-black text-gray-700">Code Img URL</div>
                                <div className="flex gap-2">
                                    <input
                                        readOnly
                                        value={qaQris.qrImageUrl}
                                        className="min-w-0 flex-1 border-2 border-gray-900 bg-gray-50 px-3 py-2 text-xs font-semibold"
                                    />
                                    <button
                                        onClick={copyQrisUrl}
                                        className="border-2 border-gray-900 bg-white px-3 py-2 font-black shadow-[2px_2px_0_0_#111]"
                                        title="Copy Code Img URL"
                                    >
                                        <Copy className="h-5 w-5" />
                                    </button>
                                </div>
                                <p className="mt-2 text-xs font-semibold text-gray-500">
                                    URL ini juga tersimpan di <code>payments.raw_response.qrImageUrl</code>.
                                </p>
                            </div>

                            <div className="flex flex-col gap-3 sm:flex-row">
                                <button
                                    onClick={openSimulator}
                                    className="flex flex-1 items-center justify-center gap-2 border-2 border-gray-900 bg-emerald-500 px-4 py-3 font-black text-white shadow-[4px_4px_0_0_#111] transition hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
                                >
                                    <ExternalLink className="h-5 w-5" /> Simulate QRIS
                                </button>
                                <button
                                    onClick={checkQaStatus}
                                    className="flex flex-1 items-center justify-center gap-2 border-2 border-gray-900 bg-blue-50 px-4 py-3 font-black text-blue-900 shadow-[4px_4px_0_0_#111] transition hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
                                >
                                    <RefreshCw className="h-5 w-5" /> Cek Status
                                </button>
                            </div>

                            <div className="border-2 border-amber-700 bg-amber-50 p-3 text-sm font-semibold text-amber-950">
                                <strong>Simulate QRIS</strong> membuka Midtrans Sandbox Simulator dan menyalin Code Img URL. Paste URL tersebut ke kolom <strong>Code Img URL</strong>, lalu klik <strong>Scan QR</strong>. Jangan scan QR Sandbox dengan aplikasi pembayaran nyata.
                            </div>
                        </div>
                    </div>
                </section>
            )}

            <div className="mx-auto mt-14 flex max-w-3xl items-start gap-3 border-2 border-gray-900 bg-green-50 p-5 shadow-[5px_5px_0_0_#111]">
                <ShieldCheck className="h-7 w-7 shrink-0 text-green-700" />
                <div>
                    <h3 className="font-black text-gray-900">Pembayaran diverifikasi server-side</h3>
                    <p className="mt-1 text-sm font-semibold text-gray-600">
                        Token hanya masuk melalui webhook/status Midtrans yang valid dan fulfillment bersifat idempotent, jadi callback ganda tidak menggandakan token.
                    </p>
                </div>
            </div>
        </div>
    )
}
