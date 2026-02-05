'use client'

import { useState } from 'react'
import { motion, Variants } from 'framer-motion'
import Link from 'next/link'
import {
    Flame,
    Zap,
    Target,
    ArrowRight,
    Trophy,
    BookOpen,
    TrendingUp,
    CheckCircle2,
    AlertCircle,
    Sparkles,
    Brain,
    User,
    GraduationCap,
    Building2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

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
    }
    progress: {
        twk: { score: number; target: number; passed: boolean }
        tiu: { score: number; target: number; passed: boolean }
        tkp: { score: number; target: number; passed: boolean }
    }
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

const TYPE_NAMES = {
    TWK: 'Tes Wawasan Kebangsaan',
    TIU: 'Tes Intelegensia Umum',
    TKP: 'Tes Karakteristik Pribadi',
}

// UTBK Subtests (Placeholder - will be replaced with real data later)
const UTBK_SUBTESTS = [
    { key: 'pu', name: 'Penalaran Umum', icon: <Brain className="w-4 h-4" />, color: 'bg-indigo-100 text-indigo-700' },
    { key: 'pk', name: 'Pengetahuan Kuantitatif', icon: <Target className="w-4 h-4" />, color: 'bg-cyan-100 text-cyan-700' },
    { key: 'pm', name: 'Penalaran Matematika', icon: <TrendingUp className="w-4 h-4" />, color: 'bg-teal-100 text-teal-700' },
    { key: 'lbi', name: 'Literasi B. Indonesia', icon: <BookOpen className="w-4 h-4" />, color: 'bg-rose-100 text-rose-700' },
    { key: 'lbe', name: 'Literasi B. Inggris', icon: <BookOpen className="w-4 h-4" />, color: 'bg-violet-100 text-violet-700' },
    { key: 'pb', name: 'Pemahaman Bacaan', icon: <BookOpen className="w-4 h-4" />, color: 'bg-orange-100 text-orange-700' },
    { key: 'pku', name: 'Pengetahuan Umum', icon: <GraduationCap className="w-4 h-4" />, color: 'bg-emerald-100 text-emerald-700' },
]



export default function DashboardClient({ data, greeting }: Props) {
    const [activeTracker, setActiveTracker] = useState<'skd' | 'utbk'>('skd')

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
                    {greeting.greeting}, <span className="text-blue-600 underline decoration-wavy decoration-2">{data.user.name}</span>! ✏️
                </h1>
                <p className="text-gray-600 text-xl font-medium">{greeting.message}</p>
            </motion.div>

            {/* 2. HERO CARD - QUICK START */}
            <motion.div variants={itemVariants}>
                <motion.div
                    whileHover={{ scale: 1.01, rotate: 0.5 }}
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
                        {/* Header with Quota Badge */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-green-300 border-2 border-gray-900 text-gray-900 text-sm font-bold uppercase tracking-wider shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transform -rotate-1">
                                🚀 Quick Start
                            </div>
                            <Link
                                href="/dashboard/beli-paket"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-200 border-2 border-gray-900 text-gray-900 font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all"
                            >
                                🎫 <span className="text-2xl text-blue-700">{data.user.tryoutQuota}</span> <span className="text-sm">Tiket Tersisa</span>
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>

                        {/* Quick Start Buttons */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* CPNS Card */}
                            <Link
                                href="/dashboard/latihan"
                                className="group relative p-6 bg-gradient-to-br from-blue-100 to-blue-50 border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-blue-400 border-2 border-gray-900 flex items-center justify-center text-3xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                        <Building2 className="w-8 h-8 text-gray-900" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-gray-900 mb-1">Latihan SKD</h3>
                                        <p className="text-gray-600">TWK • TIU • TKP</p>
                                    </div>
                                </div>
                                <div className="absolute bottom-4 right-4">
                                    <ArrowRight className="w-6 h-6 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                                </div>
                            </Link>

                            {/* UTBK Card */}
                            <button
                                onClick={() => toast.info('Materi UTBK sedang disiapkan! Nantikan segera ya pejuang UTBK. 💪')}
                                className="group relative p-6 bg-gradient-to-br from-purple-100 to-purple-50 border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all text-left w-full cursor-pointer"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-purple-400 border-2 border-gray-900 flex items-center justify-center text-3xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                        <GraduationCap className="w-8 h-8 text-gray-900" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-gray-900 mb-1">Latihan UTBK</h3>
                                        <p className="text-gray-600">PU • PBM • PPU • LBI • LBE</p>
                                    </div>
                                </div>
                                <div className="absolute bottom-4 right-4 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all">
                                    <ArrowRight className="w-6 h-6" />
                                </div>
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>

            {/* 3. GRID LAYOUT */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* PROGRESS SECTION */}
                <motion.div variants={itemVariants} className="lg:col-span-2">
                    <div className="h-full bg-white border-2 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6 md:p-8 relative">
                        {/* Tape effect */}
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-32 h-8 bg-yellow-100/90 border-l border-r border-white/50 rotate-1 shadow-sm opacity-80 z-20"></div>

                        {/* Header with Tabs */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6 relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-green-100 border-2 border-gray-900 text-green-700 rounded-md">
                                    <TrendingUp className="w-6 h-6" />
                                </div>
                                <h3 className="font-bold text-2xl text-gray-900">Progress Tracker</h3>
                            </div>

                            {/* Tab Buttons */}
                            <div className="flex gap-2 sm:ml-auto">
                                <button
                                    onClick={() => setActiveTracker('skd')}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 font-bold text-sm border-2 border-gray-900 transition-all",
                                        activeTracker === 'skd'
                                            ? "bg-indigo-500 text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                                            : "bg-white text-gray-700 hover:bg-gray-50"
                                    )}
                                >
                                    <Building2 className="w-4 h-4" />
                                    SKD
                                </button>
                                <button
                                    onClick={() => setActiveTracker('utbk')}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 font-bold text-sm border-2 border-gray-900 transition-all",
                                        activeTracker === 'utbk'
                                            ? "bg-pink-500 text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                                            : "bg-white text-gray-700 hover:bg-gray-50"
                                    )}
                                >
                                    <GraduationCap className="w-4 h-4" />
                                    UTBK
                                </button>
                            </div>
                        </div>

                        {/* CPNS Progress */}
                        {activeTracker === 'skd' && (
                            <div className="flex flex-col gap-4 relative z-10 font-sans">
                                {(['twk', 'tiu', 'tkp'] as const).map((type, idx) => {
                                    const progress = data.progress[type]
                                    const percentage = Math.min((progress.score / progress.target) * 100, 100)
                                    const typeUpper = type.toUpperCase() as 'TWK' | 'TIU' | 'TKP'
                                    const colors = TYPE_COLORS[typeUpper]

                                    return (
                                        <motion.div
                                            key={type}
                                            whileHover={{ scale: 1.01 }}
                                            className="relative p-4 rounded-lg bg-gray-50 border-2 border-gray-300 hover:border-gray-900 transition-colors group"
                                        >
                                            <div className="flex items-start gap-4">
                                                <div className={cn(
                                                    "w-12 h-12 rounded-lg flex items-center justify-center text-xl border-2 border-gray-900 flex-shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
                                                    type === 'twk' ? 'bg-red-100 text-red-700' :
                                                        type === 'tiu' ? 'bg-yellow-100 text-yellow-700' :
                                                            'bg-blue-100 text-blue-700'
                                                )}>
                                                    {TYPE_ICONS[typeUpper]}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div>
                                                            <span className="font-bold text-lg text-gray-900 block">{TYPE_NAMES[typeUpper]}</span>
                                                        </div>
                                                        {progress.passed ? (
                                                            <div className="flex items-center gap-1.5 bg-green-100 px-2 py-1 rounded border-2 border-green-600">
                                                                <CheckCircle2 className="w-4 h-4 text-green-700" />
                                                                <span className="text-xs font-bold text-green-800 uppercase">Lulus</span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-1.5 bg-red-100 px-2 py-1 rounded border-2 border-red-600">
                                                                <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                                                                <span className="text-xs font-bold text-red-800 uppercase">Belum Lulus</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="space-y-2">
                                                        <div className="flex justify-between items-end">
                                                            <span className="text-xs font-bold text-gray-500 uppercase">Score Progress</span>
                                                            <span className="text-base font-bold text-gray-600">
                                                                <span className={cn("text-xl", progress.passed ? "text-green-600" : "text-gray-900")}>{progress.score}</span>
                                                                <span className="text-gray-400 mx-1">/</span>
                                                                {progress.target}
                                                            </span>
                                                        </div>
                                                        <div className="h-4 bg-white border-2 border-gray-900 rounded-full overflow-hidden p-[2px]">
                                                            <motion.div
                                                                className={cn(
                                                                    "h-full rounded-full border border-black/10 relative",
                                                                    progress.passed ? "bg-green-500" :
                                                                        type === 'twk' ? 'bg-red-500' :
                                                                            type === 'tiu' ? 'bg-yellow-400' : 'bg-blue-500'
                                                                )}
                                                                style={{ backgroundImage: "linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent)", backgroundSize: "1rem 1rem" }}
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${percentage}%` }}
                                                                transition={{ duration: 1, ease: "easeOut", delay: idx * 0.2 }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )
                                })}
                            </div>
                        )}

                        {/* UTBK Progress */}
                        {activeTracker === 'utbk' && (
                            <div className="flex flex-col gap-3 relative z-10 font-sans">
                                <div className="bg-pink-50 border-2 border-pink-200 rounded-lg p-3 mb-2">
                                    <p className="text-pink-700 text-sm font-medium flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4" />
                                        Fitur UTBK Tryout sedang dalam pengembangan. Segera hadir!
                                    </p>
                                </div>
                                {UTBK_SUBTESTS.map((subtest, idx) => {
                                    // Hardcoded 0s since it's coming soon
                                    const score = 0;
                                    const target = 700;
                                    const percentage = 0;

                                    return (
                                        <motion.div
                                            key={subtest.key}
                                            whileHover={{ scale: 1.01 }}
                                            className="relative p-3 rounded-lg bg-gray-50 border-2 border-gray-200 hover:border-gray-400 transition-colors group opacity-60"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "w-10 h-10 rounded-lg flex items-center justify-center border-2 border-gray-300 flex-shrink-0",
                                                    subtest.color
                                                )}>
                                                    {subtest.icon}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="font-bold text-sm text-gray-700">{subtest.name}</span>
                                                        <span className="text-xs text-gray-400">Segera Hadir</span>
                                                    </div>
                                                    <div className="h-2 bg-gray-200 border border-gray-300 rounded-full overflow-hidden">
                                                        <div className="h-full w-0 bg-gray-300 rounded-full" />
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* STATS & RECOMMENDATIONS COLUMN */}
                <motion.div variants={itemVariants} className="space-y-8">
                    {/* XP CARD */}
                    <motion.div
                        whileHover={{ scale: 1.02, rotate: 2 }}
                        className="p-6 rounded-none bg-yellow-400 border-2 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative transform rotate-1"
                    >
                        <div className="absolute top-2 right-2 opacity-20">
                            <Zap size={60} className="text-black" />
                        </div>
                        <div className="relative z-10">
                            <span className="text-xs font-black text-gray-900 uppercase tracking-widest border-b-2 border-gray-900 pb-1">Total XP</span>
                            <div className="text-5xl font-black text-gray-900 mt-2 tracking-tighter">
                                {data.stats.xp.toLocaleString()}
                            </div>
                            <div className="mt-4 inline-block px-3 py-1 bg-white border-2 border-gray-900 text-gray-900 text-xs font-bold uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                Rank: {data.stats.levelName}
                            </div>
                        </div>
                    </motion.div>

                    {/* STREAK & LEVEL GRID */}
                    <div className="grid grid-cols-2 gap-4">
                        <motion.div
                            whileHover={{ scale: 1.05, rotate: -2 }}
                            className="p-4 bg-white border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center justify-center text-center gap-2"
                        >
                            <Flame className="w-8 h-8 text-orange-500 fill-current animate-bounce" />
                            <div>
                                <div className="text-3xl font-black text-gray-900">{data.user.streak}</div>
                                <div className="text-[10px] uppercase font-bold text-gray-500">Streak</div>
                            </div>
                        </motion.div>

                        <motion.div
                            whileHover={{ scale: 1.05, rotate: 2 }}
                            className="p-4 bg-white border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center justify-center text-center gap-2"
                        >
                            <Trophy className="w-8 h-8 text-yellow-500 fill-current" />
                            <div>
                                <div className="text-3xl font-black text-gray-900">Lv.{data.stats.level}</div>
                                <div className="text-[10px] uppercase font-bold text-gray-500">Level</div>
                            </div>
                        </motion.div>
                    </div>


                </motion.div>
            </div>
        </motion.div>
    )
}
