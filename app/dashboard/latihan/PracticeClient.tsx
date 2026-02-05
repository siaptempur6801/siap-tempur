'use client'

import { startTryout } from '@/app/actions/practice'
import { ArrowRight, Loader2, Target, Zap, Ticket, BookOpen } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface PracticeClientProps {
    quota: number
    quotaUtbk: number
}

export default function PracticeClient({ quota, quotaUtbk }: PracticeClientProps) {
    const [loadingTryout, setLoadingTryout] = useState(false)
    const router = useRouter()

    const handleStartTryout = async () => {
        if (quota <= 0) {
            toast.error("Kuota Habis!", {
                description: "Silahkan beli paket Tryout terlebih dahulu untuk melanjutkan.",
                action: {
                    label: "Beli Paket",
                    onClick: () => router.push('/dashboard/beli-paket')
                }
            })
            return
        }

        try {
            setLoadingTryout(true)
            const result = await startTryout()

            if (result?.error) {
                toast.error(result.error)
                return
            }

            if (result?.success && result?.sessionId) {
                toast.success('Tryout SKD dimulai!')
                router.push(`/dashboard/latihan/${result.sessionId}`)
            }
        } catch (_error) {
            toast.error('Gagal memulai tryout')
        } finally {
            setLoadingTryout(false)
        }
    }

    return (
        <div className="space-y-8 p-4 md:p-8 max-w-7xl mx-auto font-handwriting">
            {/* Hero Section - Matching Tryout Page */}
            <div className="relative overflow-hidden rounded-sm border-2 border-gray-900 bg-[#fdfbf7] p-6 md:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                {/* Paper Lines Background */}
                <div className="absolute inset-0 z-0 opacity-20 pointer-events-none"
                    style={{ backgroundImage: "repeating-linear-gradient(transparent, transparent 1.9rem, #9ca3af 2rem)", backgroundSize: "100% 2rem", marginTop: "1rem" }}
                />

                <div className="relative z-10 max-w-3xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-yellow-300 border-2 border-gray-900 text-gray-900 text-xs font-bold uppercase tracking-wider shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] mb-3 transform -rotate-1">
                        <Target size={14} className="fill-current" />
                        <span>Tryout Mandiri</span>
                    </div>

                    <h1 className="text-3xl md:text-4xl font-bold mb-2 text-gray-900">
                        Menu Tryout
                    </h1>

                    <p className="text-lg text-gray-700 max-w-2xl leading-relaxed">
                        Pilih jenis ujian yang ingin kamu kerjakan. Pastikan waktu dan koneksimu aman ya!
                    </p>
                </div>
            </div>

            {/* Main Content - Grid System */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
                {/* CARD 1: SKD Tryout */}
                <div className="relative overflow-hidden p-8 bg-white border-2 border-gray-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-rotate-1 transition-transform duration-300 flex flex-col h-full transform origin-center">
                    {/* Tape Effect */}
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-32 h-8 bg-yellow-100/90 border-l border-r border-white/50 -rotate-1 shadow-sm opacity-80 z-20"></div>

                    <div className="relative z-10 text-center flex flex-col h-full">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 border-2 border-gray-900 text-blue-600 mb-6 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] mx-auto">
                            <Zap size={32} className="fill-current" />
                        </div>

                        <h3 className="text-3xl font-bold mb-4 text-gray-900">Tryout SKD</h3>

                        {/* Quota Display */}
                        <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border-2 border-blue-200 border-dashed rounded-lg text-blue-800 font-bold transform -rotate-1 mx-auto">
                            <Ticket size={18} />
                            <span>Sisa Kuota: {quota} Tiket</span>
                        </div>

                        <p className="text-gray-600 text-lg mb-8 leading-relaxed flex-grow">
                            Tryout standar CAT BKN untuk CPNS & Sekolah Kedinasan. Pastikan kamu siap fokus selama 100 menit.
                        </p>

                        <button
                            onClick={handleStartTryout}
                            disabled={loadingTryout}
                            className={cn(
                                "w-full flex items-center justify-center gap-3 py-4 text-xl font-bold text-white border-2 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all",
                                "bg-blue-600 hover:bg-blue-700 hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] active:scale-[0.98]",
                                loadingTryout && "opacity-70 cursor-not-allowed",
                                quota <= 0 && "bg-gray-400 hover:bg-gray-400 cursor-not-allowed hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0 hover:translate-y-0"
                            )}
                        >
                            {loadingTryout ? (
                                <>
                                    <Loader2 className="animate-spin" size={24} />
                                    Menyiapkan...
                                </>
                            ) : quota <= 0 ? (
                                <>
                                    Kuota Habis
                                </>
                            ) : (
                                <>
                                    Mulai Tryout SKD
                                    <ArrowRight size={24} />
                                </>
                            )}
                        </button>

                        <div className="mt-8 pt-6 border-t-2 border-dashed border-gray-300 grid grid-cols-3 gap-2 text-[10px] md:text-sm font-bold text-gray-600">
                            <div className="flex flex-col items-center justify-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-green-500 border border-gray-900" />
                                110 Soal
                            </div>
                            <div className="flex flex-col items-center justify-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-blue-500 border border-gray-900" />
                                100 Menit
                            </div>
                            <div className="flex flex-col items-center justify-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-purple-500 border border-gray-900" />
                                Pembahasan
                            </div>
                        </div>
                    </div>
                </div>

                {/* CARD 2: UTBK Tryout */}
                <div className="relative overflow-hidden p-8 bg-white border-2 border-gray-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-rotate-1 transition-transform duration-300 flex flex-col h-full transform origin-center">
                    {/* Tape Effect */}
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-32 h-8 bg-pink-100/90 border-l border-r border-white/50 -rotate-2 shadow-sm opacity-80 z-20"></div>

                    <div className="relative z-10 text-center flex flex-col h-full">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-pink-100 border-2 border-gray-900 text-pink-600 mb-6 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] mx-auto">
                            <BookOpen size={32} className="fill-current" />
                        </div>

                        <h3 className="text-3xl font-bold mb-4 text-gray-900">Tryout UTBK SNBT</h3>

                        {/* Quota Display */}
                        <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 bg-pink-50 border-2 border-pink-200 border-dashed rounded-lg text-pink-800 font-bold transform rotate-1 mx-auto">
                            <Ticket size={18} />
                            <span>Sisa Kuota: {quotaUtbk} Tiket</span>
                        </div>

                        <p className="text-gray-600 text-lg mb-8 leading-relaxed flex-grow">
                            Tryout lengkap Potensi Kognitif, Penalaran Matematika, Literasi Bahasa. Siap masuk PTN Impian?
                        </p>

                        <button
                            onClick={() => toast.info("Segera Hadir!", { description: "Tryout UTBK sedang dalam tahap akhir pengembangan. Ditunggu ya! 🚀" })}
                            className={cn(
                                "w-full flex items-center justify-center gap-3 py-4 text-xl font-bold text-white border-2 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all",
                                "bg-pink-600 hover:bg-pink-700 hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] active:scale-[0.98]"
                            )}
                        >
                            Mulai Tryout UTBK
                            <ArrowRight size={24} />
                        </button>

                        <div className="mt-8 pt-6 border-t-2 border-dashed border-gray-300 grid grid-cols-3 gap-2 text-[10px] md:text-sm font-bold text-gray-600">
                            <div className="flex flex-col items-center justify-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-green-500 border border-gray-900" />
                                155 Soal
                            </div>
                            <div className="flex flex-col items-center justify-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-blue-500 border border-gray-900" />
                                195 Menit
                            </div>
                            <div className="flex flex-col items-center justify-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-purple-500 border border-gray-900" />
                                IRT Score
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
