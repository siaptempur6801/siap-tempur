'use client'

import { startPractice, startTryout } from '@/app/actions/practice'
import { BookOpen, Brain, Users, ArrowRight, Loader2, Sparkles, Target, Zap } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// Unified Card Component matching Tryout page style
interface PracticeCardProps {
    title: string
    type: 'TWK' | 'TIU' | 'TKP'
    description: string
    icon: any // Icon component type is tricky, keeping any for icon is acceptable or use React.ElementType
    colorClass: string
    borderClass: string
    onClick: (type: 'TWK' | 'TIU' | 'TKP') => void
    loading: boolean
}

const PracticeCard = ({ title, type, description, icon: Icon, colorClass, borderClass, onClick, loading }: PracticeCardProps) => (
    <div
        onClick={() => !loading && onClick(type)}
        className={cn(
            "relative group p-6 rounded-xl border transition-all duration-300 cursor-pointer overflow-hidden",
            "bg-secondary/10 hover:bg-secondary/20 border-border hover:border-primary/50"
        )}
    >
        {/* Background Gradient Effect */}
        <div className={cn(
            "absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-20 transition-opacity",
            colorClass
        )} />

        <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-start justify-between mb-4">
                <div className={cn("p-3 rounded-lg bg-background border border-border/50", borderClass)}>
                    <Icon size={24} className={colorClass.replace('bg-', 'text-')} />
                </div>
                <div className={cn(
                    "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                    "bg-background/50 backdrop-blur-sm",
                    borderClass,
                    colorClass.replace('bg-', 'text-')
                )}>
                    {type}
                </div>
            </div>

            <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">{title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6 flex-1">{description}</p>

            <button
                disabled={loading}
                className={cn(
                    "w-full flex items-center justify-between text-sm font-bold p-3 rounded-lg transition-all",
                    "bg-background/50 hover:bg-primary hover:text-primary-foreground border border-border group-hover:border-primary/20"
                )}
            >
                <span>Mulai Latihan</span>
                {loading ? (
                    <Loader2 className="animate-spin" size={16} />
                ) : (
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                )}
            </button>
        </div>
    </div>
)

export default function PracticeListingPage() {
    const [loadingType, setLoadingType] = useState<string | null>(null)
    const [loadingTryout, setLoadingTryout] = useState(false)
    const router = useRouter()

    const handleStart = async (type: 'TWK' | 'TIU' | 'TKP') => {
        try {
            setLoadingType(type)
            const result = await startPractice(type)

            if (result?.error) {
                toast.error(result.error)
                return
            }

            if (result?.success && result?.sessionId) {
                toast.success('Sesi latihan dibuat!')
                router.push(`/dashboard/latihan/${result.sessionId}`)
            } else {
                toast.error('Gagal mendapatkan ID sesi')
            }
        } catch (error) {
            console.error('Error in handleStart:', error)
            toast.error('Terjadi kesalahan sistem')
        } finally {
            setLoadingType(null)
        }
    }

    const handleStartTryout = async () => {
        try {
            setLoadingTryout(true)
            const result = await startTryout()

            if (result?.error) {
                toast.error(result.error)
                return
            }

            if (result?.success && result?.sessionId) {
                toast.success('Simulasi SKD dimulai!')
                router.push(`/dashboard/latihan/${result.sessionId}`)
            }
        } catch (error) {
            toast.error('Gagal memulai simulasi')
        } finally {
            setLoadingTryout(false)
        }
    }

    return (
        <div className="space-y-8 p-4 md:p-8 max-w-7xl mx-auto">
            {/* Hero Section - Matching Tryout Page */}
            <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-accent/5 to-background p-8 md:p-12">
                <div className="relative z-10 max-w-3xl">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary border border-primary/20 mb-6">
                        <Target size={16} className="fill-current" />
                        <span className="text-sm font-bold uppercase tracking-wider">Bank Soal & Simulasi</span>
                    </div>

                    <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
                        Latihan & Simulasi SKD
                    </h1>

                    <p className="text-lg text-muted-foreground mb-8 max-w-2xl">
                        Asah kemampuanmu dengan latihan parsial atau uji kesiapanmu dengan simulasi lengkap standar CAT BKN.
                    </p>
                </div>

                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl translate-y-1/3" />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Partial Practices */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-5 h-5 text-primary" />
                        <h2 className="text-xl font-bold">Latihan Parsial</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <PracticeCard
                            title="Tes Wawasan Kebangsaan"
                            type="TWK"
                            description="Nasionalisme, Integritas, Bela Negara, Pilar Negara."
                            icon={BookOpen}
                            colorClass="bg-red-500"
                            borderClass="border-red-500/20"
                            loading={loadingType === 'TWK'}
                            onClick={handleStart}
                        />
                        <PracticeCard
                            title="Tes Intelegensi Umum"
                            type="TIU"
                            description="Verbal, Numerik, Figural, Logika Analitis."
                            icon={Brain}
                            colorClass="bg-blue-500"
                            borderClass="border-blue-500/20"
                            loading={loadingType === 'TIU'}
                            onClick={handleStart}
                        />
                        <PracticeCard
                            title="Tes Karakteristik Pribadi"
                            type="TKP"
                            description="Pelayanan Publik, Jejaring Kerja, Sosial Budaya."
                            icon={Users}
                            colorClass="bg-green-500"
                            borderClass="border-green-500/20"
                            loading={loadingType === 'TKP'}
                            onClick={handleStart}
                        />
                    </div>
                </div>

                {/* Right Column: Full Simulation (Highlighted) */}
                <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-5 h-5 text-yellow-500" />
                        <h2 className="text-xl font-bold">Simulasi Lengkap</h2>
                    </div>

                    <div className="relative overflow-hidden rounded-2xl border border-yellow-500/30 bg-gradient-to-b from-yellow-500/10 to-background p-6 h-fit">
                        {/* Shimmer/Glow Effect */}
                        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent" />

                        <div className="relative z-10">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 text-xs font-bold border border-yellow-500/20 mb-4">
                                <Target size={12} />
                                110 Soal • 100 Menit
                            </div>

                            <h3 className="text-2xl font-bold mb-2">Simulasi SKD Mandiri</h3>
                            <p className="text-muted-foreground text-sm mb-6">
                                Simulasi lengkap dengan komposisi soal dan penilaian sesuai standar resmi CPNS 2024.
                            </p>

                            <button
                                onClick={handleStartTryout}
                                disabled={loadingTryout}
                                className={cn(
                                    "w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold shadow-lg transition-all",
                                    "bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:shadow-orange-500/25 hover:scale-[1.02] active:scale-[0.98]"
                                )}
                            >
                                {loadingTryout ? (
                                    <>
                                        <Loader2 className="animate-spin" size={20} />
                                        Menyiapkan...
                                    </>
                                ) : (
                                    <>
                                        Mulai Simulasi
                                        <ArrowRight size={20} />
                                    </>
                                )}
                            </button>

                            <div className="mt-6 pt-6 border-t border-dashed border-border text-xs text-muted-foreground space-y-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                    Bobot nilai sesuai KemenpanRB
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                    Timer & Navigasi Real-time
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                    Pembahasan Lengkap
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
