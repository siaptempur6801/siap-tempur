'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Copy, ExternalLink, Loader2, QrCode, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import {
    createQrisQaTransaction,
    syncPaymentStatus,
    type CreateQrisQaTransactionResult,
} from '@/app/actions/payment'

type QrisQaData = Extract<CreateQrisQaTransactionResult, { success: true }>

export type TkaPassQaOffer = {
    code: string
    name: string
    price: number
    durationDays: number | null
}

function rupiah(value: number) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(value)
}

export default function TkaPassQrisQaClient({
    level,
    offers,
}: {
    level: string
    offers: TkaPassQaOffer[]
}) {
    const router = useRouter()
    const [creating, setCreating] = useState<string | null>(null)
    const [qaQris, setQaQris] = useState<QrisQaData | null>(null)

    const createQris = async (productCode: string) => {
        if (creating) return
        setCreating(productCode)
        const id = toast.loading('Membuat QRIS Sandbox QA...')
        try {
            const result = await createQrisQaTransaction(productCode)
            if (!result.success) {
                toast.error('QRIS QA gagal dibuat', { id, description: result.message })
                return
            }
            setQaQris(result)
            toast.success('QRIS Sandbox QA siap', {
                id,
                description: 'Gunakan simulator Midtrans, bukan aplikasi pembayaran nyata.',
            })
        } catch (error) {
            toast.error('QRIS QA gagal dibuat', {
                id,
                description: error instanceof Error ? error.message : 'Terjadi kesalahan.',
            })
        } finally {
            setCreating(null)
        }
    }

    const copyQrisUrl = async () => {
        if (!qaQris) return
        try {
            await navigator.clipboard.writeText(qaQris.qrImageUrl)
            toast.success('Code Img URL disalin')
        } catch {
            toast.error('Gagal menyalin URL. Salin manual dari kolom URL.')
        }
    }

    const openSimulator = async () => {
        if (!qaQris) return
        window.open(qaQris.simulatorUrl, '_blank', 'noopener,noreferrer')
        try {
            await navigator.clipboard.writeText(qaQris.qrImageUrl)
            toast.success('Simulator dibuka', {
                description: 'Code Img URL sudah dicopy. Paste lalu klik Scan QR.',
            })
        } catch {
            toast.info('Simulator dibuka', {
                description: 'Copy Code Img URL manual lalu paste ke simulator.',
            })
        }
    }

    const sync = async () => {
        if (!qaQris) return
        const id = toast.loading('Sinkronisasi status Midtrans...')
        const ok = await syncPaymentStatus(qaQris.orderId)
        if (ok) {
            toast.success('Status pembayaran disinkronkan', { id })
            router.refresh()
        } else {
            toast.error('Gagal sinkronisasi status', { id })
        }
    }

    return (
        <main className="min-h-screen bg-[#fdfbf7] px-4 py-8 text-gray-900 md:px-8 md:py-12">
            <div className="mx-auto max-w-4xl space-y-6">
                <div>
                    <Link href={`/tka/${level.toLowerCase()}`} className="font-black text-blue-700 hover:underline">
                        ← Kembali ke TKA {level}
                    </Link>
                    <div className="mt-4 border-2 border-amber-800 bg-amber-50 p-5 shadow-[5px_5px_0_0_#92400e]">
                        <div className="flex items-start gap-3">
                            <QrCode className="mt-1 shrink-0 text-amber-800" />
                            <div>
                                <div className="text-xs font-black uppercase tracking-wider text-amber-700">Staging admin only</div>
                                <h1 className="mt-1 text-3xl font-black">Tempur Pass TKA {level} — QRIS QA</h1>
                                <p className="mt-2 font-semibold text-amber-950">
                                    Buat transaksi Sandbox, settle melalui simulator Midtrans, lalu sinkronkan agar fulfillment membuat entitlement canonical.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <section className="grid gap-4 md:grid-cols-2">
                    {offers.map((offer) => (
                        <article key={offer.code} className="border-2 border-gray-900 bg-white p-5 shadow-[4px_4px_0_0_#111]">
                            <div className="text-xs font-black uppercase text-blue-700">{offer.code}</div>
                            <h2 className="mt-1 text-xl font-black">{offer.name}</h2>
                            <div className="mt-4 text-3xl font-black text-blue-700">{rupiah(offer.price)}</div>
                            <div className="text-sm font-bold text-gray-500">{offer.durationDays ?? '-'} hari + admin Rp500</div>
                            <button
                                type="button"
                                disabled={Boolean(creating)}
                                onClick={() => void createQris(offer.code)}
                                className="mt-5 inline-flex w-full items-center justify-center gap-2 border-2 border-gray-900 bg-amber-300 px-4 py-3 font-black shadow-[3px_3px_0_0_#111] disabled:opacity-50"
                            >
                                {creating === offer.code ? <Loader2 size={18} className="animate-spin" /> : <QrCode size={18} />}
                                {creating === offer.code ? 'Membuat QRIS...' : 'Buat QRIS QA'}
                            </button>
                        </article>
                    ))}
                </section>

                {qaQris && (
                    <section className="border-2 border-gray-900 bg-white p-5 shadow-[6px_6px_0_0_#111]">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <div className="text-xs font-black uppercase text-green-700">QRIS Sandbox siap</div>
                                <h2 className="text-2xl font-black">{qaQris.orderNumber}</h2>
                            </div>
                            <div className="border-2 border-gray-900 bg-yellow-100 px-3 py-2 font-black">{rupiah(qaQris.amount)}</div>
                        </div>

                        <div className="mt-5 grid gap-5 md:grid-cols-[260px_1fr]">
                            <div className="border-2 border-gray-900 p-3">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={qaQris.qrImageUrlV2 || qaQris.qrImageUrl} alt="QRIS Sandbox" className="h-auto w-full" />
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <div className="mb-1 text-sm font-black">Code Img URL</div>
                                    <div className="flex gap-2">
                                        <input readOnly value={qaQris.qrImageUrl} className="min-w-0 flex-1 border-2 border-gray-900 bg-gray-50 px-3 py-2 text-xs font-semibold" />
                                        <button type="button" onClick={() => void copyQrisUrl()} className="border-2 border-gray-900 bg-white px-3 shadow-[2px_2px_0_0_#111]" title="Copy URL">
                                            <Copy size={18}/>
                                        </button>
                                    </div>
                                </div>

                                <button type="button" onClick={() => void openSimulator()} className="inline-flex w-full items-center justify-center gap-2 border-2 border-gray-900 bg-emerald-500 px-4 py-3 font-black text-white shadow-[3px_3px_0_0_#111]">
                                    <ExternalLink size={18}/> Buka Midtrans Simulator
                                </button>
                                <button type="button" onClick={() => void sync()} className="inline-flex w-full items-center justify-center gap-2 border-2 border-gray-900 bg-blue-100 px-4 py-3 font-black shadow-[3px_3px_0_0_#111]">
                                    <RefreshCw size={18}/> Sinkronkan Status
                                </button>

                                <p className="border-2 border-amber-700 bg-amber-50 p-3 text-sm font-semibold text-amber-950">
                                    Di simulator: paste <strong>Code Img URL</strong> → <strong>Scan QR</strong> → lakukan settlement. Setelah itu kembali ke halaman ini dan klik <strong>Sinkronkan Status</strong>.
                                </p>
                            </div>
                        </div>
                    </section>
                )}
            </div>
        </main>
    )
}
