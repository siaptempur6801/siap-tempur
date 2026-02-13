'use client'

import { useState } from 'react'
import { motion, Variants } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import {
    Flame,
    Zap,
    Target,
    ArrowRight,
    Trophy,
    BookOpen,
    TrendingUp,
    BarChart3,
    CheckCircle2,
    Sparkles,
    Brain,
    User,
    Building2,
    Rocket,
    Ticket
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { SUBJECTS } from '@/lib/constants'

interface DashboardData {
    user: {
        id: string
        name: string
        streak: number
        tryoutQuota: number
    }

    stats: {
        totalSessions: number
        xp: number
        level: number
        levelName: string
        levelProgress: number
        rank: number | null
    }
    progress: {
        twk: { score: number; target: number; passed: boolean }
        tiu: { score: number; target: number; passed: boolean }
        tkp: { score: number; target: number; passed: boolean }
    }
    lastExam: {
        date: string
        score_twk: number
        score_tiu: number
        score_tkp: number
        total_score: number
        passed: boolean
    } | null
    bestExam: {
        date: string
        score_twk: number
        score_tiu: number
        score_tkp: number
        total_score: number
        passed: boolean
    } | null
    nextTryout: {
        name: string
        daysLeft: number
    } | null
}

interface Props {
    data: DashboardData
    greeting: { greeting: string; message: string }
}

const TYPE_COLORS = {
    TWK: {
        bg: 'bg-blue-500',
        bgLight: 'bg-blue-500/10',
        text: 'text-blue-500',
        border: 'border-blue-500/20',
        gradient: 'from-blue-500 to-cyan-500',
    },
    TIU: {
        bg: 'bg-purple-500',
        bgLight: 'bg-purple-500/10',
        text: 'text-purple-500',
        border: 'border-purple-500/20',
        gradient: 'from-purple-500 to-pink-500',
    },
    TKP: {
        bg: 'bg-amber-500',
        bgLight: 'bg-amber-500/10',
        text: 'text-amber-500',
        border: 'border-amber-500/20',
        gradient: 'from-amber-500 to-orange-500',
    },
}

const TYPE_ICONS = {
    TWK: <BookOpen className="w-5 h-5" />,
    TIU: <Brain className="w-5 h-5" />,
    TKP: <User className="w-5 h-5" />,
}







export default function DashboardClient({ data, greeting }: Props) {
    const [activeTab, setActiveTab] = useState<'last' | 'best'>('last')


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

    const allPassed = data.progress.twk.passed && data.progress.tiu.passed && data.progress.tkp.passed

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
                                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-green-300 border-2 border-gray-900 text-gray-900 text-sm font-bold uppercase tracking-wider shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transform -rotate-1">
                                    <Rocket className="w-4 h-4 fill-current" /> Siap Tempur
                                </div>

                                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-yellow-200 border-2 border-gray-900 text-gray-900 text-sm font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transform rotate-1">
                                    <Trophy className="w-4 h-4 text-yellow-700 fill-current" /> Rank: {data.stats.rank ? `#${data.stats.rank}` : '-'}
                                </div>
                            </div>

                            <Link
                                href="/dashboard/beli-paket"
                                className="inline-flex items-center gap-3 px-4 py-2 bg-blue-100 border-2 border-gray-900 text-gray-900 font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all text-sm group"
                            >
                                <Ticket className="w-5 h-5 text-blue-600 -rotate-12" /> <span className="text-xl text-blue-700">{data.user.tryoutQuota}</span> <span>Tiket Sisa</span>
                                <Sparkles className="w-4 h-4 text-blue-500 group-hover:animate-spin" />
                            </Link>
                        </div>

                        {/* Two Columns Layout for Primary Actions */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
                            {/* Main CTA: Latihan */}
                            <Link
                                href="/dashboard/latihan"
                                className="group relative p-8 bg-blue-600 text-white border-2 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all flex flex-col justify-between min-h-[160px]"
                            >
                                <div>
                                    <div className="w-12 h-12 bg-white border-2 border-gray-900 flex items-center justify-center text-blue-600 mb-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]">
                                        <Building2 className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-3xl font-black mb-1">Mulai Latihan</h3>
                                    <p className="text-blue-100 font-medium">Asah kemampuan TWK, TIU, TKP</p>
                                </div>
                                <div className="absolute top-6 right-6 opacity-20 group-hover:opacity-40 transition-opacity">
                                    <ArrowRight size={48} />
                                </div>
                            </Link>

                            {/* Secondary CTA: Ranking */}
                            <Link
                                href="/dashboard/ranking"
                                className="group relative p-8 bg-white text-gray-900 border-2 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all flex flex-col justify-between min-h-[160px]"
                            >
                                <div>
                                    <div className="w-12 h-12 bg-yellow-400 border-2 border-gray-900 flex items-center justify-center text-gray-900 mb-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]">
                                        <BarChart3 className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-3xl font-black mb-1">Ranking Nasional</h3>
                                    <p className="text-gray-500 font-medium tracking-tight">Cek posisimu di antara {data.stats.rank ? 'peserta lain' : 'pejuang ASN'}</p>
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
                {/* LEFT COLUMN (Last Exam + Leaderboard) */}
                <div className="lg:col-span-2 space-y-8">
                    {/* PROGRESS SECTION */}
                    <motion.div variants={itemVariants}>
                        <div className="h-full bg-white border-2 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6 md:p-8 relative">
                            {/* Tape effect */}
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-32 h-8 bg-yellow-100/90 border-l border-r border-white/50 rotate-1 shadow-sm opacity-80 z-20"></div>

                            {/* Header & Tabs */}
                            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6 relative z-10">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-green-100 border-2 border-gray-900 text-green-700 rounded-md">
                                        <TrendingUp className="w-6 h-6" />
                                    </div>
                                    <h3 className="font-bold text-2xl text-gray-900">Hasil Ujian</h3>
                                </div>

                                {/* Tab Switcher */}
                                <div className="flex items-center gap-2 p-1 bg-gray-100 border-2 border-gray-900 rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                    <button
                                        onClick={() => setActiveTab('last')}
                                        className={cn(
                                            "px-4 py-1.5 text-xs font-bold transition-all rounded-md",
                                            activeTab === 'last'
                                                ? "bg-white border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-gray-900"
                                                : "text-gray-500 hover:text-gray-900"
                                        )}
                                    >
                                        Terakhir
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('best')}
                                        className={cn(
                                            "px-4 py-1.5 text-xs font-bold transition-all rounded-md",
                                            activeTab === 'best'
                                                ? "bg-white border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-gray-900"
                                                : "text-gray-500 hover:text-gray-900"
                                        )}
                                    >
                                        Tertinggi
                                    </button>
                                </div>

                                {activeTab === 'last' && data.lastExam && (
                                    <div className="ml-auto text-sm font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full border border-gray-300">
                                        {data.lastExam.date}
                                    </div>
                                )}
                                {activeTab === 'best' && data.bestExam && (
                                    <div className="ml-auto text-sm font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full border border-gray-300">
                                        {data.bestExam.date}
                                    </div>
                                )}
                            </div>


                            {/* Exam Result Display */}
                            <div className="flex flex-col gap-4 relative z-10 font-sans">
                                {((activeTab === 'last' && data.lastExam) || (activeTab === 'best' && data.bestExam)) ? (
                                    <>
                                        {/* Total Score Banner */}
                                        <div className="p-4 bg-gray-900 text-white rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] mb-2 flex items-center justify-between">
                                            <div>
                                                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Skor</div>
                                                <div className="text-4xl font-black tracking-tight text-white">
                                                    {activeTab === 'last' ? data.lastExam?.total_score : data.bestExam?.total_score}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className={cn(
                                                    "px-3 py-1 text-xs font-bold uppercase rounded-full inline-block mb-1",
                                                    (activeTab === 'last' ? data.lastExam?.passed : data.bestExam?.passed) ? "bg-green-500 text-white" : "bg-red-500 text-white"
                                                )}>
                                                    {(activeTab === 'last' ? data.lastExam?.passed : data.bestExam?.passed) ? "LULUS SKD" : "BELUM LULUS"}
                                                </div>
                                                <div className="text-xs text-gray-400">Passing Grade: 311</div>
                                            </div>
                                        </div>

                                        {/* Score Breakdown */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            {(['twk', 'tiu', 'tkp'] as const).map((type) => {
                                                const exam = activeTab === 'last' ? data.lastExam : data.bestExam
                                                const score = exam ? exam[`score_${type}`] : 0
                                                const target = data.progress[type].target // Reuse target from constants
                                                const passed = score >= target
                                                const typeUpper = type.toUpperCase() as 'TWK' | 'TIU' | 'TKP'

                                                return (
                                                    <div key={type} className={cn(
                                                        "p-4 rounded-xl border-2 transition-all",
                                                        passed
                                                            ? "bg-white border-green-200"
                                                            : "bg-white border-red-200"
                                                    )}>
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <div className={cn(
                                                                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                                                                type === 'twk' ? 'bg-red-100 text-red-700' :
                                                                    type === 'tiu' ? 'bg-yellow-100 text-yellow-700' :
                                                                        'bg-blue-100 text-blue-700'
                                                            )}>
                                                                {TYPE_ICONS[typeUpper]}
                                                            </div>
                                                            <span className="font-bold text-gray-700">{typeUpper}</span>
                                                        </div>

                                                        <div className="flex items-end gap-1">
                                                            <span className={cn(
                                                                "text-2xl font-black",
                                                                passed ? "text-gray-900" : "text-red-600"
                                                            )}>{score}</span>
                                                            <span className="text-xs text-gray-500 font-bold mb-1">/ {target}</span>
                                                        </div>

                                                        <div className="mt-2 text-[10px] font-bold uppercase tracking-wide">
                                                            {passed ? (
                                                                <span className="text-green-600 flex items-center gap-1">
                                                                    <CheckCircle2 size={12} /> Lulus
                                                                </span>
                                                            ) : (
                                                                <span className="text-red-500 flex items-center gap-1">
                                                                    Target Belum Tercapai
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-12 text-center bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl">
                                        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                                            <BarChart3 className="w-8 h-8 text-gray-400" />
                                        </div>
                                        <h3 className="font-bold text-lg text-gray-900 mb-1">Belum Ada Riwayat Ujian</h3>
                                        <p className="text-gray-500 text-sm max-w-xs mx-auto mb-6">
                                            Kamu belum mengerjakan Tryout atau Latihan Soal. Yuk mulai sekarang!
                                        </p>
                                        <Link href="/dashboard/latihan" className="px-6 py-2 bg-blue-600 text-white font-bold rounded-full hover:bg-blue-700 transition">
                                            Mulai Ujian Pertama
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>

                </div>

                {/* STATS & RECOMMENDATIONS COLUMN */}
                <motion.div variants={itemVariants} className="space-y-6">
                    {/* XP & LEVEL CARD - PREMIUM LOOK */}
                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        className="p-6 bg-yellow-400 border-2 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden"
                    >
                        {/* Decorative Zap */}
                        <div className="absolute top-0 right-0 p-2 opacity-10">
                            <Zap size={100} className="text-black" />
                        </div>

                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="px-2 py-0.5 bg-black text-white text-[10px] font-black uppercase tracking-widest">
                                    Current Rank
                                </div>
                            </div>

                            <div className="text-5xl font-black text-gray-900 tracking-tighter mb-1">
                                {data.stats.levelName}
                            </div>
                            <div className="text-sm font-bold text-gray-800 uppercase tracking-tight opacity-80">
                                Level {data.stats.level} • {data.stats.xp.toLocaleString()} XP
                            </div>

                            {/* Small Progress to Next Level (Visual Only for now) */}
                            <div className="mt-6 h-2 bg-black/10 rounded-full overflow-hidden border border-black/5">
                                <motion.div
                                    className="h-full bg-black"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${data.stats.levelProgress}%` }}
                                    transition={{ duration: 1.5, delay: 0.5 }}
                                />
                            </div>
                        </div>
                    </motion.div>

                    {/* STATS GRID */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Ranking Card */}
                        <Link href="/dashboard/ranking" className="block group">
                            <motion.div
                                whileHover={{ scale: 1.05, rotate: -1 }}
                                className="p-4 bg-white border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group-hover:shadow-none group-hover:translate-x-0.5 group-hover:translate-y-0.5 transition-all text-center flex flex-col items-center gap-1"
                            >
                                <BarChart3 className="w-6 h-6 text-yellow-500 mb-1" />
                                <div className="text-2xl font-black text-gray-900 leading-none">
                                    #{data.stats.rank || '-'}
                                </div>
                                <div className="text-[10px] uppercase font-bold text-gray-500 tracking-tighter">Posisi Nasional</div>
                            </motion.div>
                        </Link>

                        {/* Streak Card */}
                        <motion.div
                            whileHover={{ scale: 1.05, rotate: 1 }}
                            className="p-4 bg-white border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center flex flex-col items-center gap-1"
                        >
                            <Flame className="w-6 h-6 text-orange-500 fill-current animate-pulse mb-1" />
                            <div className="text-2xl font-black text-gray-900 leading-none">
                                {data.user.streak}
                            </div>
                            <div className="text-[10px] uppercase font-bold text-gray-500 tracking-tighter">Hari Beruntun</div>
                        </motion.div>
                    </div>

                    {/* CALLOUT CARD */}
                    <div className="p-4 bg-blue-50 border-2 border-blue-200 border-dashed text-blue-700 font-bold text-sm leading-relaxed relative">
                        <Sparkles className="absolute -top-3 -right-3 w-8 h-8 text-blue-400 rotate-12 opacity-50" />
                        "Kunci kelulusan SKD adalah KONSISTENSI. Luangkan waktu setiap hari untuk latihan!"
                    </div>
                </motion.div>
            </div>
        </motion.div>
    )
}
