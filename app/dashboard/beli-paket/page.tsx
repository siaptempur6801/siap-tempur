'use client'

import React, { useState } from 'react'
import { Sparkles, Flame, Zap, Package } from 'lucide-react'
import { toast } from 'sonner'
import PaperBackground from '@/components/PaperBackground'
import CheckDoodle from '@/components/CheckDoodle'
import { PRICING_PACKAGES } from '@/lib/constants'
import { createPackageTransaction } from '@/app/actions/payment'
import Script from 'next/script'
import { cn } from '@/lib/utils'
import MockSnapModal from '@/components/dashboard/MockSnapModal'

export default function BeliPaketPage() {
    const [mockModalOpen, setMockModalOpen] = useState(false)
    const [currentTransaction, setCurrentTransaction] = useState<any>(null)

    const handleBuy = async (packageId: string) => {
        const loadingToast = toast.loading("Memproses pesanan...")

        try {
            const transaction = await createPackageTransaction(packageId)

            if (!transaction.token) {
                throw new Error("Gagal mendapatkan token pembayaran")
            }

            toast.dismiss(loadingToast)

            // CHECK IS MOCK?
            console.log("Transaction Token:", transaction.token)
            if (transaction.token.startsWith('mock_')) {
                setCurrentTransaction({
                    ...transaction,
                    amount: PRICING_PACKAGES.find(p => p.id === packageId)?.price || 0,
                    packageName: PRICING_PACKAGES.find(p => p.id === packageId)?.name || 'Paket'
                })
                setMockModalOpen(true)
                return
            }

            // REAL MIDTRANS FLOW
            // @ts-expect-error - snap is loaded via script
            window.snap.pay(transaction.token, {
                onSuccess: function (result: any) {
                    toast.success("Pembayaran Berhasil!", {
                        description: "Tiket tryout kamu akan segera ditambahkan."
                    })
                    console.log('success', result)
                },
                onPending: function (result: any) {
                    toast.info("Pembayaran Tertunda", {
                        description: "Silakan selesaikan pembayaran sesuai instruksi."
                    })
                    console.log('pending', result)
                },
                onError: function (result: any) {
                    toast.error("Pembayaran Gagal")
                    console.log('error', result)
                },
                onClose: function () {
                    toast.info("Pembayaran Dibatalkan")
                }
            })
        } catch (error: any) {
            toast.dismiss(loadingToast)
            toast.error("Terjadi Kesalahan", {
                description: error.message || "Gagal membuat transaksi."
            })
        }
    }

    // Helper to call our own webhook for simulation
    const simulateWebhook = async (status: string) => {
        if (!currentTransaction) return

        const loadingId = toast.loading("Simulasi verifikasi pembayaran...")
        setMockModalOpen(false)

        try {
            await fetch('/api/payments/webhook', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    order_id: currentTransaction.orderId,
                    transaction_status: status
                })
            })

            toast.dismiss(loadingId)

            if (status === 'settlement' || status === 'capture') {
                toast.success("Pembayaran (Simulasi) Berhasil!", {
                    description: "Quota tryout kamu sudah bertambah. Silakan refresh jika perlu."
                })
            } else if (status === 'pending') {
                toast.warning("Status: Pending", {
                    description: "Menunggu pembayaran..."
                })
            } else {
                toast.error("Status: Gagal/Expired")
            }
        } catch (e) {
            toast.dismiss(loadingId)
            toast.error("Gagal menghubungi server mock")
        }
    }

    return (
        <div className="font-body w-full flex flex-col relative">
            <PaperBackground />
            <Script
                src="https://app.sandbox.midtrans.com/snap/snap.js"
                data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
            />

            {/* MOCK MODAL */}
            <MockSnapModal
                isOpen={mockModalOpen}
                onClose={() => setMockModalOpen(false)}
                orderId={currentTransaction?.orderId || ''}
                amount={currentTransaction?.amount || 0}
                packageName={currentTransaction?.packageName || ''}
                onSuccess={() => simulateWebhook('settlement')}
                onPending={() => simulateWebhook('pending')}
                onError={() => simulateWebhook('expire')}
            />

            <div className="flex-1 flex flex-col justify-center items-center px-4 sm:px-6 py-6 sm:py-10 relative z-10 w-full max-w-7xl mx-auto">

                <div className="text-center mb-8 md:mb-16">
                    <h1 className="font-handwriting text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-4 text-gray-900 drop-shadow-sm flex items-center justify-center gap-4">
                        <Package className="w-12 h-12 text-indigo-600" /> Beli Paket
                    </h1>
                    <p className="font-handwriting text-xl sm:text-2xl md:text-3xl text-gray-600">Pilih "menu" latihanmu hari ini:</p>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 lg:gap-8 w-full max-w-6xl items-stretch">
                    {PRICING_PACKAGES.map((pkg) => (
                        <div
                            key={pkg.id}
                            className={cn(
                                "relative p-6 xl:p-8 border-2 transition-all duration-300 flex flex-col rounded-xl group",
                                pkg.bestSeller
                                    ? "bg-[#ffffeb] border-indigo-600 shadow-[10px_10px_0px_0px_rgba(79,70,229,0.15)] hover:shadow-[15px_15px_0px_0px_rgba(79,70,229,0.2)] lg:scale-[1.08] z-10"
                                    : "bg-white border-gray-300 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)] hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,0.1)]"
                            )}
                        >
                            {/* Tape decoration */}
                            <div className={cn(
                                "absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-6 border-l border-r border-white/50 shadow-sm transition-transform",
                                pkg.bestSeller ? "bg-yellow-300 rotate-2 group-hover:rotate-0" : "bg-yellow-100/80 rotate-2 group-hover:rotate-0"
                            )}></div>

                            {pkg.bestSeller && (
                                <div className="absolute top-2 right-2 text-red-600 font-handwriting text-xs md:text-sm font-bold border-2 border-red-600 px-3 py-1 rounded rotate-[-12deg] bg-white animate-pulse flex items-center gap-1">
                                    BEST SELLER <Flame className="w-3 h-3 fill-red-600" />
                                </div>
                            )}

                            <h3 className="font-handwriting text-3xl font-bold text-gray-800 border-b-2 border-indigo-50 pb-2 mb-4">
                                {pkg.name}
                            </h3>

                            <div className="mb-2 font-handwriting">
                                <span className="text-4xl md:text-5xl font-bold text-indigo-600">Rp {(pkg.price / 1000).toLocaleString()}k</span>
                                <span className="text-gray-400 text-lg">/ {pkg.tokens} Token</span>
                            </div>

                            {pkg.savings > 0 && (
                                <p className="font-handwriting text-green-700 text-sm md:text-base mb-6 bg-green-100 inline-flex px-4 py-1.5 rounded-full items-center gap-2 w-fit shadow-sm">
                                    Hemat Rp {(pkg.savings / 1000).toLocaleString()}k! <Sparkles className="w-5 h-5" />
                                </p>
                            )}

                            <div className="space-y-4 mb-8 font-handwriting text-gray-700 flex-grow text-lg md:text-xl">
                                {pkg.features.map((feature, i) => (
                                    <div key={i} className="flex items-start gap-2.5">
                                        <CheckDoodle className="w-6 h-6 mt-1" />
                                        <span>{feature}</span>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={() => handleBuy(pkg.id)}
                                className={cn(
                                    "w-full py-4 font-handwriting text-2xl font-bold rounded-lg transition-all cursor-pointer shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]",
                                    pkg.bestSeller
                                        ? "bg-indigo-600 text-white border-2 border-gray-900"
                                        : "bg-indigo-50 text-indigo-600 border-2 border-indigo-200"
                                )}
                            >
                                {pkg.bestSeller ? `Ambil Paket ${pkg.name}` : `Pilih ${pkg.name}`}
                            </button>
                        </div>
                    ))}
                </div>

                <div className="mt-12 sm:mt-20 text-center w-full px-2 sm:px-0">
                    <div className="inline-block bg-[#fff740] p-6 md:p-8 shadow-md rotate-1 font-handwriting text-xl sm:text-2xl max-w-4xl relative rounded-xl border-2 border-gray-900 overflow-hidden">
                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-red-500 shadow-sm z-10 border border-red-700"></div>
                        <p className="text-gray-900 leading-relaxed px-2 sm:px-4">
                            <strong>Catatan Admin:</strong> Masih ragu? Cicil aja pakai <strong>Paket Satuan</strong> dulu. Tapi kalau mau serius, <strong>Paket 5x</strong> paling untung! <Zap className="w-4 h-4 inline text-yellow-600" />
                        </p>
                        <div className="absolute bottom-1 right-2 opacity-20">
                            <Sparkles size={40} className="text-gray-900" />
                        </div>
                    </div>
                </div>

            </div>

        </div>
    )
}
