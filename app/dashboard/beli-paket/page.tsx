'use client'

import React from 'react'
import { Sparkles, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import PaperBackground from '@/components/PaperBackground'
import CheckDoodle from '@/components/CheckDoodle'





export default function BeliPaketPage() {
    const handleBuy = (packageName: string) => {
        toast.info("Fitur Pembayaran Belum Tersedia", {
            description: `Anda mencoba membeli ${packageName}. Sistem pembayaran sedang dalam pengembangan.`,
            icon: <AlertCircle className="text-blue-500" />
        })
    }

    return (
        <div className="font-body h-[calc(100vh-5rem)] w-full overflow-hidden flex flex-col relative">
            <PaperBackground />

            {/* Main Content Container - Compact & Centered */}
            <div className="flex-1 flex flex-col justify-center items-center px-4 py-2 relative z-10 w-full max-w-7xl mx-auto">

                {/* Header Section - Reduced Margins */}
                <div className="text-center mb-8">
                    <h1 className="font-handwriting text-3xl md:text-5xl font-bold mb-0 text-gray-900">Beli Paket</h1>
                    <p className="font-handwriting text-xl text-gray-600">Pilih "menu" latihanmu hari ini:</p>
                </div>

                {/* Cards Grid - Compact Gap */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full items-stretch">

                    {/* PRODUK 1: UTBK Satuan */}
                    <div className="relative bg-white p-3 border border-gray-300 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col rounded-lg">
                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-16 h-4 bg-yellow-100/80 border-l border-r border-white/50 shadow-sm rotate-1"></div>

                        <h3 className="font-handwriting text-lg font-bold text-gray-800 border-b border-blue-100 pb-1 mb-1">
                            UTBK Satuan
                        </h3>

                        <div className="mb-2 font-handwriting">
                            <span className="text-2xl font-bold text-blue-600">Rp 10k</span>
                            <span className="text-gray-400 text-xs">/ 1x Tryout</span>
                        </div>

                        <div className="space-y-1 mb-3 font-handwriting text-gray-700 flex-grow text-sm">
                            <div className="flex items-start gap-1.5"><CheckDoodle className="w-3.5 h-3.5 mt-1" /> <span>Full 7 Subtes</span></div>
                            <div className="flex items-start gap-1.5"><CheckDoodle className="w-3.5 h-3.5 mt-1" /> <span>195 Menit (Full)</span></div>
                            <div className="flex items-start gap-1.5"><CheckDoodle className="w-3.5 h-3.5 mt-1" /> <span>Sistem IRT</span></div>
                            <div className="flex items-start gap-1.5"><CheckDoodle className="w-3.5 h-3.5 mt-1" /> <span>Soal HOTS 2026</span></div>
                        </div>

                        <button onClick={() => handleBuy('UTBK Satuan')} className="w-full py-1 font-handwriting text-base font-bold bg-blue-50 text-blue-600 border border-blue-200 border-dashed rounded hover:bg-blue-100 hover:border-blue-400 transition cursor-pointer">
                            Beli
                        </button>
                    </div>

                    {/* PRODUK 2: UTBK Bundle (Highlight) */}
                    <div className="relative bg-white p-3 border-2 border-blue-100 shadow-md hover:shadow-lg transition-all duration-300 flex flex-col rounded-lg transform lg:scale-[1.02] z-10">
                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-16 h-4 bg-yellow-100/80 border-l border-r border-white/50 shadow-sm -rotate-1"></div>
                        <div className="absolute top-1 right-1 text-red-500 font-handwriting text-[10px] font-bold border border-red-500 px-1 rounded rotate-[-12deg]">BEST SELLER</div>

                        <h3 className="font-handwriting text-2xl font-bold text-gray-800 border-b border-blue-100 pb-1 mb-1">
                            UTBK Paket 3x
                        </h3>

                        <div className="mb-0.5 font-handwriting">
                            <span className="text-2xl font-bold text-blue-600">Rp 25k</span>
                            <span className="text-gray-400 text-xs">/ 3x Tryout</span>
                        </div>
                        <p className="font-handwriting text-green-600 text-[10px] mb-2 bg-green-50 inline-flex px-1.5 py-0.5 rounded-full items-center gap-1 w-fit">
                            Hemat Rp 5k! <Sparkles className="w-3 h-3" />
                        </p>

                        <div className="space-y-1 mb-3 font-handwriting text-gray-700 flex-grow text-sm">
                            <div className="flex items-start gap-1.5"><CheckDoodle className="w-3.5 h-3.5 mt-1" /> <span>Full 7 Subtes</span></div>
                            <div className="flex items-start gap-1.5"><CheckDoodle className="w-3.5 h-3.5 mt-1" /> <span>195 Menit (Full)</span></div>
                            <div className="flex items-start gap-1.5"><CheckDoodle className="w-3.5 h-3.5 mt-1" /> <span>Sistem IRT</span></div>
                            <div className="flex items-start gap-1.5"><CheckDoodle className="w-3.5 h-3.5 mt-1" /> <span>Soal HOTS 2026</span></div>
                        </div>

                        <button onClick={() => handleBuy('UTBK Paket 3x')} className="w-full py-1 font-handwriting text-base font-bold bg-blue-600 text-white border border-blue-700 rounded shadow-sm hover:shadow-none hover:translate-y-[1px] transition-all cursor-pointer">
                            Ambil Promo
                        </button>
                    </div>

                    {/* PRODUK 3: CPNS Satuan */}
                    <div className="relative bg-white p-3 border border-gray-300 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col rounded-lg">
                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-16 h-4 bg-yellow-100/80 border-l border-r border-white/50 shadow-sm rotate-2"></div>

                        <h3 className="font-handwriting text-lg font-bold text-gray-800 border-b border-indigo-100 pb-1 mb-1">
                            CPNS Satuan
                        </h3>

                        <div className="mb-2 font-handwriting">
                            <span className="text-2xl font-bold text-indigo-600">Rp 10k</span>
                            <span className="text-gray-400 text-xs">/ 1x Tryout</span>
                        </div>

                        <div className="space-y-1 mb-3 font-handwriting text-gray-700 flex-grow text-sm">
                            <div className="flex items-start gap-1.5"><CheckDoodle className="w-3.5 h-3.5 mt-1" /> <span>TWK, TIU, TKP</span></div>
                            <div className="flex items-start gap-1.5"><CheckDoodle className="w-3.5 h-3.5 mt-1" /> <span>100 Menit (CAT)</span></div>
                            <div className="flex items-start gap-1.5"><CheckDoodle className="w-3.5 h-3.5 mt-1" /> <span>Ranking Nas.</span></div>
                            <div className="flex items-start gap-1.5"><CheckDoodle className="w-3.5 h-3.5 mt-1" /> <span>Analisis PG</span></div>
                        </div>

                        <button onClick={() => handleBuy('CPNS Satuan')} className="w-full py-1 font-handwriting text-base font-bold bg-indigo-50 text-indigo-600 border border-indigo-200 border-dashed rounded hover:bg-indigo-100 hover:border-indigo-400 transition cursor-pointer">
                            Beli
                        </button>
                    </div>

                    {/* PRODUK 4: CPNS Bundle */}
                    <div className="relative bg-white p-3 border-2 border-indigo-100 shadow-md hover:shadow-lg transition-all duration-300 flex flex-col rounded-lg transform lg:scale-[1.02] z-10">
                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-16 h-4 bg-yellow-100/80 border-l border-r border-white/50 shadow-sm -rotate-1"></div>
                        <div className="absolute top-1 right-1 text-red-500 font-handwriting text-[10px] font-bold border border-red-500 px-1 rounded rotate-[-12deg]">BEST SELLER</div>

                        <h3 className="font-handwriting text-2xl font-bold text-gray-800 border-b border-indigo-100 pb-1 mb-1">
                            CPNS Paket 3x
                        </h3>

                        <div className="mb-0.5 font-handwriting">
                            <span className="text-2xl font-bold text-indigo-600">Rp 25k</span>
                            <span className="text-gray-400 text-xs">/ 3x Tryout</span>
                        </div>
                        <p className="font-handwriting text-green-600 text-[10px] mb-2 bg-green-50 inline-flex px-1.5 py-0.5 rounded-full items-center gap-1 w-fit">
                            Hemat Rp 5k! <Sparkles className="w-3 h-3" />
                        </p>

                        <div className="space-y-1 mb-3 font-handwriting text-gray-700 flex-grow text-sm">
                            <div className="flex items-start gap-1.5"><CheckDoodle className="w-3.5 h-3.5 mt-1" /> <span>TWK, TIU, TKP</span></div>
                            <div className="flex items-start gap-1.5"><CheckDoodle className="w-3.5 h-3.5 mt-1" /> <span>100 Menit (CAT)</span></div>
                            <div className="flex items-start gap-1.5"><CheckDoodle className="w-3.5 h-3.5 mt-1" /> <span>Ranking Nas.</span></div>
                            <div className="flex items-start gap-1.5"><CheckDoodle className="w-3.5 h-3.5 mt-1" /> <span>Analisis PG</span></div>
                        </div>

                        <button onClick={() => handleBuy('CPNS Paket 3x')} className="w-full py-1 font-handwriting text-base font-bold bg-indigo-600 text-white border border-indigo-700 rounded shadow-sm hover:shadow-none hover:translate-y-[1px] transition-all cursor-pointer">
                            Ambil Promo
                        </button>
                    </div>
                </div>

                {/* Footer Note - Very Compact */}
                <div className="mt-12 text-center w-full">
                    <div className="inline-block bg-[#fff740] p-3 shadow-sm rotate-1 font-handwriting text-xl max-w-3xl relative rounded-sm">
                        <div className="absolute -top-1.5 left-1/2 w-2 h-2 rounded-full bg-red-400 shadow-sm z-10"></div>
                        <p className="text-gray-900 leading-tight">
                            <strong>Catatan Admin:</strong> Kalau bingung mau pilih yang mana, ambil yang <strong>Paket 3x</strong> aja. Lebih hemat dan bisa buat latihan berkali-kali sampai bosen (tapi jangan bosen deng, nanti gak lulus hehe).
                        </p>
                    </div>
                </div>

            </div>
        </div>
    )
}
