import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
    CheckCircle2,
    XCircle,
    ArrowLeft,
    Trophy,
    Clock,
    Target,
    BarChart3,
    RefreshCw,
    Play,
    AlertTriangle
} from 'lucide-react'
import ResultReviewClient from '@/components/practice/ResultReviewClient'
import RetakeButton from '@/components/practice/RetakeButton'
import ScrollToReviewButton from '@/components/practice/ScrollToReviewButton'
import ResultXPWrapper from '@/components/practice/ResultXPWrapper'
import { getXPInfo } from '@/lib/dashboard'

export default async function PracticeResultPage({ params }: { params: Promise<{ sessionId: string }> }) {
    const supabase = await createClient()
    const { sessionId } = await params

    // 1. Fetch Session Result
    const { data: session, error: sessionError } = await supabase
        .from('test_sessions')
        .select('*')
        .eq('id', sessionId)
        .single()

    if (sessionError || !session) {
        redirect('/dashboard/latihan')
    }

    if (session.status !== 'completed') {
        // Optional: redirect or show message
    }

    // Fetch user's total XP before this session (for XP popup)
    const { data: allPreviousSessions } = await supabase
        .from('test_sessions')
        .select('total_score')
        .eq('user_id', session.user_id)
        .eq('status', 'completed')
        .neq('id', sessionId) // Exclude current session

    const previousTotalXP = allPreviousSessions?.reduce((sum, s) => sum + (s.total_score || 0), 0) || 0
    const xpEarned = session.total_score || 0
    const xpInfo = getXPInfo(previousTotalXP, xpEarned)

    // 2. Fetch Detailed Answers
    const { data: rawAnswers, error: answersError } = await supabase
        .from('test_answers')
        .select(`
            id,
            question_id,
            option_id,
            questions (
                id,
                content,
                explanation,
                type,
                category,
                options (
                    id,
                    content,
                    is_correct,
                    score_value
                )
            ),
            selected_option: options (
                id,
                content,
                is_correct,
                score_value
            )
        `)
        .eq('session_id', sessionId)

    if (answersError) return <div>Error loading results</div>

    const answers = rawAnswers?.map((ans: any) => ({
        ...ans,
        selected_option: Array.isArray(ans.selected_option) ? ans.selected_option[0] || null : ans.selected_option
    }))

    // --- DATA PROCESSING ---

    // 1. Determine Module Type
    const uniqueTypes = Array.from(new Set(answers.map((a: any) => {
        const q = Array.isArray(a.questions) ? a.questions[0] : a.questions
        return q.type
    })))
    const isCombined = uniqueTypes.length > 1
    const singleType = isCombined ? null : uniqueTypes[0]

    // 2. Calculate Stats Helper
    const calculateStats = (filterType?: string) => {
        const filtered = filterType
            ? answers.filter((a: any) => (Array.isArray(a.questions) ? a.questions[0] : a.questions).type === filterType)
            : answers

        const total = filtered.length
        if (total === 0) return { total: 0, correct: 0, wrong: 0, empty: 0, score: 0, maxScore: 0, accuracy: 0 }

        let correct = 0
        let score = 0
        let maxScore = 0

        filtered.forEach((a: any) => {
            const q = Array.isArray(a.questions) ? a.questions[0] : a.questions
            const type = q.type
            const isCorrect = a.selected_option?.is_correct
            const val = a.selected_option?.score_value || 0

            if (type === 'TKP') {
                score += val
                maxScore += 5
                if (val >= 3) correct++ // Loose definition for TKP "success"
            } else {
                if (isCorrect) {
                    correct++
                    score += 5
                }
                maxScore += 5
            }
        })

        const wrong = total - correct // This is a simplified view for TKP
        const accuracy = Math.round((score / maxScore) * 100)

        // Correction for actual correct/wrong counts needed for display
        const realCorrect = filtered.filter((a: any) => {
            const q = Array.isArray(a.questions) ? a.questions[0] : a.questions
            if (q.type === 'TKP') return (a.selected_option?.score_value || 0) === 5
            return a.selected_option?.is_correct
        }).length

        const realWrong = filtered.length - realCorrect

        return { total, correct: realCorrect, wrong: realWrong, score, maxScore, accuracy }
    }

    const mainStats = calculateStats(singleType || undefined)

    // 3. Time Duration
    const startTime = new Date(session.start_time).getTime()
    const endTime = session.end_time ? new Date(session.end_time).getTime() : Date.now()
    const durationMinutes = Math.floor((endTime - startTime) / 60000)
    const durationSeconds = Math.floor(((endTime - startTime) % 60000) / 1000)

    // 4. Grade Calculation
    const getGrade = (percentage: number) => {
        if (percentage >= 80) return { label: 'A', color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500', text: 'Sangat Baik' }
        if (percentage >= 65) return { label: 'B', color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500', text: 'Baik' }
        if (percentage >= 50) return { label: 'C', color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500', text: 'Cukup' }
        if (percentage >= 30) return { label: 'D', color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500', text: 'Kurang' }
        return { label: 'E', color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500', text: 'Perlu Belajar Lagi' }
    }

    const grade = getGrade(mainStats.accuracy)

    // 5. Feedback Logic
    const getFeedback = () => {
        if (mainStats.accuracy >= 80) return "Luar biasa! Kamu sudah siap untuk menaklukkan soal-soal SKD sesungguhnya. Pertahankan!"
        if (mainStats.accuracy >= 60) return "Permulaan yang bagus. Ada beberapa materi yang perlu diperdalam lagi agar skor makin maksimal."
        return "Jangan patah semangat! Perbanyak latihan soal dan pelajari pembahasan untuk meningkatkan pemahamanmu."
    }

    // --- UI HELPERS ---

    const CategoryCard = ({ type, score, maxScore, total, correct }: any) => {
        const pct = Math.round((score / maxScore) * 100) || 0
        const passingGrade = type === 'TWK' ? 65 : type === 'TIU' ? 80 : 166
        const isPassed = score >= passingGrade
        const passColor = isPassed ? 'text-green-600' : 'text-red-500'

        return (
            <div className="bg-card/50 border border-border p-4 rounded-xl flex flex-col gap-2 min-w-[140px] flex-1">
                <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-muted-foreground uppercase">{type}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isPassed ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                        {isPassed ? 'Lulus' : 'Belum Lulus'}
                    </span>
                </div>
                <div className="mt-1">
                    <span className={`text-2xl font-bold ${passColor}`}>{score}</span>
                    <span className="text-muted-foreground text-sm"> / {maxScore}</span>
                </div>

                <div className="flex items-center justify-between text-[10px] font-medium text-muted-foreground">
                    <span>Passing Grade: <span className="text-foreground">{passingGrade}</span></span>
                    <span>Benar: <span className="text-foreground">{correct}</span>/{total}</span>
                </div>

                {/* Mini Progress Bar */}
                <div className="w-full h-1.5 bg-secondary rounded-full mt-2 overflow-hidden">
                    <div
                        className={`h-full rounded-full ${isPassed ? 'bg-green-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                </div>
            </div>
        )
    }

    return (
        <ResultXPWrapper xpInfo={xpInfo}>
            <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8 pb-32">

                {/* 1. HERO SECTION */}
                <div className="relative overflow-hidden rounded-2xl bg-card border border-border shadow-2xl">
                    {/* Background Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-primary/5 to-purple-600/5" />
                    <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />

                    <div className="relative p-6 md:p-10 flex flex-col items-center text-center">
                        <div className="mb-2">
                            <span className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-semibold uppercase tracking-wider">
                                Hasil {isCombined ? 'Tryout SKD' : `Latihan ${singleType}`}
                            </span>
                        </div>

                        <h1 className="text-3xl md:text-4xl font-extrabold mb-1">
                            {grade.text}
                        </h1>
                        <p className="text-muted-foreground max-w-lg mx-auto mb-8">
                            {getFeedback()}
                        </p>

                        <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16 w-full justify-center">

                            {/* SCORE CIRCLE */}
                            <div className="relative group">
                                <div className={`w-40 h-40 md:w-48 md:h-48 rounded-full border-8 ${grade.border} flex flex-col items-center justify-center bg-card shadow-[0_0_30px_rgba(0,0,0,0.1)] dark:shadow-[0_0_30px_rgba(255,255,255,0.05)] transition-transform hover:scale-105`}>
                                    <div className="flex items-baseline gap-1">
                                        <span className={`text-5xl md:text-6xl font-black ${grade.color} tracking-tight leading-none`}>
                                            {session.total_score}
                                        </span>
                                        {!isCombined && singleType && (
                                            <span className="text-lg md:text-xl font-bold text-muted-foreground/40">
                                                /{singleType === 'TWK' ? 65 : singleType === 'TIU' ? 80 : 166}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-xs text-muted-foreground font-bold mt-1 uppercase tracking-widest">Total Skor</span>
                                </div>

                                {/* Grade Badge */}
                                <div className={`absolute -right-2 -top-2 w-14 h-14 rounded-full ${grade.bg} ${grade.border} border-4 flex items-center justify-center text-2xl font-bold ${grade.color} shadow-lg rotate-12`}>
                                    {grade.label}
                                </div>
                            </div>

                            {/* STATS GRID */}
                            <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
                                <div className="bg-secondary/30 p-4 rounded-xl border border-secondary flex flex-col items-start min-w-[140px]">
                                    <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold uppercase mb-1">
                                        <Target size={14} /> Akurasi
                                    </div>
                                    <span className="text-2xl font-bold">{mainStats.accuracy}%</span>
                                    <span className="text-[10px] text-muted-foreground">Persentase Kebenaran</span>
                                </div>

                                <div className="bg-secondary/30 p-4 rounded-xl border border-secondary flex flex-col items-start min-w-[140px]">
                                    <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold uppercase mb-1">
                                        <Clock size={14} /> Waktu
                                    </div>
                                    <span className="text-2xl font-bold">{durationMinutes}<span className="text-sm font-normal text-muted-foreground">m</span> {durationSeconds}<span className="text-sm font-normal text-muted-foreground">d</span></span>
                                    <span className="text-[10px] text-muted-foreground">Durasi Pengerjaan</span>
                                </div>

                                <div className="bg-secondary/30 p-4 rounded-xl border border-secondary flex flex-col items-start min-w-[140px]">
                                    <div className="flex items-center gap-2 text-green-600 text-xs font-bold uppercase mb-1">
                                        <CheckCircle2 size={14} /> Benar
                                    </div>
                                    <span className="text-2xl font-bold text-green-600">{mainStats.correct}</span>
                                    <span className="text-[10px] text-muted-foreground">Soal Terjawab Benar</span>
                                </div>

                                <div className="bg-secondary/30 p-4 rounded-xl border border-secondary flex flex-col items-start min-w-[140px]">
                                    <div className="flex items-center gap-2 text-red-500 text-xs font-bold uppercase mb-1">
                                        <XCircle size={14} /> Salah
                                    </div>
                                    <span className="text-2xl font-bold text-red-500">{mainStats.wrong}</span>
                                    <span className="text-[10px] text-muted-foreground">Soal Salah / Kosong</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. CATEGORY BREAKDOWN (If Combined) */}
                {isCombined && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <CategoryCard
                            type="TWK"
                            score={session.score_twk}
                            maxScore={calculateStats('TWK').maxScore}
                            total={calculateStats('TWK').total}
                            correct={calculateStats('TWK').correct}
                        />
                        <CategoryCard
                            type="TIU"
                            score={session.score_tiu}
                            maxScore={calculateStats('TIU').maxScore}
                            total={calculateStats('TIU').total}
                            correct={calculateStats('TIU').correct}
                        />
                        <CategoryCard
                            type="TKP"
                            score={session.score_tkp}
                            maxScore={calculateStats('TKP').maxScore}
                            total={calculateStats('TKP').total}
                            correct={calculateStats('TKP').correct} // Logic for TKP correct might need adjustment
                        />
                    </div>
                )}

                {/* 3. RECOMMENDATION CARD */}
                {/* Refined Logic: Handle multiple failures */}
                {isCombined && (
                    (() => {
                        // Calculate pass status for each section
                        const scores = [
                            { type: 'TWK', score: session.score_twk, target: 65, passed: session.score_twk >= 65 },
                            { type: 'TIU', score: session.score_tiu, target: 80, passed: session.score_tiu >= 80 },
                            { type: 'TKP', score: session.score_tkp, target: 166, passed: session.score_tkp >= 166 }
                        ]

                        const failedSections = scores.filter(s => !s.passed)
                        const allPassed = failedSections.length === 0

                        // Determine Message
                        let title = "Rekomendasi Belajar"
                        let message: React.ReactNode = ""
                        let linkText = "Pelajari Materi"
                        let typeColor = "text-orange-600 dark:text-orange-400"
                        let bgIcon = "bg-orange-100 dark:bg-orange-900/30"

                        if (allPassed) {
                            title = "Pertahankan Performamu!"
                            message = "Selamat! Kamu telah lulus passing grade di semua kategori. Pertahankan konsistensi latihanmu dan coba kerjakan soal-soal yang lebih sulit untuk memantapkan kesiapanmu."
                            linkText = "Lanjut Latihan Soal"
                            typeColor = "text-green-600 dark:text-green-400"
                            bgIcon = "bg-green-100 dark:bg-green-900/30"
                        } else if (failedSections.length === 3) {
                            title = "Perlu Evaluasi Menyeluruh"
                            message = (
                                <>
                                    Hasil menunjukkan kamu belum memenuhi passing grade di semua kategori (<span className="font-bold text-foreground">TWK, TIU, TKP</span>). Disarankan untuk mempelajari kembali materi dasar secara sistematis dari awal.
                                </>
                            )
                            linkText = "Mulai dari Materi Dasar"
                            typeColor = "text-red-600 dark:text-red-400"
                            bgIcon = "bg-red-100 dark:bg-red-900/30"
                        } else if (failedSections.length >= 1) {
                            // Build component array with separators
                            const comps = failedSections.map((s, idx) => {
                                const isLast = idx === failedSections.length - 1
                                const isSecondLast = idx === failedSections.length - 2
                                const suffix = isLast ? '' : isSecondLast ? ' dan ' : ', '
                                return <span key={s.type}><span className="font-bold text-foreground">{s.type}</span>{suffix}</span>
                            })

                            title = "Fokus Perbaikan Diperlukan"
                            message = (
                                <>
                                    Kamu masih belum memenuhi target di bidang: {comps}. Luangkan waktu lebih banyak untuk memperdalam materi kategori tersebut.
                                </>
                            )
                        }

                        return (
                            <div className={`bg-gradient-to-r ${allPassed ? 'from-green-500/10 to-blue-500/10 border-green-500/20' : 'from-orange-500/10 to-red-500/10 border-orange-500/20'} border rounded-xl p-6 flex items-start gap-4`}>
                                <div className={`p-3 rounded-full shrink-0 ${bgIcon} ${typeColor}`}>
                                    {allPassed ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg mb-1">{title}</h3>
                                    <div className="text-muted-foreground text-sm mb-4 leading-relaxed">
                                        {message}
                                    </div>
                                    <Link href="/dashboard/materi" className={`text-sm font-bold hover:underline flex items-center gap-1 ${typeColor}`}>
                                        {linkText} &rarr;
                                    </Link>
                                </div>
                            </div>
                        )
                    })()
                )}

                {/* 4. ACTION BAR (Sticky Bottom or Inline) */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                    <Link
                        href="/dashboard/latihan"
                        className="flex justify-center items-center gap-2 px-6 py-3 rounded-xl border border-border bg-card hover:bg-secondary/50 font-bold transition-all"
                    >
                        <ArrowLeft size={18} /> Daftar Latihan
                    </Link>

                    <RetakeButton isCombined={isCombined} singleType={singleType} />

                    <ScrollToReviewButton />
                </div>

                {/* 5. DETAILED ANSWER REVIEW (Existing Component) */}
                <div id="review-section" className="pt-8 border-t border-border">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="h-8 w-1 bg-primary rounded-full"></div>
                        <h2 className="text-2xl font-bold">Pembahasan & Detail Jawaban</h2>
                    </div>

                    <ResultReviewClient answers={answers || []} />
                </div>

            </div>
        </ResultXPWrapper>
    )
}
