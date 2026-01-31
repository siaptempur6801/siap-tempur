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
                    <Link href="/dashboard/profile" className="p-2 rounded-lg hover:bg-secondary transition">
                        <ArrowLeft size={20} />
                    </Link>
                    <h1 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
                        Statistik Belajar
                    </h1>
                </div>
                <div className="flex flex-col items-center justify-center min-h-[400px] border border-dashed rounded-xl p-8 text-center bg-card/50">
                    <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4">
                        <AlertCircle className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Belum Cukup Data</h3>
                    <p className="text-muted-foreground mb-6 max-w-md">
                        Kamu belum menyelesaikan sesi latihan apapun. Mulai latihan sekarang untuk melihat analisis performamu di sini!
                    </p>
                    <Link href="/dashboard/latihan" className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition shadow-lg shadow-primary/20">
                        Mulai Latihan Pertama
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8 pb-32">

            {/* HERADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/profile" className="p-2 rounded-lg hover:bg-secondary transition">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold">Statistik Belajar</h1>
                        <p className="text-muted-foreground">Analisis performa & progres belajar SKD kamu</p>
                    </div>
                </div>
                <div className="px-4 py-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 rounded-full text-xs font-bold flex items-center gap-2 self-start md:self-auto">
                    <Sparkles size={14} /> AI-Powered Analysis
                </div>
            </div>

            {/* 1. OVERVIEW CARDS */}
            {stats.all && <StatOverview data={stats.all} streak={profile?.streak_count || 0} />}

            {/* AI INSIGHT BOX */}
            <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border-l-4 border-indigo-500 p-6 rounded-r-xl">
                <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="text-indigo-500 w-5 h-5" />
                    <h3 className="font-bold text-lg text-foreground">Insight Minggu Ini</h3>
                </div>
                <div className="space-y-1">
                    {(stats.all?.insights || []).map((insight: string, idx: number) => (
                        <p key={idx} className="text-sm md:text-base text-muted-foreground leading-relaxed">
                            • <span dangerouslySetInnerHTML={{ __html: insight.replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground">$1</strong>') }} />
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
