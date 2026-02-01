'use client'

import { motion } from 'framer-motion'
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
    User
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface DashboardData {
    user: {
        id: string
        name: string
        streak: number
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
    priorityFocus: {
        type: 'TWK' | 'TIU' | 'TKP'
        reason: string
        target: string
    }
    recommendations: Array<{
        type: 'TWK' | 'TIU' | 'TKP'
        title: string
        description: string
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

const TYPE_NAMES = {
    TWK: 'Tes Wawasan Kebangsaan',
    TIU: 'Tes Intelegensia Umum',
    TKP: 'Tes Karakteristik Pribadi',
}

export default function DashboardClient({ data, greeting }: Props) {
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.15 }
        }
    }

    const itemVariants = {
        hidden: { opacity: 0, y: 30, scale: 0.95 },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
                stiffness: 50,
                damping: 15,
                mass: 1
            }
        }
    }

    const allPassed = data.progress.twk.passed && data.progress.tiu.passed && data.progress.tkp.passed

    return (
        <motion.div
            className="space-y-10"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* 1. HERO HEADER WITH FLOATING ELEMENTS */}
            <motion.div variants={itemVariants} className="relative z-10 will-change-transform">
                <div className="absolute -top-20 -left-20 w-64 h-64 bg-primary/30 rounded-full blur-[100px] animate-pulse will-change-transform" />
                <div className="absolute top-0 right-0 w-64 h-64 bg-accent/30 rounded-full blur-[100px] animate-pulse delay-700 will-change-transform" />

                <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-foreground mb-2 drop-shadow-sm">
                    {greeting.greeting}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-500 to-purple-500 animate-gradient-x">{data.user.name}</span>! 🚀
                </h1>
                <p className="text-muted-foreground text-sm font-medium">{greeting.message}</p>
            </motion.div>

            {/* 2. ULTRA HERO CARD - 3D TILT & VIVID GRADIENT */}
            <motion.div variants={itemVariants}>
                <motion.div
                    whileHover={{ scale: 1.02, rotateX: 2, rotateY: 2 }}
                    className={cn(
                        "relative overflow-hidden rounded-[2rem] p-8 md:p-12 transition-all duration-500 group cursor-default will-change-transform",
                        "bg-gradient-to-br from-primary/10 via-accent/5 to-background",
                        "border border-border shadow-[0_0_50px_-10px_rgba(124,58,237,0.1)]"
                    )}
                >
                    {/* Animated Mesh Background */}
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-40 mix-blend-overlay" />
                    <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-cyan-500/30 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 animate-[pulse_4s_ease-in-out_infinite]" />
                    <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-pink-500/30 rounded-full blur-[120px] translate-y-1/3 -translate-x-1/3 animate-[pulse_5s_ease-in-out_infinite]" />

                    {/* Floating Particles/Shapes */}
                    <motion.div
                        animate={{ y: [-10, 10, -10], rotate: [0, 5, -5, 0] }}
                        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute top-10 right-10 opacity-20"
                    >
                        <Target size={150} className="text-white" />
                    </motion.div>

                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/20 backdrop-blur-xl border border-white/20 text-white/90 text-sm font-bold uppercase tracking-widest shadow-lg mb-8 group-hover:bg-white/10 transition-colors">
                            <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
                            Mission of the Day
                        </div>

                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-10">
                            <div className="space-y-6">
                                <div className="flex items-center gap-6">
                                    <div className="w-24 h-24 rounded-3xl bg-white/10 backdrop-blur-2xl border border-white/30 flex items-center justify-center shadow-[0_0_30px_-5px_rgba(255,255,255,0.4)] group-hover:scale-110 transition-transform duration-500">
                                        <div className="text-6xl drop-shadow-lg">
                                            {TYPE_ICONS[data.priorityFocus.type]}
                                        </div>
                                    </div>
                                    <div>
                                        <h2 className="text-3xl md:text-5xl font-black text-white mb-2 tracking-tight drop-shadow-xl">
                                            Latihan {data.priorityFocus.type}
                                        </h2>
                                        <p className="text-indigo-100 text-sm font-medium max-w-xl leading-relaxed drop-shadow-sm">
                                            {data.priorityFocus.reason}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 text-sm font-semibold text-indigo-100 pl-4 border-l-4 border-cyan-400">
                                    <Target className="w-4 h-4 text-cyan-400" />
                                    <span>Target Skor: <span className="text-white text-lg">{data.priorityFocus.target}</span></span>
                                </div>
                            </div>

                            <form action={`/dashboard/latihan`}>
                                <Link
                                    href="/dashboard/latihan"
                                    className="relative inline-flex items-center gap-3 px-8 py-4 bg-white text-indigo-950 font-black text-base rounded-2xl shadow-[0_0_30px_-5px_rgba(255,255,255,0.6)] hover:shadow-[0_0_50px_-10px_rgba(255,255,255,0.8)] transition-all transform hover:-translate-y-1 hover:scale-105 active:scale-95 group/btn overflow-hidden"
                                >
                                    <span className="relative z-10 flex items-center gap-2">
                                        Mulai Latihan
                                        <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-2 transition-transform stroke-[3px]" />
                                    </span>
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent translate-x-[-100%] group-hover/btn:animate-[shimmer_1.5s_infinite]" />
                                </Link>
                            </form>
                        </div>
                    </div>
                </motion.div>
            </motion.div>

            {/* 3. NEON GRID LAYOUT */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* PROGRESS SECTION */}
                <motion.div variants={itemVariants} className="lg:col-span-2">
                    <div className="h-full bg-secondary/10 hover:bg-secondary/20 border border-border hover:border-primary/50 transition-all duration-300 rounded-[2rem] p-8 md:p-10 relative overflow-hidden group">
                        {/* Background Gradient similar to Practice Card */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-20 transition-opacity" />

                        <div className="flex items-center gap-4 mb-8 relative z-10">
                            <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20">
                                <TrendingUp className="w-5 h-5" />
                            </div>
                            <h3 className="font-bold text-xl text-foreground tracking-tight">Progress Tracker</h3>
                        </div>

                        <div className="flex flex-col gap-4 relative z-10">
                            {(['twk', 'tiu', 'tkp'] as const).map((type, idx) => {
                                const progress = data.progress[type]
                                const percentage = Math.min((progress.score / progress.target) * 100, 100)
                                const typeUpper = type.toUpperCase() as 'TWK' | 'TIU' | 'TKP'
                                const colors = TYPE_COLORS[typeUpper]

                                return (
                                    <motion.div
                                        key={type}
                                        whileHover={{ x: 5 }}
                                        className="relative p-6 rounded-3xl bg-background border border-border/50 hover:border-primary/50 hover:bg-secondary/50 transition-all group will-change-transform"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={cn(
                                                "w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-lg border border-white/10 flex-shrink-0",
                                                colors.bg,
                                                "text-white"
                                            )}>
                                                {TYPE_ICONS[typeUpper]}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between mb-0">
                                                    <div>
                                                        <span className="font-extrabold text-lg text-foreground block leading-tight">{TYPE_NAMES[typeUpper]}</span>
                                                        <span className="text-xs font-bold text-muted-foreground">{typeUpper}</span>
                                                    </div>
                                                    {progress.passed ? (
                                                        <div className="flex items-center gap-1.5 bg-green-500/10 px-2 py-1 rounded-lg border border-green-500/20">
                                                            <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                                                            <span className="text-[10px] font-bold text-green-400 uppercase tracking-wide">Lulus Passing Grade</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1.5 bg-red-500/10 px-2 py-1 rounded-lg border border-red-500/20">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                                            <span className="text-[10px] font-bold text-red-400 uppercase tracking-wide">Belum Lulus</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="space-y-1">
                                                    <div className="flex justify-end items-end">
                                                        <span className="text-base font-bold text-muted-foreground">
                                                            <span className={cn("text-xl", progress.passed ? "text-green-400" : "text-foreground")}>{progress.score}</span>
                                                            <span className="text-muted-foreground mx-1">/</span>
                                                            {progress.target}
                                                        </span>
                                                    </div>
                                                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden p-[1px] shadow-inner">
                                                        <motion.div
                                                            className={cn(
                                                                "h-full rounded-full shadow-[0_0_15px_rgba(255,255,255,0.5)] relative overflow-hidden",
                                                                progress.passed ? "bg-green-500" : colors.bg
                                                            )}
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${percentage}%` }}
                                                            transition={{ duration: 1.5, ease: "easeOut", delay: idx * 0.2 }}
                                                        >
                                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-[shimmer_2s_infinite]" />
                                                        </motion.div>
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
                <motion.div variants={itemVariants} className="space-y-8">
                    {/* EXP CARD */}
                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        className="p-8 rounded-[2rem] bg-gradient-to-br from-yellow-500/10 to-background border border-yellow-500/20 relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/20 rounded-full blur-[60px]" />
                        <div className="flex items-center justify-between mb-4 relative z-10">
                            <div>
                                <span className="text-xs font-bold text-yellow-500/80 uppercase tracking-widest">Total XP</span>
                                <div className="text-4xl font-black text-foreground mt-1">
                                    {data.stats.xp.toLocaleString()}
                                </div>
                            </div>
                            <div className="p-3 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 shadow-[0_0_20px_rgba(234,179,8,0.3)]">
                                <Zap className="w-6 h-6 text-yellow-400 fill-current animate-pulse" />
                            </div>
                        </div>
                        <div className="inline-block px-3 py-1 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-400 text-xs font-bold uppercase tracking-wider">
                            Rank: {data.stats.levelName}
                        </div>
                    </motion.div>

                    {/* STREAK & LEVEL GRID */}
                    <div className="grid grid-cols-2 gap-4">
                        <motion.div
                            whileHover={{ scale: 1.05 }}
                            className="p-5 rounded-3xl bg-slate-950/50 backdrop-blur-xl border border-orange-500/20 flex flex-col items-center justify-center text-center gap-2 shadow-lg group"
                        >
                            <div className="w-12 h-12 rounded-full bg-orange-500/10 text-orange-500 border border-orange-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(249,115,22,0.3)] group-hover:shadow-[0_0_30px_rgba(249,115,22,0.5)] transition-all duration-300">
                                <Flame className="w-6 h-6 fill-current animate-[bounce_2s_infinite]" />
                            </div>
                            <div>
                                <div className="text-2xl font-black text-white">{data.user.streak}</div>
                                <div className="text-[10px] uppercase tracking-widest font-bold text-orange-400/80">Streak</div>
                            </div>
                        </motion.div>

                        <motion.div
                            whileHover={{ scale: 1.05 }}
                            className="p-5 rounded-3xl bg-slate-950/50 backdrop-blur-xl border border-blue-500/20 flex flex-col items-center justify-center text-center gap-2 shadow-lg group"
                        >
                            <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.3)] group-hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] transition-all duration-300">
                                <Trophy className="w-6 h-6 fill-current" />
                            </div>
                            <div>
                                <div className="text-2xl font-black text-white">Lv.{data.stats.level}</div>
                                <div className="text-[10px] uppercase tracking-widest font-bold text-blue-400/80">Level</div>
                            </div>
                        </motion.div>
                    </div>

                    {/* RECOMMENDATIONS */}
                    <div className="p-8 rounded-[2rem] bg-secondary/10 border border-border hover:border-primary/50 transition-colors">
                        <div className="flex items-center gap-3 mb-4">
                            <Sparkles className="w-4 h-4 text-purple-400" />
                            <h3 className="font-bold text-base text-foreground">Quick Access</h3>
                        </div>
                        <div className="space-y-4">
                            {data.recommendations.map((rec, i) => (
                                <Link
                                    key={i}
                                    href="/dashboard/latihan"
                                    className="flex items-center gap-5 p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-purple-500/50 transition-all group duration-300 hover:scale-[1.02]"
                                >
                                    <div className={cn(
                                        "w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-md group-hover:shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all",
                                        TYPE_COLORS[rec.type].bgLight,
                                        TYPE_COLORS[rec.type].text
                                    )}>
                                        {TYPE_ICONS[rec.type]}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-sm text-white truncate group-hover:text-purple-300 transition-colors">{rec.title}</h4>
                                        <p className="text-[10px] text-slate-400 truncate mt-0.5">{rec.description}</p>
                                    </div>
                                    <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-purple-500 group-hover:text-white transition-all shadow-inner">
                                        <ArrowRight className="w-3 h-3" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </motion.div>
            </div>
        </motion.div>
    )
}
