'use client'

import { Sparkles, Flame, Zap, Package, Smartphone, CheckCircle, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import CheckDoodle from '@/components/CheckDoodle'
import { useRouter } from 'next/navigation'
import { createPackageTransaction, syncPaymentStatus } from '@/app/actions/payment'
import { cn } from '@/lib/utils'
import { PRICING_PACKAGES as PRICING_PACKAGES_DATA } from '@/lib/constants'

const PRICING_PACKAGES = PRICING_PACKAGES_DATA

export default function BeliPaketClient() {
    const router = useRouter()

    const handleBuy = async (packageId: string) => {
        const loadingToast = toast.loading("Memproses pesanan...")

        try {
            const transaction = await createPackageTransaction(packageId)

            if (!transaction.token) {
                throw new Error("Gagal mendapatkan token pembayaran")
            }

            toast.dismiss(loadingToast)

            window.snap.pay(transaction.token, {
                onSuccess: async function (result) {
                    const loadingId = toast.loading("Memverifikasi pembayaran...")
                    await syncPaymentStatus(transaction.orderId)
                    toast.success("Pembayaran Berhasil!", {
                        id: loadingId,
                        description: "Tiket tryout kamu akan segera ditambahkan."
                    })
                    void result
                },
                onPending: async function (result) {
                    const loadingId = toast.loading("Memperbarui status...")
                    await syncPaymentStatus(transaction.orderId)
                    toast.info("Pembayaran Tertunda", {
                        id: loadingId,
                        description: "Silakan selesaikan pembayaran sesuai instruksi."
                    })
                    router.push('/cpns/dashboard/profile?tab=history')
                    void result
                },
                onError: function (result) {
                    toast.error("Pembayaran Gagal")
                    void result
                },
                onClose: async function () {
                    const loadingId = toast.loading("Memperiksa status terakhir...")
                    await syncPaymentStatus(transaction.orderId)
                    toast.info("Pembayaran Ditutup", { id: loadingId })
                }
            })
        } catch (error) {
            toast.dismiss(loadingToast)
            toast.error("Terjadi Kesalahan", {
                description: error instanceof Error ? error.message : "Gagal membuat transaksi."
            })
        }
    }

    return (
        <div className="flex-1 flex flex-col justify-center items-center px-4 sm:px-6 py-6 sm:py-10 relative z-10 w-full max-w-7xl mx-auto">
            <div className="text-center mb-8 md:mb-16">
                <h1 className="font-handwriting text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-4 text-gray-900 drop-shadow-sm flex items-center justify-center gap-4">
                    <Package className="w-12 h-12 text-indigo-600" /> Beli Paket
                </h1>
                <p className="font-handwriting text-xl sm:text-2xl md:text-3xl text-gray-600">Pilih "menu" tryout-mu hari ini:</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-6xl items-stretch">
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
                            <div className="absolute top-2 right-2 text-red-600 font-handwriting text-xs md:text-sm font-bold border-2 border-red-600 px-3 py-1 rounded -rotate-12 bg-white animate-pulse flex items-center gap-1">
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

                        <div className="space-y-4 mb-8 font-handwriting text-gray-700 grow text-lg md:text-xl">
                            {pkg.features.map((feature: string, i: number) => (
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

            {/* Best Practice Payment Instructions */}
            <div className="mt-16 sm:mt-24 w-full max-w-4xl mx-auto">
                <div className="text-center mb-10">
                    <h2 className="font-handwriting text-3xl sm:text-4xl font-bold text-gray-900 flex items-center justify-center gap-3">
                        <ShieldCheck className="w-8 h-8 text-green-600" />
                        Cara Pembayaran Cepat & Aman
                    </h2>
                    <p className="font-handwriting text-xl text-gray-600 mt-2">Best practice supaya tryout-mu langsung aktif!</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6 relative">
                    {/* Connecting Line for Desktop */}
                    <div className="hidden md:block absolute top-[45px] left-[10%] right-[10%] h-1 bg-gray-300 border-t-2 border-dashed border-gray-900 z-0 opacity-50"></div>

                    {/* Step 1 */}
                    <div className="relative z-10 flex flex-col items-center text-center group">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#ffffeb] border-2 border-gray-900 rounded-full flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group-hover:translate-x-[2px] group-hover:translate-y-[2px] group-hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all mb-4 z-10">
                            <Package className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-600" />
                        </div>
                        <div className="absolute top-0 right-[25%] bg-yellow-300 text-gray-900 font-black text-xs px-2 py-0.5 border-2 border-gray-900 rotate-12 z-20 shadow-sm">
                            1
                        </div>
                        <h3 className="font-handwriting text-xl font-bold text-gray-900 mb-2">Pilih Paket</h3>
                        <p className="font-handwriting text-lg text-gray-600">Tekan tombol pilih pada paket yang kamu inginkan.</p>
                    </div>

                    {/* Step 2 */}
                    <div className="relative z-10 flex flex-col items-center text-center group mt-6 md:mt-0">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#e0f2fe] border-2 border-gray-900 rounded-full flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group-hover:translate-x-[2px] group-hover:translate-y-[2px] group-hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all mb-4 z-10">
                            <ShieldCheck className="w-8 h-8 sm:w-10 sm:h-10 text-blue-600" />
                        </div>
                        <div className="absolute top-0 right-[25%] bg-blue-300 text-gray-900 font-black text-xs px-2 py-0.5 border-2 border-gray-900 -rotate-12 z-20 shadow-sm">
                            2
                        </div>
                        <h3 className="font-handwriting text-xl font-bold text-gray-900 mb-2">Data Otomatis</h3>
                        <p className="font-handwriting text-lg text-gray-600">Sistem akan otomatis merekap nama dan email dari akunmu.</p>
                    </div>

                    {/* Step 3 */}
                    <div className="relative z-10 flex flex-col items-center text-center group mt-6 md:mt-0">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#fce7f3] border-2 border-gray-900 rounded-full flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group-hover:translate-x-[2px] group-hover:translate-y-[2px] group-hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all mb-4 z-10">
                            <Smartphone className="w-8 h-8 sm:w-10 sm:h-10 text-pink-600" />
                        </div>
                        <div className="absolute top-0 right-[25%] bg-pink-300 text-gray-900 font-black text-xs px-2 py-0.5 border-2 border-gray-900 rotate-6 z-20 shadow-sm">
                            3
                        </div>
                        <h3 className="font-handwriting text-xl font-bold text-gray-900 mb-2">Scan QRIS</h3>
                        <p className="font-handwriting text-lg text-gray-600">Buka m-banking atau e-wallet (Gopay, Dana, dll), lalu scan QR-nya!</p>
                    </div>

                    {/* Step 4 */}
                    <div className="relative z-10 flex flex-col items-center text-center group mt-6 md:mt-0">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#dcfce7] border-2 border-gray-900 rounded-full flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group-hover:translate-x-[2px] group-hover:translate-y-[2px] group-hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all mb-4 z-10">
                            <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-green-600" />
                        </div>
                        <div className="absolute top-0 right-[25%] bg-green-300 text-gray-900 font-black text-xs px-2 py-0.5 border-2 border-gray-900 -rotate-6 z-20 shadow-sm">
                            4
                        </div>
                        <h3 className="font-handwriting text-xl font-bold text-gray-900 mb-2">Lunas & Tryout</h3>
                        <p className="font-handwriting text-lg text-gray-600">Setelah dibayar, kuota otomatis masuk. Langsung Gas!</p>
                    </div>

                </div>
            </div>

            <div className="mt-16 sm:mt-24 text-center w-full px-2 sm:px-0">
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
    )
}
