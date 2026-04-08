'use client'

import { motion, Variants } from 'framer-motion'
import Link from 'next/link'
import {
    ArrowRight,
    Trophy,
    BookOpen,
    TrendingUp,
    Sparkles,
    Monitor,
    Rocket,
    Ticket,
    Headphones,
    PencilLine
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ToeflDashboardData {
    user: {
        id: string
        name: string
        streak: number
        tryoutQuota: number
    }
    stats: {
        totalSessions: number
        xp: number
        avgScore: number
    }
    progress: {
        listening: { score: number; target: number; passed: boolean }
        structure: { score: number; target: number; passed: boolean }
        reading: { score: number; target: number; passed: boolean }
    }
    lastExam: {
        date: string
        score_listening: number
        score_structure: number
        score_reading: number
        total_score: number
        passed: boolean
    } | null
}

interface Props {
    data: ToeflDashboardData
    greeting: { greeting: string; message: string }
}

const TYPE_ICONS = {
    listening: <Headphones className="w-5 h-5" />,
    structure: <PencilLine className="w-5 h-5" />,
    reading: <BookOpen className="w-5 h-5" />,
}

export default function ToeflDashboardClient({ data, greeting }: Props) {
    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.15 }
        }
    }

    const itemVariants: Variants = {
        hidden: { opacity: 0, y: 10, rotate: -1 },
        visible: {
            opacity: 1,
            y: 0,
            rotate: 0,
            transition: { type: 'spring', stiffness: 100 }
        }
    }

    return (
        <motion.div
            className="space-y-8 font-handwriting"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* 1. HERO HEADER */}
            <motion.div variants={itemVariants} className="relative z-10">
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 mb-2">
                    {greeting.greeting}, <span className="text-blue-600 underline decoration-wavy decoration-2">{data.user.name}</span>!
                </h1>
                <p className="text-gray-600 text-xl font-medium">{greeting.message}</p>
            </motion.div>

            {/* 2. HERO CARD - QUICK START */}
            <motion.div variants={itemVariants}>
                <motion.div
                    whileHover={{ scale: 1.01 }}
                    className={cn(
                        "relative overflow-hidden p-8 md:p-10 transition-all duration-300",
                        "bg-white border-2 border-gray-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
                    )}
                >
                    {/* Paper Lines Background */}
                    <div className="absolute inset-0 z-0 opacity-20 pointer-events-none"
                        style={{ backgroundImage: "repeating-linear-gradient(transparent, transparent 1.9rem, #9ca3af 2rem)", backgroundSize: "100% 2rem", marginTop: "1rem" }}
                    />

                    <div className="relative z-10">
                        {/* Status Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 max-w-6xl mx-auto">
                            <div className="flex items-center gap-4">
                                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-300 border-2 border-gray-900 text-gray-900 text-sm font-bold uppercase tracking-wider shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transform -rotate-1">
                                    <Rocket className="w-4 h-4 fill-current" /> TOEFL Master
                                </div>

                                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-yellow-200 border-2 border-gray-900 text-gray-900 text-sm font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transform rotate-1">
                                    <Trophy className="w-4 h-4 text-yellow-700 fill-current" /> Avg: {data.stats.avgScore || '-'}
                                </div>
                            </div>

                            <Link
                                href="/toefl/dashboard/beli-paket"
                                className="inline-flex items-center gap-3 px-4 py-2 bg-blue-100 border-2 border-gray-900 text-gray-900 font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all text-sm group"
                            >
                                <Ticket className="w-5 h-5 text-blue-600 -rotate-12" /> <span className="text-xl text-blue-700">{data.user.tryoutQuota}</span> <span>Token TOEFL</span>
                                <Sparkles className="w-4 h-4 text-blue-500 group-hover:animate-spin" />
                            </Link>
                        </div>

                        {/* Two Columns Layout for Primary Actions */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
                            <Link
                                href="/toefl/dashboard/latihan"
                                className="group relative p-8 bg-blue-600 text-white border-2 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all flex flex-col justify-between min-h-[160px]"
                            >
                                <div>
                                    <div className="w-12 h-12 bg-white border-2 border-gray-900 flex items-center justify-center text-blue-600 mb-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]">
                                        <Monitor className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-3xl font-black mb-1">Ambil Simulasi</h3>
                                    <p className="text-blue-100 font-medium">Uji kemampuan Listening, Structure, & Reading</p>
                                </div>
                                <div className="absolute top-6 right-6 opacity-20 group-hover:opacity-40 transition-opacity">
                                    <ArrowRight size={48} />
                                </div>
                            </Link>

                            <Link
                                href="/toefl/dashboard/beli-paket"
                                className="group relative p-8 bg-white text-gray-900 border-2 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all flex flex-col justify-between min-h-[160px]"
                            >
                                <div>
                                    <div className="w-12 h-12 bg-yellow-400 border-2 border-gray-900 flex items-center justify-center text-gray-900 mb-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]">
                                        <Ticket className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-3xl font-black mb-1">Beli Token</h3>
                                    <p className="text-gray-500 font-medium tracking-tight">Tambah amunisi untuk latihan lebih banyak</p>
                                </div>
                                <div className="absolute bottom-6 right-6">
                                    <motion.div
                                        animate={{ y: [0, -4, 0] }}
                                        transition={{ repeat: Infinity, duration: 2 }}
                                    >
                                        <ArrowRight className="w-8 h-8 text-gray-300 group-hover:text-yellow-500 transition-colors" />
                                    </motion.div>
                                </div>
                            </Link>
                        </div>
                    </div>
                </motion.div>
            </motion.div>

            {/* 3. GRID LAYOUT */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <motion.div variants={itemVariants}>
                        <div className="h-full bg-white border-2 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6 md:p-8 relative">
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-32 h-8 bg-blue-100/90 border-l border-r border-white/50 rotate-1 shadow-sm opacity-80 z-20"></div>

                            <div className="flex items-center gap-4 mb-6 relative z-10">
                                <div className="p-2 bg-blue-100 border-2 border-gray-900 text-blue-700 rounded-md">
                                    <TrendingUp className="w-6 h-6" />
                                </div>
                                <h3 className="font-bold text-2xl text-gray-900">Hasil Simulasi Terakhir</h3>
                                {data.lastExam && (
                                    <div className="ml-auto text-sm font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full border border-gray-300">
                                        {data.lastExam.date}
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col gap-4 relative z-10 font-sans">
                                {data.lastExam ? (
                                    <>
                                        <div className="p-4 bg-gray-900 text-white rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] mb-2 flex items-center justify-between">
                                            <div>
                                                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Skor TOEFL</div>
                                                <div className="text-4xl font-black tracking-tight text-white">
                                                    {data.lastExam.total_score}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className={cn(
                                                    "px-3 py-1 text-xs font-bold uppercase rounded-full inline-block mb-1",
                                                    data.lastExam.passed ? "bg-green-500 text-white" : "bg-blue-500 text-white"
                                                )}>
                                                    Scoring ITP Standard
                                                </div>
                                                <div className="text-xs text-gray-400">Range: 310 - 677</div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            {(['listening', 'structure', 'reading'] as const).map((type) => {
                                                const score = data.lastExam ? data.lastExam[`score_${type}`] : 0

                                                return (
                                                    <div key={type} className="p-4 rounded-xl border-2 bg-white border-gray-200">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <div className="w-8 h-8 rounded-full border-2 border-gray-100 flex items-center justify-center text-blue-600">
                                                                {TYPE_ICONS[type]}
                                                            </div>
                                                            <span className="font-bold text-gray-700 capitalize">{type}</span>
                                                        </div>

                                                        <div className="flex items-end gap-1">
                                                            <span className="text-2xl font-black text-gray-900">{score}</span>
                                                            <span className="text-xs text-gray-500 font-bold mb-1">/ 68</span>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-12 text-center bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl">
                                        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                                            <Monitor className="w-8 h-8 text-gray-400" />
                                        </div>
                                        <h3 className="font-bold text-lg text-gray-900 mb-1">Ambil Diagnosis Pertama</h3>
                                        <p className="text-gray-500 text-sm max-w-xs mx-auto mb-6">
                                            Ukur kemampuan TOEFL kamu hari ini untuk tahu bagian mana yang perlu ditingkatkan.
                                        </p>
                                        <Link href="/toefl/dashboard/latihan" className="px-6 py-2 bg-blue-600 text-white font-bold rounded-full hover:bg-blue-700 transition">
                                            Mulai Sekarang
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>

                <motion.div variants={itemVariants} className="space-y-6">
                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        className="p-6 bg-blue-600 text-white border-2 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-2 opacity-10">
                            <Headphones size={100} className="text-white" />
                        </div>

                        <div className="relative z-10">
                            <h3 className="text-2xl font-black mb-1">Misi Mingguan</h3>
                            <p className="text-blue-100 text-sm opacity-80 mb-6 font-medium italic">Selesaikan 2 simulasi untuk bonus 50 XP!</p>
                            
                            <div className="flex items-center justify-between text-xs font-bold mb-2">
                                <span>Progress</span>
                                <span>{data.stats.totalSessions}/2</span>
                            </div>
                            <div className="h-3 bg-white/20 rounded-full overflow-hidden border border-white/10">
                                <motion.div
                                    className="h-full bg-yellow-400"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min((data.stats.totalSessions / 2) * 100, 100)}%` }}
                                    transition={{ duration: 1.5, delay: 0.5 }}
                                />
                            </div>
                        </div>
                    </motion.div>

                    <div className="p-4 bg-yellow-50 border-2 border-yellow-200 border-dashed text-yellow-800 font-bold text-sm leading-relaxed relative">
                        <Sparkles className="absolute -top-3 -right-3 w-8 h-8 text-yellow-400 rotate-12 opacity-50" />
                        "Tips: Di section Listening Part A, fokuslah pada pembicara kedua. Biasanya kunci jawaban ada di sana!"
                    </div>
                </motion.div>
            </div>
        </motion.div>
    )
}
