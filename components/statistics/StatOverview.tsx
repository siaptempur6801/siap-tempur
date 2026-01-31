'use client'

import {
    Trophy,
    Target,
    Zap,
    TrendingUp
} from 'lucide-react'

interface Stat {
    label: string
    value: string | number
    subValue?: string
    icon: React.ElementType
    color: string // Tailwind text class
    bg: string // Tailwind bg class
}

export default function StatOverview({ data, streak, type }: { data: any, streak: number, type?: string }) {

    let avgScoreSub = "Dari Total 550"
    let avgLabel = "Rata-rata Skor"

    // Determine Passing Grade based on Type
    if (type) {
        if (type === 'twk') avgScoreSub = "/ 65 (Passing Grade)"
        else if (type === 'tiu') avgScoreSub = "/ 80 (Passing Grade)"
        else if (type === 'tkp') avgScoreSub = "/ 166 (Passing Grade)"
        else if (type === 'tryout') avgScoreSub = "/ 550 (SKD)"
    }

    const stats: Stat[] = [
        {
            label: "Total Latihan",
            value: data.summary.totalSessions,
            subValue: "Sesi Selesai",
            icon: Target,
            color: "text-blue-500",
            bg: "bg-blue-500/10"
        },
        {
            label: avgLabel,
            value: data.summary.avgScore,
            subValue: avgScoreSub,
            icon: TrendingUp,
            color: "text-purple-500",
            bg: "bg-purple-500/10"
        },
        {
            label: "Skor Tertinggi",
            value: data.summary.maxScore,
            subValue: "Personal Best",
            icon: Trophy,
            color: "text-yellow-500",
            bg: "bg-yellow-500/10"
        },
        {
            label: "Current Streak",
            value: `${streak} Hari`,
            subValue: "Konsistensi",
            icon: Zap,
            color: "text-orange-500",
            bg: "bg-orange-500/10"
        }
    ]

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, idx) => (
                <div key={idx} className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                        <div className={`p-2 rounded-lg ${stat.bg}`}>
                            <stat.icon className={`w-5 h-5 ${stat.color}`} />
                        </div>
                    </div>
                    <div>
                        <h4 className="text-2xl font-bold tracking-tight">{stat.value}</h4>
                        <div className="flex flex-col">
                            <p className="text-xs text-muted-foreground font-medium mt-1 uppercase tracking-wide">{stat.label}</p>
                            {stat.subValue && <p className="text-[10px] text-muted-foreground/80 font-normal mt-0.5">{stat.subValue}</p>}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}
