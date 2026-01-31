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
    Sparkles
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
    TWK: '📖',
    TIU: '🧮',
    TKP: '💼',
}

export default function DashboardClient({ data, greeting }: Props) {
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    }

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    }

    const allPassed = data.progress.twk.passed && data.progress.tiu.passed && data.progress.tkp.passed

    return (
        <motion.div
            className="space-y-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* 1. GREETING */}
            <motion.div variants={itemVariants}>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                    {greeting.greeting}, <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">{data.user.name}</span>! 👋
                </h1>
                <p className="text-muted-foreground mt-1">{greeting.message}</p>
            </motion.div>

            {/* 2. DAILY FOCUS CARD - PRIMARY CTA */}
            <motion.div variants={itemVariants}>
                <div className={cn(
                    "relative overflow-hidden rounded-2xl p-6 md:p-8",
                    "bg-gradient-to-br",
                    TYPE_COLORS[data.priorityFocus.type].gradient,
                    "text-white shadow-lg"
                )}>
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-4">
                            <Sparkles className="w-5 h-5" />
                            <span className="text-sm font-semibold uppercase tracking-wider opacity-90">Fokus Hari Ini</span>
                        </div>

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                    <span className="text-4xl">{TYPE_ICONS[data.priorityFocus.type]}</span>
                                    <div>
                                        <h2 className="text-2xl md:text-3xl font-bold">
                                            Latihan {data.priorityFocus.type}
                                        </h2>
                                        <p className="text-white/80 text-sm md:text-base">
                                            {data.priorityFocus.reason}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <Target className="w-4 h-4" />
                                    <span>{data.priorityFocus.target}</span>
                                </div>
                            </div>

                            <form action={`/dashboard/latihan`}>
                                <Link
                                    href="/dashboard/latihan"
                                    className="inline-flex items-center gap-2 px-8 py-4 bg-white text-gray-900 font-bold rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95"
                                >
                                    Mulai Latihan
                                    <ArrowRight className="w-5 h-5" />
                                </Link>
                            </form>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* 3. PROGRESS TO PASSING GRADE */}
            <motion.div variants={itemVariants}>
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-6">
                        <TrendingUp className="w-5 h-5 text-primary" />
                        <h3 className="font-bold text-lg">Progress Passing Grade</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {(['twk', 'tiu', 'tkp'] as const).map((type) => {
                            const progress = data.progress[type]
                            const percentage = Math.min((progress.score / progress.target) * 100, 100)
                            const typeUpper = type.toUpperCase() as 'TWK' | 'TIU' | 'TKP'

                            return (
                                <div key={type} className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className={cn(
                                                "w-8 h-8 rounded-lg flex items-center justify-center text-lg",
                                                TYPE_COLORS[typeUpper].bgLight
                                            )}>
                                                {TYPE_ICONS[typeUpper]}
                                            </span>
                                            <span className="font-semibold">{typeUpper}</span>
                                        </div>
                                        {progress.passed ? (
                                            <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-500/10 px-2 py-1 rounded-full">
                                                <CheckCircle2 className="w-3 h-3" />
                                                Lulus
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-xs font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded-full">
                                                <AlertCircle className="w-3 h-3" />
                                                Belum
                                            </span>
                                        )}
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex justify-between text-sm">
                                            <span className={cn("font-bold", progress.passed ? "text-green-600" : "text-foreground")}>
                                                {progress.score}
                                            </span>
                                            <span className="text-muted-foreground">/ {progress.target}</span>
                                        </div>
                                        <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                                            <motion.div
                                                className={cn(
                                                    "h-full rounded-full",
                                                    progress.passed ? "bg-green-500" : TYPE_COLORS[typeUpper].bg
                                                )}
                                                initial={{ width: 0 }}
                                                animate={{ width: `${percentage}%` }}
                                                transition={{ duration: 1, ease: "easeOut" }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </motion.div>

            {/* 4. QUICK STATS + RECOMMENDATIONS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* QUICK STATS */}
                <motion.div variants={itemVariants}>
                    <div className="bg-card border border-border rounded-xl p-6 shadow-sm h-full">
                        <h3 className="font-bold text-lg mb-4">Status Belajar</h3>

                        <div className="grid grid-cols-3 gap-4">
                            {/* Streak */}
                            <div className="text-center p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
                                <Flame className="w-6 h-6 text-orange-500 mx-auto mb-2" />
                                <div className="text-2xl font-bold text-orange-500">{data.user.streak}</div>
                                <div className="text-xs text-muted-foreground">Hari Streak</div>
                            </div>

                            {/* XP */}
                            <div className="text-center p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                                <Zap className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
                                <div className="text-2xl font-bold text-yellow-500">{data.stats.xp.toLocaleString()}</div>
                                <div className="text-xs text-muted-foreground">Total XP</div>
                            </div>

                            {/* Level */}
                            <div className="text-center p-4 rounded-xl bg-primary/10 border border-primary/20">
                                <Trophy className="w-6 h-6 text-primary mx-auto mb-2" />
                                <div className="text-2xl font-bold text-primary">Lv.{data.stats.level}</div>
                                <div className="text-xs text-muted-foreground">{data.stats.levelName}</div>
                            </div>
                        </div>

                        {/* Next Tryout Info */}
                        {data.nextTryout && (
                            <div className="mt-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-500/20 rounded-lg">
                                        📅
                                    </div>
                                    <div>
                                        <div className="text-sm font-semibold">{data.nextTryout.name}</div>
                                        <div className="text-xs text-muted-foreground">Tryout Berikutnya</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xl font-bold text-blue-500">{data.nextTryout.daysLeft}</div>
                                    <div className="text-xs text-muted-foreground">hari lagi</div>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* SMART RECOMMENDATIONS */}
                <motion.div variants={itemVariants}>
                    <div className="bg-card border border-border rounded-xl p-6 shadow-sm h-full">
                        <div className="flex items-center gap-2 mb-4">
                            <BookOpen className="w-5 h-5 text-primary" />
                            <h3 className="font-bold text-lg">Rekomendasi Latihan</h3>
                        </div>

                        <div className="space-y-3">
                            {data.recommendations.map((rec, i) => (
                                <Link
                                    key={i}
                                    href="/dashboard/latihan"
                                    className={cn(
                                        "flex items-center gap-4 p-4 rounded-xl border transition-all",
                                        "hover:border-primary/50 hover:bg-secondary/50 group",
                                        TYPE_COLORS[rec.type].border,
                                        TYPE_COLORS[rec.type].bgLight
                                    )}
                                >
                                    <div className={cn(
                                        "w-12 h-12 rounded-xl flex items-center justify-center text-2xl",
                                        "bg-white/50 dark:bg-black/20"
                                    )}>
                                        {TYPE_ICONS[rec.type]}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-semibold group-hover:text-primary transition-colors">{rec.title}</h4>
                                        <p className="text-sm text-muted-foreground">{rec.description}</p>
                                    </div>
                                    <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                </Link>
                            ))}

                            {allPassed && (
                                <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
                                    <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                                    <p className="text-sm font-semibold text-green-600">
                                        Semua kategori sudah lulus passing grade! 🎉
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Pertahankan dengan latihan rutin
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        </motion.div>
    )
}
