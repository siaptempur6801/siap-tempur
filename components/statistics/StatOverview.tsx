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
    borderColor: string
}

export default function StatOverview({ data, streak, type }: { data: any, streak: number, type?: string }) {

    let avgScoreSub = "Dari Total 550"
    const avgLabel = "Rata-rata Skor"

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
            color: "text-blue-700",
            bg: "bg-blue-200",
            borderColor: "border-blue-400"
        },
        {
            label: avgLabel,
            value: data.summary.avgScore,
            subValue: avgScoreSub,
            icon: TrendingUp,
            color: "text-purple-700",
            bg: "bg-purple-200",
            borderColor: "border-purple-400"
        },
        {
            label: "Skor Tertinggi",
            value: data.summary.maxScore,
            subValue: "Personal Best",
            icon: Trophy,
            color: "text-yellow-700",
            bg: "bg-yellow-200",
            borderColor: "border-yellow-400"
        },
        {
            label: "Current Streak",
            value: `${streak} Hari`,
            subValue: "Konsistensi",
            icon: Zap,
            color: "text-orange-700",
            bg: "bg-orange-200",
            borderColor: "border-orange-400"
        }
    ]

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, idx) => (
                <div
                    key={idx}
                    className={`${stat.bg} border-2 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] p-4 flex flex-col justify-between hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] transition-all ${idx % 2 === 0 ? 'rotate-[0.5deg]' : '-rotate-[0.5deg]'}`}
                >
                    <div className="flex justify-between items-start mb-3">
                        <div className={`p-2 bg-white border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`}>
                            <stat.icon className={`w-5 h-5 ${stat.color}`} />
                        </div>
                    </div>
                    <div>
                        <h4 className="text-2xl font-bold tracking-tight text-gray-900">{stat.value}</h4>
                        <div className="flex flex-col">
                            <p className="text-sm text-gray-700 font-bold mt-1 uppercase tracking-wide">{stat.label}</p>
                            {stat.subValue && <p className="text-xs text-gray-600 font-normal mt-0.5">{stat.subValue}</p>}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}

