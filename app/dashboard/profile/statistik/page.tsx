import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Sparkles, AlertCircle } from 'lucide-react'
import { processStatistics, SessionData } from '@/lib/statistics'
import StatOverview from '@/components/statistics/StatOverview'
import TrendChart from '@/components/statistics/TrendChart'
import CategoryChart from '@/components/statistics/CategoryChart'
import ConsistencyTracker from '@/components/statistics/ConsistencyTracker'

export default async function StatisticsPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // 1. Fetch Completed Sessions
    const { data: rawSessions, error: sessionError } = await supabase
        .from('test_sessions')
        .select(`
            id,
            start_time,
            total_score,
            score_twk,
            score_tiu,
            score_tkp,
            status,
            mode
        `)
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('start_time', { ascending: true }) // Easier for processing history

    if (sessionError) {
        console.error('Stats Error:', sessionError)
        return <div>Error loading statistics</div>
    }

    // 2. Fetch Profile for Streak
    const { data: profile } = await supabase
        .from('profiles')
        .select('streak_count')
        .eq('id', user.id)
        .single()

    // 3. Process Data
    const stats = processStatistics(rawSessions as unknown as SessionData[])

    if (!stats) {
        return (
            <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8">
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/dashboard/profile" className="p-2 border-2 border-gray-900 bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow-100 transition">
                        <ArrowLeft size={20} />
                    </Link>
                    <h1 className="text-2xl md:text-3xl font-black text-gray-900">
                        Statistik Belajar
                    </h1>
                </div>
                <div className="flex flex-col items-center justify-center min-h-[400px] border-2 border-dashed border-gray-400 bg-white p-8 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <div className="w-16 h-16 bg-blue-100 border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center mb-4">
                        <AlertCircle className="w-8 h-8 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Belum Cukup Data</h3>
                    <p className="text-gray-600 mb-6 max-w-md">
                        Kamu belum menyelesaikan sesi latihan apapun. Mulai latihan sekarang untuk melihat analisis performamu di sini!
                    </p>
                    <Link href="/dashboard/latihan" className="px-6 py-3 bg-blue-600 text-white border-2 border-gray-900 font-bold hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        Mulai Latihan Pertama
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8 pb-32">

            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/profile" className="p-2 border-2 border-gray-900 bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow-100 transition">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-gray-900">Statistik Belajar</h1>
                        <p className="text-gray-600">Analisis performa & progres belajar SKD kamu</p>
                    </div>
                </div>
                <div className="px-4 py-2 bg-yellow-300 border-2 border-gray-900 text-gray-900 rounded-none shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] text-xs font-bold flex items-center gap-2 self-start md:self-auto rotate-1">
                    <Sparkles size={14} /> AI-Powered Analysis
                </div>
            </div>

            {/* 1. OVERVIEW CARDS */}
            {stats.all && <StatOverview data={stats.all} streak={profile?.streak_count || 0} />}

            {/* AI INSIGHT BOX */}
            <div className="bg-white border-2 border-gray-900 p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
                {/* Tape Deco */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-6 bg-blue-100/80 border-l border-r border-white/50 -rotate-1 shadow-sm z-10"></div>

                <div className="flex items-center gap-2 mb-4 relative z-10">
                    <Sparkles className="text-blue-600 w-5 h-5" />
                    <h3 className="font-black text-xl text-gray-900 uppercase tracking-tight">Insight Minggu Ini</h3>
                </div>
                <div className="space-y-2 relative z-10">
                    {(stats.all?.insights || []).map((insight: string, idx: number) => (
                        <p key={idx} className="text-sm md:text-base text-gray-700 leading-relaxed font-medium">
                            • <span dangerouslySetInnerHTML={{ __html: insight.replace(/\*\*(.*?)\*\*/g, '<strong class="text-gray-900 border-b-2 border-yellow-200">$1</strong>') }} />
                        </p>
                    ))}
                </div>
            </div>

            {/* 2. CHARTS ROW */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 min-h-[400px]">
                    <TrendChart
                        data={stats.all?.trendData || []}
                        trendDirection={stats.all?.trendDirection || 'flat'}
                        trendPercentage={stats.all?.trendPercentage || 0}
                        shortTermTrend={stats.all?.shortTermTrend || 'flat'}
                        shortTermPercentage={stats.all?.shortTermPercentage || 0}
                    />
                </div>
                <div className="min-h-[400px]">
                    <CategoryChart data={stats.all?.categoryStats || []} />
                </div>
            </div>

            {/* 3. CONSISTENCY & WEAKNESS */}
            <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
                {/* Consistency is full width if singular, or split */}
                <ConsistencyTracker
                    data={stats.all?.consistencyData || []}
                    score={stats.all?.consistencyScore || 0}
                    activeCount={stats.all?.activeInPeriod || 0}
                />
            </div>

        </div>
    )
}
