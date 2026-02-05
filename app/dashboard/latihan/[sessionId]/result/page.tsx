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
    AlertTriangle,
    Sparkles
} from 'lucide-react'
import ResultReviewClient from '@/components/practice/ResultReviewClient'
import RetakeButton from '@/components/practice/RetakeButton'
import ScrollToReviewButton from '@/components/practice/ScrollToReviewButton'
import ResultXPWrapper from '@/components/practice/ResultXPWrapper'
import PaperBackground from '@/components/PaperBackground'
import { getXPInfo } from '@/lib/dashboard'
import { cn, formatSubjectName } from '@/lib/utils'

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
        if (mainStats.accuracy >= 80) return "Luar biasa! Kamu sudah siap untuk menaklukkan soal-soal SKD sesungguhnya. Pertahankan! 🏆"
        if (mainStats.accuracy >= 60) return "Permulaan yang bagus. Ada beberapa materi yang perlu diperdalam lagi agar skor makin maksimal. 💪"
        return "Jangan patah semangat! Perbanyak latihan soal dan pelajari pembahasan untuk meningkatkan pemahamanmu. 🔥"
    }

    // --- UI HELPERS ---

    const CategoryCard = ({ type, score, maxScore, total, correct }: any) => {
        const pct = Math.round((score / maxScore) * 100) || 0
        const passingGrade = type === 'TWK' ? 65 : type === 'TIU' ? 80 : 166
        const isPassed = score >= passingGrade
        const passColor = isPassed ? 'text-green-600' : 'text-red-500'

        return (
            <div className="bg-white border-2 border-gray-900 p-4 sm:p-5 rounded-2xl flex flex-col gap-3 relative overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group hover:scale-[1.02] transition-transform font-handwriting">
                <PaperBackground />
                <div className="flex justify-between items-center relative z-10">
                    <span className="text-sm font-bold text-gray-800 uppercase tracking-widest">{type}</span>
                    <span className={cn(
                        "text-[10px] px-2.5 py-1 rounded-full font-bold border-2 rotate-3",
                        isPassed ? "bg-green-100 text-green-700 border-green-300" : "bg-red-100 text-red-700 border-red-300"
                    )}>
                        {isPassed ? 'LULUS ✨' : 'BELUM LULUS'}
                    </span>
                </div>
                <div className="mt-2 relative z-10">
                    <span className={cn("text-4xl font-black font-sans", passColor)}>{score}</span>
                    <span className="text-gray-400 text-lg font-sans"> / {maxScore}</span>
                </div>

                <div className="flex flex-col gap-1 text-xs font-bold text-gray-500 relative z-10 font-sans">
                    <div className="flex justify-between"><span>Passing Grade:</span> <span className="text-gray-900">{passingGrade}</span></div>
                    <div className="flex justify-between"><span>Benar:</span> <span className="text-gray-900">{correct}/{total} Soal</span></div>
                </div>

                {/* Mini Progress Bar */}
                <div className="w-full h-3 bg-gray-100 border-2 border-gray-900 rounded-full mt-2 overflow-hidden relative z-10">
                    <div
                        className={cn("h-full rounded-full border-r-2 border-gray-900 transition-all duration-1000", isPassed ? 'bg-green-500' : 'bg-red-500')}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                </div>
            </div>
        )
    }

    return (
        <ResultXPWrapper xpInfo={xpInfo}>
            <div className="max-w-5xl mx-auto p-3 sm:p-8 space-y-6 sm:space-y-8 pb-32 font-handwriting">

                {/* 1. HERO SECTION */}
                <div className="relative overflow-hidden rounded-3xl bg-[#fff9c4] border-2 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                    <PaperBackground />

                    <div className="relative p-6 sm:p-12 flex flex-col items-center text-center z-10">
                        <div className="mb-4">
                            <span className="px-4 py-1.5 rounded-full bg-gray-900 text-white text-sm font-bold uppercase tracking-widest rotate-2 inline-block">
                                HASIL {isCombined ? 'TRYOUT SKD' : `LATIHAN ${formatSubjectName(singleType || '')}`} 📝
                            </span>
                        </div>

                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-4 text-gray-900 drop-shadow-sm">
                            {grade.text}
                        </h1>
                        <p className="text-gray-700 text-lg md:text-xl max-w-2xl mx-auto mb-10 italic font-medium">
                            "{getFeedback()}"
                        </p>

                        <div className="flex flex-col md:flex-row items-center gap-10 md:gap-20 w-full justify-center">

                            {/* SCORE CIRCLE */}
                            <div className="relative group">
                                <div className={cn(
                                    "w-44 h-44 sm:w-56 sm:h-56 rounded-full border-4 border-gray-900 flex flex-col items-center justify-center bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-transform hover:scale-105 relative",
                                    grade.border
                                )}>
                                    <div className="flex items-baseline gap-1">
                                        <span className={cn("text-7xl md:text-8xl font-black tracking-tighter leading-none font-sans", grade.color)}>
                                            {session.total_score}
                                        </span>
                                    </div>
                                    <span className="text-sm text-gray-500 font-bold mt-2 uppercase tracking-widest">Skor Akhir</span>

                                    {/* Doodle around score */}
                                    <div className="absolute -top-2 -right-2 opacity-20">
                                        <Sparkles size={40} className="text-gray-900" />
                                    </div>
                                </div>

                                {/* Grade Badge */}
                                <div className={cn(
                                    "absolute -right-4 -top-4 w-20 h-20 rounded-xl border-4 border-gray-900 flex items-center justify-center text-4xl font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rotate-12",
                                    grade.bg, grade.color
                                )}>
                                    {grade.label}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full md:w-auto">
                                <div className="bg-white p-3 sm:p-5 rounded-2xl border-2 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex flex-col items-start min-w-[140px] -rotate-1">
                                    <div className="flex items-center gap-2 text-gray-500 text-[10px] sm:text-sm font-bold uppercase mb-0.5 sm:mb-1">
                                        <Target size={14} className="text-blue-500 sm:w-4 sm:h-4" /> Akurasi
                                    </div>
                                    <span className="text-2xl sm:text-3xl font-black text-gray-900 font-sans">{mainStats.accuracy}%</span>
                                    <span className="text-[10px] sm:text-xs text-gray-400 font-medium whitespace-nowrap">Banyak Benernya</span>
                                </div>

                                <div className="bg-white p-3 sm:p-5 rounded-2xl border-2 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex flex-col items-start min-w-[140px] rotate-1">
                                    <div className="flex items-center gap-2 text-gray-500 text-[10px] sm:text-sm font-bold uppercase mb-0.5 sm:mb-1">
                                        <Clock size={14} className="text-orange-500 sm:w-4 sm:h-4" /> Waktu
                                    </div>
                                    <span className="text-2xl sm:text-3xl font-black text-gray-900 font-sans">{durationMinutes}<span className="text-base sm:text-lg">m</span> {durationSeconds}<span className="text-base sm:text-lg">d</span></span>
                                    <span className="text-[10px] sm:text-xs text-gray-400 font-medium whitespace-nowrap">Lama Mikirnya</span>
                                </div>

                                <div className="bg-white p-3 sm:p-5 rounded-2xl border-2 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex flex-col items-start min-w-[140px] rotate-1">
                                    <div className="flex items-center gap-2 text-green-600 text-[10px] sm:text-sm font-bold uppercase mb-0.5 sm:mb-1">
                                        <CheckCircle2 size={14} className="sm:w-4 sm:h-4" /> Benar
                                    </div>
                                    <span className="text-2xl sm:text-3xl font-black text-green-600 font-sans">{mainStats.correct}</span>
                                    <span className="text-[10px] sm:text-xs text-gray-400 font-medium whitespace-nowrap">Berhasil HJ</span>
                                </div>

                                <div className="bg-white p-3 sm:p-5 rounded-2xl border-2 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex flex-col items-start min-w-[140px] -rotate-1">
                                    <div className="flex items-center gap-2 text-red-500 text-[10px] sm:text-sm font-bold uppercase mb-0.5 sm:mb-1">
                                        <XCircle size={14} className="sm:w-4 sm:h-4" /> Salah
                                    </div>
                                    <span className="text-2xl sm:text-3xl font-black text-red-500 font-sans">{mainStats.wrong}</span>
                                    <span className="text-[10px] sm:text-xs text-gray-400 font-medium whitespace-nowrap">Zonk / Skip</span>
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
                            <div className={cn(
                                "border-2 rounded-2xl p-5 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 relative overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                                allPassed ? 'bg-green-50 border-green-600' : 'bg-[#fff740] border-gray-900'
                            )}>
                                <PaperBackground />
                                <div className={cn(
                                    "p-3 rounded-full shrink-0 relative z-10 border-2 shadow-sm",
                                    allPassed ? "bg-green-500 text-white border-green-700" : "bg-orange-500 text-white border-orange-700"
                                )}>
                                    {allPassed ? <CheckCircle2 size={24} className="sm:w-8 sm:h-8" /> : <AlertTriangle size={24} className="sm:w-8 sm:h-8" />}
                                </div>
                                <div className="relative z-10 text-center sm:text-left">
                                    <h3 className="font-black text-xl sm:text-2xl mb-1 sm:mb-2 text-gray-900">{title}</h3>
                                    <div className="text-gray-800 text-base sm:text-lg mb-4 sm:mb-6 leading-relaxed font-medium">
                                        {message}
                                    </div>
                                    <Link href="/dashboard/latihan" className={cn(
                                        "inline-flex items-center gap-2 px-5 py-2 rounded-xl border-2 font-black transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none",
                                        allPassed ? "bg-green-600 text-white border-green-800" : "bg-gray-900 text-white border-black"
                                    )}>
                                        {linkText.replace('Materi', 'Latihan')} &rarr;
                                    </Link>
                                </div>
                                {allPassed && (
                                    <div className="absolute top-2 right-4 opacity-20 relative z-10">
                                        <Sparkles size={60} className="text-green-700" />
                                    </div>
                                )}
                            </div>
                        )
                    })()
                )}

                {/* 4. ACTION BAR (Sticky Bottom or Inline) */}
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center pt-4 sm:pt-8 px-2 sm:px-0">
                    <Link
                        href="/dashboard/latihan"
                        className="flex justify-center items-center gap-2 sm:gap-3 px-6 sm:px-8 py-3 sm:py-4 rounded-2xl border-2 border-gray-900 bg-white hover:bg-gray-50 font-black text-lg sm:text-xl transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                    >
                        <ArrowLeft size={20} className="sm:w-6 sm:h-6" /> Daftar Latihan
                    </Link>

                    <RetakeButton isCombined={isCombined} singleType={singleType} />

                    <ScrollToReviewButton />
                </div>

                {/* 5. DETAILED ANSWER REVIEW (Existing Component) */}
                <div id="review-section" className="pt-8 border-t border-border">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="h-10 w-2 bg-gray-900 rounded-full rotate-3"></div>
                        <h2 className="text-3xl font-black text-gray-900 uppercase tracking-widest">Pembahasan Lengkap</h2>
                    </div>

                    <ResultReviewClient answers={answers || []} />
                </div>

            </div>
        </ResultXPWrapper>
    )
}
