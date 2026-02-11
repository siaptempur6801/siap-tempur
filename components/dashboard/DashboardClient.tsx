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
        rank: number | null
    }
    progress: {
        twk: { score: number; target: number; passed: boolean }
        tiu: { score: number; target: number; passed: boolean }
        tkp: { score: number; target: number; passed: boolean }
    }
    leaderboard: Array<{
        rank_pos: number
        full_name: string
        avatar_url: string | null
        top_score: number
    }>
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
                {/* PROGRESS SECTION */}
                <motion.div variants={itemVariants} className="lg:col-span-2">
                    <div className="h-full bg-white border-2 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6 md:p-8 relative">
                        {/* Tape effect */}
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-32 h-8 bg-yellow-100/90 border-l border-r border-white/50 rotate-1 shadow-sm opacity-80 z-20"></div>

                        {/* Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6 relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-green-100 border-2 border-gray-900 text-green-700 rounded-md">
                                    <TrendingUp className="w-6 h-6" />
                                </div>
                                <h3 className="font-bold text-2xl text-gray-900">Progress Tracker</h3>
                            </div>
                        </div>


                        {/* CPNS Progress */}
                        <div className="flex flex-col gap-4 relative z-10 font-sans">
                            {(['twk', 'tiu', 'tkp'] as const).map((type, idx) => {
                                const progress = data.progress[type]
                                const percentage = Math.min((progress.score / progress.target) * 100, 100)
                                const typeUpper = type.toUpperCase() as 'TWK' | 'TIU' | 'TKP'

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
                                                        <span className="font-bold text-lg text-gray-900 block">{SUBJECTS[typeUpper].name}</span>
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



                    </div>
                </motion.div>

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
                                    animate={{ width: '65%' }} // Placeholder progress
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
                        "Kunci kelulusan SKD adalah **konsistensi**. Luangkan waktu setiap hari untuk latihan!"
                    </div>

                    {/* TOP RANKING PREVIEW - RESTORED FEATURE */}
                    <motion.div
                        variants={itemVariants}
                        className="bg-white border-2 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6 relative"
                    >
                        {/* Tape decoration */}
                        <div className="absolute -top-3 left-6 w-12 h-5 bg-blue-200/80 rotate-[-2deg] shadow-sm"></div>

                        <div className="flex items-center justify-between mb-4">
                            <h4 className="font-bold text-xl flex items-center gap-2 text-gray-900">
                                <Trophy className="text-yellow-500" size={20} />
                                Top Pejuang
                            </h4>
                            <Link href="/dashboard/ranking" className="text-xs font-bold text-blue-600 hover:underline decoration-wavy">
                                Lihat Semua
                            </Link>
                        </div>

                        <div className="space-y-4">
                            {data.leaderboard.map((entry, idx) => (
                                <div key={idx} className="flex items-center justify-between group">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-6 h-6 rounded-full border border-gray-900 flex items-center justify-center text-[10px] font-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]",
                                            idx === 0 ? "bg-yellow-400" : idx === 1 ? "bg-gray-200" : idx === 2 ? "bg-orange-300" : "bg-white"
                                        )}>
                                            {entry.rank_pos}
                                        </div>
                                        <div className="w-8 h-8 rounded-full border border-gray-400 overflow-hidden bg-gray-50">
                                            {entry.avatar_url ? (
                                                <img src={entry.avatar_url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-400">
                                                    {entry.full_name[0]?.toUpperCase() || '?'}
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-sm font-bold text-gray-700 truncate max-w-[100px] md:max-w-[120px]">
                                            {entry.full_name || 'Anonim'}
                                        </span>
                                    </div>
                                    <div className="text-sm font-black text-gray-900">
                                        {entry.top_score}
                                    </div>
                                </div>
                            ))}

                            {data.leaderboard.length === 0 && (
                                <div className="text-center py-4 border-2 border-dashed border-gray-200 rounded-lg">
                                    <p className="text-xs text-gray-400 italic">Belum ada data ranking</p>
                                </div>
                            )}
                        </div>
                    </motion.div>

                </motion.div>
            </div>
        </motion.div>
    )
}
