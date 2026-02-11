'use client'

import { startTryout } from '@/app/actions/practice'
import { ArrowRight, Loader2, Target, Zap, Ticket, BookOpen, Trophy, AlertCircle } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { PageAnimateContainer, PageAnimateItem } from '@/components/ui/PageAnimate'

interface PracticeClientProps {
    quota: number
}

export default function PracticeClient({ quota }: PracticeClientProps) {
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
        <PageAnimateContainer className="space-y-10 p-4 md:p-8 max-w-6xl mx-auto font-handwriting pb-20">
            {/* Header Section */}
            <PageAnimateItem className="relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 border-2 border-gray-900 text-blue-700 text-xs font-bold uppercase tracking-wider shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] mb-4 transform -rotate-1">
                    <BookOpen size={14} className="fill-current" />
                    <span>Pusat Tryout SKD</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">
                    Siap Ujian Hari Ini?
                </h1>
                <p className="text-xl text-gray-600 max-w-2xl leading-relaxed italic">
                    "Kesuksesan adalah 1% bakat dan 99% latihan soal yang konsisten."
                </p>
            </PageAnimateItem>

            {/* Main Content Box */}
            <PageAnimateItem className="relative group">
                {/* Decorative Elements */}
                <div className="absolute -top-6 -right-6 w-32 h-32 bg-yellow-100 border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-none rotate-6 flex items-center justify-center -z-10 opacity-50 group-hover:rotate-12 transition-transform">
                    <Target className="w-16 h-16 text-blue-500 opacity-30" />
                </div>

                <div className="relative overflow-hidden bg-white border-4 border-gray-900 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] p-8 md:p-12">
                    {/* Paper Grid Pattern */}
                    <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none"
                        style={{ backgroundImage: "radial-gradient(#000 1px, transparent 1px)", backgroundSize: "20px 20px" }}
                    />

                    <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
                        {/* Left: Info & Stats */}
                        <div className="space-y-8">
                            <div>
                                <h2 className="text-4xl font-black text-gray-900 mb-4 underline decoration-blue-500/30 decoration-8 underline-offset-4">
                                    Simulasi Terstandar
                                </h2>
                                <p className="text-lg text-gray-600 leading-relaxed font-sans">
                                    Format soal, waktu, dan sistem penilaian disesuaikan dengan standar <strong className="text-gray-900">CAT BKN 2024/2025</strong>.
                                    Satu kuota (1 Tiket) untuk satu kali pengerjaan simulasi full.
                                </p>
                            </div>

                            {/* Feature Checklist */}
                            <div className="space-y-3 font-sans">
                                <div className="flex items-center gap-3 text-gray-700">
                                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-700 border border-green-200">
                                        <ArrowRight size={14} />
                                    </div>
                                    <span className="font-bold">Mencakup TWK, TIU, & TKP</span>
                                </div>
                                <div className="flex items-center gap-3 text-gray-700">
                                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-700 border border-green-200">
                                        <ArrowRight size={14} />
                                    </div>
                                    <span className="font-bold">Passing Grade Terupdate</span>
                                </div>
                                <div className="flex items-center gap-3 text-gray-700">
                                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-700 border border-green-200">
                                        <ArrowRight size={14} />
                                    </div>
                                    <span className="font-bold">Ranking Nasional Otomatis</span>
                                </div>
                            </div>

                            {/* Ticket Balance */}
                            <div className="inline-flex items-center gap-4 p-4 bg-gray-50 border-2 border-gray-300 border-dashed transform rotate-[-0.5deg]">
                                <div className="w-12 h-12 bg-white border-2 border-gray-900 flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                    <Ticket className="text-blue-600 w-6 h-6" />
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">Sisa Tiket</div>
                                    <div className="text-2xl font-black text-gray-900">{quota} <span className="text-sm">Tiket</span></div>
                                </div>
                            </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex flex-col items-center justify-center">
                            <div className="w-full space-y-4">
                                {quota > 0 ? (
                                    <button
                                        onClick={handleStartTryout}
                                        disabled={loadingTryout}
                                        className={cn(
                                            "w-full group relative py-6 flex flex-col items-center justify-center bg-blue-600 text-white border-2 border-gray-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all",
                                            loadingTryout && "opacity-80 pointer-events-none"
                                        )}
                                    >
                                        {loadingTryout ? (
                                            <div className="flex items-center gap-2">
                                                <Loader2 className="animate-spin" />
                                                <span className="text-2xl font-black">Menyiapkan Sesi...</span>
                                            </div>
                                        ) : (
                                            <>
                                                <Zap className="absolute top-2 right-2 w-8 h-8 text-yellow-300 opacity-20 group-hover:opacity-100 transition-opacity" />
                                                <span className="text-4xl font-black mb-1">Mulai Ujian</span>
                                                <span className="text-sm font-bold opacity-80 uppercase tracking-widest flex items-center gap-2">
                                                    110 Soal • 100 Menit <ArrowRight size={14} />
                                                </span>
                                            </>
                                        )}
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => router.push('/dashboard/beli-paket')}
                                        className="w-full group relative py-6 flex flex-col items-center justify-center bg-orange-100 text-orange-700 border-2 border-orange-500 border-dashed hover:bg-orange-200 transition-all font-bold"
                                    >
                                        <span className="text-4xl font-black mb-1 uppercase italic">Ticket Habis!</span>
                                        <span className="text-sm font-bold opacity-80 uppercase tracking-widest underline decoration-2 underline-offset-4 flex items-center gap-2">
                                            Isi Tiket Sekarang <Zap size={14} />
                                        </span>
                                    </button>
                                )}

                                <p className="text-center text-sm font-sans text-gray-400 italic">
                                    *Pastikan koneksi internet stabil selama pengerjaan.
                                </p>
                            </div>

                            {/* Score Breakdown Pills */}
                            <div className="mt-12 flex flex-wrap justify-center gap-3">
                                <div className="px-4 py-2 bg-red-50 text-red-700 border-2 border-red-200 font-bold rounded-lg text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,0.05)]">
                                    TWK: 30 Soal
                                </div>
                                <div className="px-4 py-2 bg-yellow-50 text-yellow-800 border-2 border-yellow-200 font-bold rounded-lg text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,0.05)]">
                                    TIU: 35 Soal
                                </div>
                                <div className="px-4 py-2 bg-blue-50 text-blue-700 border-2 border-blue-200 font-bold rounded-lg text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,0.05)]">
                                    TKP: 45 Soal
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </PageAnimateItem>

            {/* Tips Section */}
            <PageAnimateItem className="grid md:grid-cols-3 gap-6">
                <div className="p-6 bg-yellow-50 border-2 border-dashed border-gray-900 flex flex-col items-center text-center rotate-1">
                    <Zap className="text-yellow-500 mb-3" size={32} />
                    <h4 className="font-bold text-gray-900 mb-1 italic">Tips Ujian</h4>
                    <p className="text-sm text-gray-600">Kerjakan soal yang paling mudah terlebih dahulu untuk menghemat waktu.</p>
                </div>
                <div className="p-6 bg-pink-50 border-2 border-dashed border-gray-900 flex flex-col items-center text-center -rotate-1">
                    <Trophy className="text-pink-500 mb-3" size={32} />
                    <h4 className="font-bold text-gray-900 mb-1 italic">Target Lulus</h4>
                    <p className="text-sm text-gray-600">Fokus pada ambang batas skor (Passing Grade) di setiap kategori.</p>
                </div>
                <div className="p-6 bg-blue-50 border-2 border-dashed border-gray-900 flex flex-col items-center text-center rotate-1">
                    <AlertCircle className="text-blue-500 mb-3" size={32} />
                    <h4 className="font-bold text-gray-900 mb-1 italic">Persiapan</h4>
                    <p className="text-sm text-gray-600">Berdoa dan tarik nafas dalam-dalam sebelum menekan tombol GAS!</p>
                </div>
            </PageAnimateItem>

            {/* Warning Section */}
            <PageAnimateItem className="p-6 bg-red-50 border-2 border-gray-900 text-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rotate-[-0.5deg]">
                <div className="flex items-start gap-4">
                    <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                    <div>
                        <h4 className="font-bold text-lg mb-1 italic">Perhatian:</h4>
                        <p className="text-sm md:text-base font-sans leading-relaxed">
                            Jangan keluar dari halaman ujian sebelum menekan tombol <strong>"Akhiri Sesi"</strong>. Keluar di tengah jalan akan dianggap telah menyelesaikan ujian dan tiket tidak dapat dikembalikan.
                        </p>
                    </div>
                </div>
            </PageAnimateItem>
        </PageAnimateContainer>
    )
}
