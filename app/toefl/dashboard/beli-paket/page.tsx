'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
    Check, 
    Zap, 
    ShieldCheck, 
    CreditCard, 
    Loader2,
    ShoppingBag,
    Headphones,
    BookOpen,
    PencilLine,
    Info
} from 'lucide-react'
import { createPackageTransaction } from '@/app/actions/payment'
import { TOEFL_PRICING_PACKAGES } from '@/lib/constants'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function ToeflBeliPaketPage() {
    const [loading, setLoading] = useState<string | null>(null)

    const handlePurchase = async (packageId: string) => {
        try {
            setLoading(packageId)
            const result = await createPackageTransaction(packageId)

            if (result.token) {
                window.snap.pay(result.token, {
                    onSuccess: function () {
                        toast.success("Pembayaran berhasil!")
                        window.location.href = '/toefl/dashboard'
                    },
                    onPending: function () {
                        toast.info("Menunggu pembayaran...")
                        window.location.href = '/toefl/dashboard'
                    },
                    onError: function () {
                        toast.error("Pembayaran gagal.")
                    },
                    onClose: function () {
                        toast.warning("Widget pembayaran ditutup.")
                        setLoading(null)
                    }
                })
            }
        } catch (error) {
            console.error(error)
            toast.error("Gagal membuat transaksi.")
            setLoading(null)
        }
    }

    return (
        <div className="max-w-6xl mx-auto space-y-12 font-handwriting py-8">
            <div className="text-center space-y-4">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-100 border-2 border-gray-900 text-blue-900 font-bold uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -rotate-1"
                >
                    <ShoppingBag size={18} /> Upgrade Your Score
                </motion.div>
                <h1 className="text-5xl md:text-6xl font-black tracking-tight text-gray-900">
                    Pilih Paket <span className="text-blue-600 underline decoration-wavy decoration-3">TOEFL</span> Kamu
                </h1>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto font-medium">
                    Satu token untuk satu kali simulasi lengkap (Listening, Structure, & Reading). 
                    Tanpa masa aktif, bisa dipakai kapan saja!
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 max-w-4xl mx-auto px-4">
                {TOEFL_PRICING_PACKAGES.map((pkg, idx) => (
                    <motion.div
                        key={pkg.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className={cn(
                            "relative flex flex-col p-8 bg-white border-2 border-gray-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all",
                            pkg.bestSeller && "bg-blue-50/50 ring-4 ring-blue-600/10 ring-offset-2"
                        )}
                    >
                        {pkg.bestSeller && (
                            <div className="absolute -top-4 -right-4 bg-yellow-400 border-2 border-gray-900 px-4 py-1.5 text-xs font-black uppercase tracking-tighter rotate-12 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-10">
                                Best Value
                            </div>
                        )}

                        <div className="mb-8">
                            <h3 className="text-2xl font-black mb-1 flex items-center gap-2">
                                {pkg.name}
                                {pkg.tokens > 1 && <Zap size={20} className="text-blue-500 fill-current" />}
                            </h3>
                            <div className="flex items-baseline gap-1 mb-4">
                                <span className="text-4xl font-black">Rp {pkg.price.toLocaleString()}</span>
                                <span className="text-gray-500 font-bold">/ {pkg.tokens} Token</span>
                            </div>
                            
                            {pkg.savings > 0 && (
                                <div className="inline-block px-3 py-1 bg-green-100 border border-green-600 text-green-700 text-xs font-bold rounded-full mb-4">
                                    Hemat Rp {pkg.savings.toLocaleString()}!
                                </div>
                            )}
                        </div>

                        <div className="flex-1 space-y-4 mb-8">
                            <div className="text-xs font-black uppercase text-gray-400 border-b border-gray-100 pb-2 flex items-center gap-2">
                                <Info size={14} /> Apa yang kamu dapat:
                            </div>
                            {pkg.features.map((feature, fIdx) => (
                                <div key={fIdx} className="flex items-start gap-3 group">
                                    <div className="mt-1 w-5 h-5 bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-600 rounded shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                        <Check size={12} strokeWidth={4} />
                                    </div>
                                    <span className="text-gray-700 font-bold leading-tight">{feature}</span>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={() => handlePurchase(pkg.id)}
                            disabled={loading !== null}
                            className={cn(
                                "w-full py-4 px-6 border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all flex items-center justify-center gap-3 text-xl font-black uppercase tracking-tighter",
                                pkg.bestSeller ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-white text-gray-900 hover:bg-gray-50"
                            )}
                        >
                            {loading === pkg.id ? (
                                <Loader2 className="animate-spin" />
                            ) : (
                                <CreditCard />
                            )}
                            Beli Sekarang
                        </button>
                    </motion.div>
                ))}
            </div>

            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 pt-12">
                <div className="flex items-center gap-4 p-5 bg-gray-50 border-2 border-dashed border-gray-300">
                    <div className="w-12 h-12 bg-white border border-gray-200 flex items-center justify-center text-blue-600 shadow-sm">
                        <Headphones size={24} />
                    </div>
                    <div className="text-sm">
                        <p className="font-bold text-gray-900">Audio Jernih</p>
                        <p className="text-gray-500">Listening Part A, B, C lengkap</p>
                    </div>
                </div>
                <div className="flex items-center gap-4 p-5 bg-gray-50 border-2 border-dashed border-gray-300">
                    <div className="w-12 h-12 bg-white border border-gray-200 flex items-center justify-center text-blue-600 shadow-sm">
                        <BookOpen size={24} />
                    </div>
                    <div className="text-sm">
                        <p className="font-bold text-gray-900">Real Interface</p>
                        <p className="text-gray-500">Simulasi mirip ujian asli</p>
                    </div>
                </div>
                <div className="flex items-center gap-4 p-5 bg-gray-50 border-2 border-dashed border-gray-300">
                    <div className="w-12 h-12 bg-white border border-gray-200 flex items-center justify-center text-blue-600 shadow-sm">
                        <PencilLine size={24} />
                    </div>
                    <div className="text-sm">
                        <p className="font-bold text-gray-900">Valid Scores</p>
                        <p className="text-gray-500">Scoring akurat ITP standards</p>
                    </div>
                </div>
            </div>

            <div className="text-center pb-20">
                <p className="text-gray-500 font-bold mb-4 flex items-center justify-center gap-2">
                    <ShieldCheck className="text-green-500" /> Pembayaran Aman & Otomatis via Midtrans
                </p>
                <div className="flex justify-center gap-4 opacity-50 grayscale">
                    <div className="px-4 py-2 border border-gray-300 text-xs font-bold uppercase">QRIS</div>
                    <div className="px-4 py-2 border border-gray-300 text-xs font-bold uppercase">M-Banking</div>
                    <div className="px-4 py-2 border border-gray-300 text-xs font-bold uppercase">E-Wallet</div>
                </div>
            </div>
        </div>
    )
}
