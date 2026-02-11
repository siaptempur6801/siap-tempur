'use client'

import React from 'react'
import { Sparkles, AlertCircle, Flame, Zap } from 'lucide-react'
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
        <div className="font-body w-full flex flex-col relative">
            <PaperBackground />

            {/* Main Content Container - Compact & Centered */}
            <div className="flex-1 flex flex-col justify-center items-center px-4 sm:px-6 py-6 sm:py-10 relative z-10 w-full max-w-7xl mx-auto">

                {/* Header Section - Enhanced Sizes */}
                <div className="text-center mb-8 md:mb-16">
                    <h1 className="font-handwriting text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-4 text-gray-900 drop-shadow-sm">Beli Paket</h1>
                    <p className="font-handwriting text-xl sm:text-2xl md:text-3xl text-gray-600">Pilih "menu" latihanmu hari ini:</p>
                </div>

                {/* Cards Grid - 3 Columns for Desktop */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-8 w-full max-w-6xl items-stretch">

                    {/* PRODUK 1: SKD Satuan */}
                    <div className="relative bg-white p-6 xl:p-8 border-2 border-gray-300 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)] hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,0.1)] transition-all duration-300 flex flex-col rounded-xl group">
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-6 bg-yellow-100/80 border-l border-r border-white/50 shadow-sm rotate-2 group-hover:rotate-0 transition-transform"></div>

                        <h3 className="font-handwriting text-3xl font-bold text-gray-800 border-b-2 border-indigo-50 pb-2 mb-4">
                            SKD Satuan
                        </h3>

                        <div className="mb-6 font-handwriting">
                            <span className="text-4xl md:text-5xl font-bold text-indigo-600">Rp 10k</span>
                            <span className="text-gray-400 text-lg">/ 1 Token</span>
                        </div>

                        <div className="space-y-4 mb-8 font-handwriting text-gray-700 flex-grow text-lg md:text-xl">
                            <div className="flex items-start gap-2.5"><CheckDoodle className="w-6 h-6 mt-1" /> <span>Full Akses TWK, TIU, TKP</span></div>
                            <div className="flex items-start gap-2.5"><CheckDoodle className="w-6 h-6 mt-1" /> <span>Kunci & Pembahasan Lengkap</span></div>
                            <div className="flex items-start gap-2.5"><CheckDoodle className="w-6 h-6 mt-1" /> <span>Ranking Nasional Real-time</span></div>
                            <div className="flex items-start gap-2.5"><CheckDoodle className="w-6 h-6 mt-1" /> <span>Analisis Skor & Passing Grade</span></div>
                        </div>

                        <button onClick={() => handleBuy('SKD Satuan')} className="w-full py-4 font-handwriting text-2xl font-bold bg-indigo-50 text-indigo-600 border-2 border-indigo-200 border-dashed rounded-lg hover:bg-indigo-100 hover:border-indigo-400 transition cursor-pointer">
                            Coba Latihan Satuan
                        </button>
                    </div>

                    {/* PRODUK 2: SKD Paket 3x */}
                    <div className="relative bg-white p-6 xl:p-8 border-2 border-gray-300 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)] hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,0.1)] transition-all duration-300 flex flex-col rounded-xl group">
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-6 bg-yellow-200/90 border-l border-r border-white/50 shadow-sm -rotate-1 group-hover:rotate-0 transition-transform"></div>

                        <h3 className="font-handwriting text-3xl md:text-4xl font-bold text-gray-800 border-b-2 border-indigo-100 pb-2 mb-4">
                            SKD Paket 3x
                        </h3>

                        <div className="mb-2 font-handwriting">
                            <span className="text-4xl md:text-5xl font-bold text-indigo-600">Rp 25k</span>
                            <span className="text-gray-400 text-lg">/ 3 Token</span>
                        </div>
                        <p className="font-handwriting text-green-700 text-sm md:text-base mb-6 bg-green-100 inline-flex px-4 py-1.5 rounded-full items-center gap-2 w-fit shadow-sm">
                            Hemat Rp 5k! <Sparkles className="w-5 h-5" />
                        </p>

                        <div className="space-y-4 mb-8 font-handwriting text-gray-700 flex-grow text-lg md:text-xl">
                            <div className="flex items-start gap-2.5"><CheckDoodle className="w-6 h-6 mt-1" /> <span>3 Tiket Tryout CAT</span></div>
                            <div className="flex items-start gap-2.5"><CheckDoodle className="w-6 h-6 mt-1" /> <span>Kunci & Pembahasan Lengkap</span></div>
                            <div className="flex items-start gap-2.5"><CheckDoodle className="w-6 h-6 mt-1" /> <span>Ranking Nasional Real-time</span></div>
                            <div className="flex items-start gap-2.5"><CheckDoodle className="w-6 h-6 mt-1" /> <span>Masa Aktif Selamanya</span></div>
                        </div>

                        <button onClick={() => handleBuy('SKD Paket 3x')} className="w-full py-4 font-handwriting text-2xl font-bold bg-indigo-50 text-indigo-600 border-2 border-indigo-200 border-dashed rounded-lg hover:bg-indigo-100 hover:border-indigo-400 transition cursor-pointer">
                            Pilih Paket Hemat
                        </button>
                    </div>

                    {/* PRODUK 3: SKD Paket 5x + PDF (BEST SELLER) */}
                    <div className="relative bg-[#ffffeb] p-6 xl:p-8 border-4 border-indigo-600 shadow-[10px_10px_0px_0px_rgba(79,70,229,0.15)] hover:shadow-[15px_15px_0px_0px_rgba(79,70,229,0.2)] transition-all duration-300 flex flex-col rounded-xl lg:scale-[1.08] z-10 group">
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-28 h-8 bg-yellow-300 border-l border-r border-white/50 shadow-sm rotate-2 group-hover:rotate-0 transition-transform"></div>
                        <div className="absolute top-2 right-2 text-red-600 font-handwriting text-xs md:text-sm font-bold border-2 border-red-600 px-3 py-1 rounded rotate-[-12deg] bg-white animate-pulse flex items-center gap-1">BEST SELLER <Flame className="w-3 h-3 fill-red-600" /></div>

                        <h3 className="font-handwriting text-3xl md:text-4xl font-bold text-gray-900 border-b-2 border-indigo-200 pb-2 mb-4">
                            SKD Paket 5x
                        </h3>

                        <div className="mb-2 font-handwriting">
                            <span className="text-4xl md:text-5xl font-bold text-indigo-700">Rp 40k</span>
                            <span className="text-gray-500 text-lg">/ 5 Token</span>
                        </div>
                        <p className="font-handwriting text-green-700 text-sm md:text-base mb-6 bg-green-100 inline-flex px-4 py-1.5 rounded-full items-center gap-2 w-fit shadow-sm">
                            Hemat Rp 10k! <Sparkles className="w-5 h-5 fill-current" />
                        </p>

                        <div className="space-y-4 mb-8 font-handwriting text-gray-800 flex-grow text-lg md:text-xl">
                            <div className="flex items-start gap-2.5"><CheckDoodle className="w-6 h-6 mt-1" /> <span className="font-bold underline">5 Tiket Tryout CAT</span></div>
                            <div className="flex items-start gap-2.5"><CheckDoodle className="w-6 h-6 mt-1" /> <span>Kunci & Pembahasan Lengkap</span></div>
                            <div className="flex items-start gap-2.5"><CheckDoodle className="w-6 h-6 mt-1" /> <span>Ranking Nasional Real-time</span></div>
                            <div className="flex items-start gap-2.5"><CheckDoodle className="w-6 h-6 mt-1" /> <span>Materi Ringkasan Terupdate</span></div>
                        </div>

                        <button onClick={() => handleBuy('SKD Paket 5x')} className="w-full py-5 font-handwriting text-2xl md:text-3xl font-bold bg-indigo-600 text-white border-2 border-gray-900 rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all cursor-pointer">
                            Ambil Paket Hemat 5x Token
                        </button>
                    </div>

                </div>


                {/* Footer Note - Restored to Bottom */}
                <div className="mt-12 sm:mt-20 text-center w-full px-2 sm:px-0">
                    <div className="inline-block bg-[#fff740] p-6 md:p-8 shadow-md rotate-1 font-handwriting text-xl sm:text-2xl max-w-4xl relative rounded-xl border-2 border-gray-900 overflow-hidden">
                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-red-500 shadow-sm z-10 border border-red-700"></div>
                        <p className="text-gray-900 leading-relaxed px-2 sm:px-4">
                            <strong>Catatan Admin:</strong> Kalau bingung mau pilih yang mana, ambil yang <strong>Paket 3x</strong> aja. Lebih hemat dan bisa buat latihan berkali-kali sampai bosen (tapi jangan bosen deng, nanti gak lulus hehe). <Zap className="w-4 h-4 inline text-yellow-600" />
                        </p>
                        {/* Doodle lines for extra notebook effect */}
                        <div className="absolute bottom-1 right-2 opacity-20">
                            <Sparkles size={40} className="text-gray-900" />
                        </div>
                    </div>
                </div>

            </div>

        </div>
    )
}
