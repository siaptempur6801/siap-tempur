import { createClient, createAdminClient } from '@/lib/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { logger } from '@/lib/logger'
import {
    CheckCircle2,
    XCircle,
    ArrowLeft,
    Trophy,
    Clock,
    Target,

    AlertTriangle,
    Sparkles,
    Flame,
    ClipboardList,
    Zap
} from 'lucide-react'
import ResultReviewClient from '@/components/practice/ResultReviewClient'
import RetakeButton from '@/components/practice/RetakeButton'
import ScrollToReviewButton from '@/components/practice/ScrollToReviewButton'
import ResultXPWrapper from '@/components/practice/ResultXPWrapper'
import PaperBackground from '@/components/PaperBackground'
import { getXPInfo } from '@/lib/dashboard'
import { isDrillingMateriQuestionSet, normalizeTestSessionKind } from '@/lib/practice-session'
import { cn, formatSubjectName, calculateCurrentStreak, getDateKeyInTimeZone } from '@/lib/utils'
import { PASSING_GRADES } from '@/lib/constants'

type AnswerOption = {
    id: string
    content: string
    image_url?: string | null
    is_correct: boolean
    score_value: number
}

type AnswerQuestion = {
    id: string
    content: string
    image_url?: string | null
    explanation: string
    type: 'TWK' | 'TIU' | 'TKP'
    category: string
    sub_category: string | null
    options: AnswerOption[]
}

type RawAnswer = {
    id: string
    question_id: string
    option_id: string | null
    questions: AnswerQuestion | AnswerQuestion[] | null
    selected_option: AnswerOption | AnswerOption[] | null
}

type ReviewAnswer = {
    id: string
    question_id: string
    option_id: string
    questions: AnswerQuestion
    selected_option: AnswerOption | null
    sort_order: number
}

type CategoryCardProps = {
    type: string
    score: number
    maxScore: number
    total: number
    correct: number
}

function CategoryCard({ type, score, maxScore, total, correct }: CategoryCardProps) {
    const pct = Math.round((score / maxScore) * 100) || 0
    const typeUpper = type.toUpperCase() as keyof typeof PASSING_GRADES
    const passingGrade = PASSING_GRADES[typeUpper]
    const isPassed = score >= passingGrade
    const passColor = isPassed ? 'text-green-600' : 'text-red-500'

    return (
        <div className="bg-white border-2 border-gray-900 p-3.5 sm:p-4 rounded-2xl flex flex-col gap-2.5 relative overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group hover:scale-[1.02] transition-transform font-handwriting">
            <PaperBackground />
            <div className="flex justify-between items-center relative z-10">
                <span className="text-xs sm:text-sm font-bold text-gray-800 uppercase tracking-widest">{type}</span>
                <span className={cn(
                    "text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full font-bold border-2 rotate-3",
                    isPassed ? "bg-green-100 text-green-700 border-green-300" : "bg-red-100 text-red-700 border-red-300"
                )}>
                    {isPassed ? <span className="inline-flex items-center gap-1">LULUS <Sparkles className="w-3 h-3" /></span> : 'BELUM LULUS'}
                </span>
            </div>
            <div className="mt-2 relative z-10">
                <span className={cn("text-3xl sm:text-4xl font-black font-sans", passColor)}>{score}</span>
                <span className="text-gray-400 text-base sm:text-lg font-sans"> / {maxScore}</span>
            </div>

            <div className="flex flex-col gap-1 text-[11px] sm:text-xs font-bold text-gray-500 relative z-10 font-sans">
                <div className="flex justify-between"><span>Passing Grade:</span> <span className="text-gray-900">{passingGrade}</span></div>
                <div className="flex justify-between"><span>Benar:</span> <span className="text-gray-900">{correct}/{total} Soal</span></div>
            </div>

            <div className="w-full h-2.5 bg-gray-100 border-2 border-gray-900 rounded-full mt-1.5 overflow-hidden relative z-10">
                <div
                    className={cn("h-full rounded-full border-r-2 border-gray-900 transition-all duration-1000", isPassed ? 'bg-green-500' : 'bg-red-500')}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                />
            </div>
        </div>
    )
}

function normalizeRelation<T>(value: T | T[] | null): T | null {
    if (Array.isArray(value)) {
        return value[0] ?? null
    }
    return value
}

function formatDateTime(value: string) {
    return new Intl.DateTimeFormat('id-ID', {
        weekday: 'long',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
        timeZone: 'Asia/Jakarta',
    }).format(new Date(value))
}

export default async function PracticeResultPage({
    params,
    searchParams
}: {
    params: Promise<{ sessionId: string }>
    searchParams: Promise<{ from?: string; completed?: string }>
}) {
    const supabase = await createClient()
    const { sessionId } = await params
    const { from, completed } = await searchParams
    const cameFromHistory = from === 'riwayat'
    const cameFromMiniTryout = from === 'mini-tryout'
    const cameFromDrillingMateri = from === 'drilling-materi'
    const isCompleted = completed === 'true'

    // 1. Fetch Session Result
    const { data: session, error: sessionError } = await supabase
        .from('test_sessions')
        .select('*')
        .eq('id', sessionId)
        .single()

    if (sessionError || !session) {
        redirect('/cpns/dashboard/tryout')
    }

    if (session.status !== 'completed') {
        redirect(`/cpns/dashboard/tryout/${sessionId}`)
    }

    const { data: eventSession } = await supabase
        .from('tryout_event_sessions')
        .select(`
            id,
            tryout_events (
                title,
                starts_at,
                ends_at,
                duration_minutes,
                start_grace_minutes,
                result_visible_at,
                explanation_visible_at
            )
        `)
        .eq('session_id', sessionId)
        .maybeSingle()

    const isEventSession = from === 'event' || Boolean(eventSession)
    const event = normalizeRelation(eventSession?.tryout_events || null)
    const backHref = cameFromHistory
        ? '/cpns/dashboard/riwayat'
        : isEventSession
            ? '/cpns/dashboard/event'
            : cameFromDrillingMateri
                ? '/cpns/dashboard/drilling-materi'
                : cameFromMiniTryout
                    ? '/cpns/dashboard/mini-tryout'
                    : '/cpns/dashboard/tryout'
    const backLabel = cameFromHistory ? 'Riwayat' : isEventSession ? 'Event' : cameFromDrillingMateri ? 'Drilling Materi' : cameFromMiniTryout ? 'Mini Tryout' : 'Dashboard'
    const synchronizedCloseAt = event
        ? new Date(
            new Date(event.starts_at).getTime() +
            (event.duration_minutes + event.start_grace_minutes) * 60 * 1000
        ).toISOString()
        : null
    const resultVisibleAt = synchronizedCloseAt || event?.result_visible_at || event?.ends_at || null
    const eventTitle = event?.title || 'event ini'
    const isResultLocked = Boolean(
        event &&
        resultVisibleAt &&
        new Date().getTime() < new Date(resultVisibleAt).getTime()
    )

    if (isResultLocked && resultVisibleAt) {
        return (
            <div className="mx-auto flex min-h-screen max-w-2xl items-center justify-center p-6 font-handwriting">
                <div className="relative overflow-hidden border-2 border-gray-900 bg-white p-6 text-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                    <PaperBackground />
                    <div className="relative z-10">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border-2 border-gray-900 bg-yellow-200 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                            <Clock className="h-7 w-7 text-gray-900" />
                        </div>
                        <h1 className="text-3xl font-black text-gray-900">Hasil Belum Dibuka</h1>
                        <p className="mt-3 text-base font-bold text-gray-600">
                            Hasil dan pembahasan <span className="text-gray-900">{eventTitle}</span> dibuka serentak pada:
                        </p>
                        <div className="mt-4 border-2 border-gray-900 bg-[#fff9c4] px-4 py-3 text-lg font-black text-gray-900">
                            {formatDateTime(resultVisibleAt)}
                        </div>
                        <Link
                            href={backHref}
                            className="mt-6 inline-flex items-center gap-2 border-2 border-gray-900 bg-gray-900 px-4 py-2 font-black text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,0.35)] transition hover:translate-x-px hover:translate-y-px hover:shadow-none"
                        >
                            <ArrowLeft size={16} />
                            Kembali ke {backLabel}
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    // Fetch user's total XP and metadata before this session (for popups)
    const [prevSessionsRes, profileRes] = await Promise.all([
        supabase
            .from('test_sessions')
            .select('total_score, end_time')
            .eq('user_id', session.user_id)
            .eq('status', 'completed')
            .neq('id', sessionId), // Exclude current session
        supabase
            .from('profiles')
            .select('streak_count, last_activity_date, tryout_quota')
            .eq('id', session.user_id)
            .single()
    ])

    const allPreviousSessions = prevSessionsRes.data || []
    const profile = profileRes.data

    const previousTotalXP = allPreviousSessions.reduce((sum, s) => sum + (s.total_score || 0), 0) || 0
    const xpEarned = session.total_score || 0
    const xpInfo = getXPInfo(previousTotalXP, xpEarned)

    // Streak Logic: Show streak popup if this is the first session completed today
    const today = getDateKeyInTimeZone(new Date())
    const otherSessionsToday = allPreviousSessions.filter(s =>
        s.end_time && getDateKeyInTimeZone(s.end_time) === today
    )
    const isFirstSessionToday = otherSessionsToday.length === 0

    const enrichedXPInfo = {
        ...xpInfo,
        streakCount: calculateCurrentStreak(profile?.streak_count, profile?.last_activity_date),
        isStreak: isFirstSessionToday
    }

    const adminSupabase = await createAdminClient()
    const { data: rawAnswers, error: answersError } = await adminSupabase
        .from('test_answers')
        .select(`
            id,
            question_id,
            option_id,
            questions (
                id,
                content,
                image_url,
                explanation,
                type,
                category,
                sub_category,
                options (
                    id,
                    content,
                    image_url,
                    is_correct,
                    score_value
                )
            ),
            selected_option: options (
                id,
                content,
                image_url,
                is_correct,
                score_value
            )
        `)
        .eq('session_id', sessionId)

    if (answersError) {
        logger.warn('Answers fetch error:', { error: answersError })
        return (
            <div className="mx-auto max-w-xl p-6 text-center">
                <h1 className="text-2xl font-bold text-gray-900">Gagal memuat hasil tryout</h1>
                <p className="mt-2 text-gray-600">Silakan muat ulang halaman atau kembali ke dashboard.</p>
                <Link
                    href="/cpns/dashboard/tryout"
                    className="mt-6 inline-flex rounded-lg bg-gray-900 px-4 py-2 font-bold text-white"
                >
                    Ke Dashboard
                </Link>
            </div>
        )
    }

    const { data: configs } = await supabase
        .from('tryout_configurations')
        .select('type, sub_category, sort_order')
        .eq('is_active', true)

    const configSortMap: Record<string, number> = {}
    if (configs) {
        configs.forEach((c) => {
            const key = `${c.type}-${c.sub_category}`
            configSortMap[key] = c.sort_order
        })
    }

    const answers: ReviewAnswer[] = ((rawAnswers || []) as RawAnswer[]).flatMap((ans) => {
        const qRaw = normalizeRelation(ans.questions)
        if (!qRaw) return []
        const sortKey = qRaw ? `${qRaw.type}-${qRaw.sub_category}` : ''
        const sortOrder = configSortMap[sortKey] || 999
        const rawOptions = qRaw.options || []

        return [{
            ...ans,
            option_id: ans.option_id ?? '',
            questions: {
                ...qRaw,
                explanation: qRaw.explanation || '',
                category: qRaw.category || '',
                options: rawOptions
            },
            sort_order: sortOrder,
            selected_option: normalizeRelation(ans.selected_option)
        }]
    })

    // Pre-sort on server based on configuration sort_order
    answers.sort((a, b) => {
        if (a.sort_order !== undefined && b.sort_order !== undefined) {
            return a.sort_order - b.sort_order
        }
        return 0
    })

    // --- DATA PROCESSING ---

    // 1. Determine Module Type
    const uniqueTypes = Array.from(new Set(answers.map((a) => a.questions.type)))
    const isCombined = uniqueTypes.length > 1
    const singleType: 'TWK' | 'TIU' | 'TKP' | null = isCombined ? null : (uniqueTypes[0] ?? null)
    const singleSubCategory = !isCombined ? (answers[0]?.questions.sub_category || answers[0]?.questions.category || null) : null
    const uniqueSubCategories = Array.from(new Set(
        answers
            .map((answer) => (answer.questions.sub_category || answer.questions.category || '').trim())
            .filter(Boolean)
    ))
    const sessionKind = normalizeTestSessionKind(session.session_kind)
    const isDrillingMateriSession = isDrillingMateriQuestionSet({
        sessionKind,
        isCombined,
        answerCount: answers.length,
        uniqueSubCategoryCount: uniqueSubCategories.length,
        isEventSession,
    })
    const isMiniTryoutSession = !isCombined && !isEventSession && !isDrillingMateriSession
    const resolvedBackHref = cameFromHistory
        ? '/cpns/dashboard/riwayat'
        : isEventSession
            ? '/cpns/dashboard/event'
            : (cameFromDrillingMateri || isDrillingMateriSession)
                ? '/cpns/dashboard/drilling-materi'
                : (cameFromMiniTryout || isMiniTryoutSession)
                    ? '/cpns/dashboard/mini-tryout'
                    : '/cpns/dashboard/tryout'
    const resolvedBackLabel = cameFromHistory
        ? 'Riwayat'
        : isEventSession
            ? 'Event'
            : (cameFromDrillingMateri || isDrillingMateriSession)
                ? 'Drilling Materi'
                : (cameFromMiniTryout || isMiniTryoutSession)
                    ? 'Mini Tryout'
                    : 'Dashboard'
    const resultTitle = isEventSession
        ? eventTitle.toUpperCase()
        : isCombined
            ? 'TRYOUT SKD'
            : (cameFromDrillingMateri || isDrillingMateriSession)
                ? `DRILLING MATERI ${formatSubjectName(singleSubCategory || singleType || '')}`
                : `MINI TRYOUT ${formatSubjectName(singleType || '')}`

    // 2. Calculate Stats Helper
    const calculateStats = (filterType?: string) => {
        const filtered = filterType
            ? answers.filter((a) => a.questions.type === filterType)
            : answers

        const total = filtered.length
        if (total === 0) return { total: 0, correct: 0, wrong: 0, empty: 0, score: 0, maxScore: 0, accuracy: 0 }

        let score = 0
        let maxScore = 0

        filtered.forEach((a) => {
            const type = a.questions.type
            const val = a.selected_option?.score_value || 0

            if (type === 'TKP') {
                score += val
                maxScore += 5
            } else {
                if (a.selected_option?.is_correct) {
                    score += 5
                }
                maxScore += 5
            }
        })

        const accuracy = Math.round((score / maxScore) * 100)

        // Correction for actual correct/wrong counts needed for display
        const realCorrect = filtered.filter((a) => {
            if (a.questions.type === 'TKP') return (a.selected_option?.score_value || 0) === 5
            return a.selected_option?.is_correct
        }).length

        const realWrong = filtered.length - realCorrect

        return { total, correct: realCorrect, wrong: realWrong, score, maxScore, accuracy }
    }

    const mainStats = calculateStats(singleType || undefined)

    // 3. Time Duration
    const startTime = new Date(session.start_time).getTime()
    const endTime = new Date(session.end_time ?? session.start_time).getTime()
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
        if (mainStats.accuracy >= 80) return <span>Luar biasa! Kamu sudah siap untuk menaklukkan soal-soal SKD sesungguhnya. Pertahankan! <Trophy className="inline-block w-5 h-5 text-yellow-500 align-text-bottom ml-1" /></span>
        if (mainStats.accuracy >= 60) return <span>Permulaan yang bagus. Ada beberapa materi yang perlu diperdalam lagi agar skor makin maksimal. <Zap className="inline-block w-5 h-5 text-blue-500 align-text-bottom ml-1" /></span>
        return <span>Jangan patah semangat! Perbanyak tryout soal dan pelajari pembahasan untuk meningkatkan pemahamanmu. <Flame className="inline-block w-5 h-5 text-orange-500 align-text-bottom ml-1" /></span>
    }

    return (
        <ResultXPWrapper xpInfo={enrichedXPInfo} disablePopup={!isCompleted}>
            <div className="max-w-[1600px] mx-auto p-3 sm:p-6 space-y-5 sm:space-y-6 pb-28 font-handwriting">

                {/* 1. HERO SECTION */}
                <div className="relative overflow-hidden rounded-3xl bg-[#fff9c4] border-2 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                    <PaperBackground />

                    <div className="relative p-5 sm:p-8 flex flex-col items-center text-center z-10">
                        <div className="mb-3">
                            <span className="px-3 py-1 rounded-full bg-gray-900 text-white text-[11px] sm:text-sm font-bold uppercase tracking-widest rotate-2 inline-flex items-center gap-1">
                                HASIL {resultTitle} <ClipboardList className="w-4 h-4" />
                            </span>
                        </div>

                        <h1 className="text-3xl md:text-4xl lg:text-5xl font-black mb-3 text-gray-900 drop-shadow-sm">
                            {grade.text}
                        </h1>
                        <p className="text-gray-700 text-base md:text-lg max-w-2xl mx-auto mb-6 sm:mb-8 italic font-medium">
                            "{getFeedback()}"
                        </p>

                        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10 w-full justify-center">

                            {/* SCORE CIRCLE */}
                            <div className="relative group">
                                <div className={cn(
                                    "w-36 h-36 sm:w-44 sm:h-44 rounded-full border-4 border-gray-900 flex flex-col items-center justify-center bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-transform hover:scale-105 relative",
                                    grade.border
                                )}>
                                    <div className="flex items-baseline gap-1">
                                        <span className={cn("text-5xl sm:text-6xl md:text-7xl font-black tracking-tighter leading-none font-sans", grade.color)}>
                                            {session.total_score}
                                        </span>
                                    </div>
                                    <span className="text-xs sm:text-sm text-gray-500 font-bold mt-1.5 uppercase tracking-widest">Skor Akhir</span>

                                    {/* Doodle around score */}
                                    <div className="absolute -top-2 -right-2 opacity-20">
                                        <Sparkles size={32} className="text-gray-900" />
                                    </div>
                                </div>

                                {/* Grade Badge */}
                                <div className={cn(
                                    "absolute -right-2 -top-2 sm:-right-3 sm:-top-3 w-14 h-14 sm:w-16 sm:h-16 rounded-xl border-4 border-gray-900 flex items-center justify-center text-2xl sm:text-3xl font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rotate-12",
                                    grade.bg, grade.color
                                )}>
                                    {grade.label}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2.5 sm:gap-3 w-full md:w-auto">
                                <div className="bg-white p-3 sm:p-4 rounded-2xl border-2 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex flex-col items-start min-w-[124px] sm:min-w-[132px] -rotate-1">
                                    <div className="flex items-center gap-1.5 text-gray-500 text-[10px] sm:text-xs font-bold uppercase mb-0.5 sm:mb-1">
                                        <Target size={14} className="text-blue-500 sm:w-4 sm:h-4" /> Akurasi
                                    </div>
                                    <span className="text-xl sm:text-2xl font-black text-gray-900 font-sans">{mainStats.accuracy}%</span>
                                    <span className="text-[10px] sm:text-xs text-gray-400 font-medium whitespace-nowrap">Banyak Benernya</span>
                                </div>

                                <div className="bg-white p-3 sm:p-4 rounded-2xl border-2 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex flex-col items-start min-w-[124px] sm:min-w-[132px] rotate-1">
                                    <div className="flex items-center gap-1.5 text-gray-500 text-[10px] sm:text-xs font-bold uppercase mb-0.5 sm:mb-1">
                                        <Clock size={14} className="text-orange-500 sm:w-4 sm:h-4" /> Waktu
                                    </div>
                                    <span className="text-xl sm:text-2xl font-black text-gray-900 font-sans">{durationMinutes}<span className="text-sm sm:text-base">m</span> {durationSeconds}<span className="text-sm sm:text-base">d</span></span>
                                    <span className="text-[10px] sm:text-xs text-gray-400 font-medium whitespace-nowrap">Lama Mikirnya</span>
                                </div>

                                <div className="bg-white p-3 sm:p-4 rounded-2xl border-2 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex flex-col items-start min-w-[124px] sm:min-w-[132px] rotate-1">
                                    <div className="flex items-center gap-1.5 text-green-600 text-[10px] sm:text-xs font-bold uppercase mb-0.5 sm:mb-1">
                                        <CheckCircle2 size={14} className="sm:w-4 sm:h-4" /> Benar
                                    </div>
                                    <span className="text-xl sm:text-2xl font-black text-green-600 font-sans">{mainStats.correct}</span>
                                    <span className="text-[10px] sm:text-xs text-gray-400 font-medium whitespace-nowrap">Berhasil HJ</span>
                                </div>

                                <div className="bg-white p-3 sm:p-4 rounded-2xl border-2 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex flex-col items-start min-w-[124px] sm:min-w-[132px] -rotate-1">
                                    <div className="flex items-center gap-1.5 text-red-500 text-[10px] sm:text-xs font-bold uppercase mb-0.5 sm:mb-1">
                                        <XCircle size={14} className="sm:w-4 sm:h-4" /> Salah
                                    </div>
                                    <span className="text-xl sm:text-2xl font-black text-red-500 font-sans">{mainStats.wrong}</span>
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
                        // Calculate pass status for each section using centralized constants
                        const scores = [
                            { type: 'TWK', score: session.score_twk, target: PASSING_GRADES.TWK, passed: session.score_twk >= PASSING_GRADES.TWK },
                            { type: 'TIU', score: session.score_tiu, target: PASSING_GRADES.TIU, passed: session.score_tiu >= PASSING_GRADES.TIU },
                            { type: 'TKP', score: session.score_tkp, target: PASSING_GRADES.TKP, passed: session.score_tkp >= PASSING_GRADES.TKP }
                        ]

                        const failedSections = scores.filter(s => !s.passed)
                        const allPassed = failedSections.length === 0

                        // Determine Message
                        let title = "Rekomendasi Belajar"
                        let message: React.ReactNode = ""
                        let linkText = "Pelajari Materi"
                        if (allPassed) {
                            title = "Pertahankan Performamu!"
                            message = "Selamat! Kamu telah lulus passing grade di semua kategori. Pertahankan konsistensi tryout-mu dan coba kerjakan soal-soal yang lebih sulit untuk memantapkan kesiapanmu."
                            linkText = "Lanjut Full Tryout"
                        } else if (failedSections.length === 3) {
                            title = "Perlu Evaluasi Menyeluruh"
                            message = (
                                <>
                                    Hasil menunjukkan kamu belum memenuhi passing grade di semua kategori (<span className="font-bold text-foreground">TWK, TIU, TKP</span>). Disarankan untuk mempelajari kembali materi dasar secara sistematis dari awal.
                                </>
                            )
                            linkText = "Mulai dari Materi Dasar"
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
                                    {allPassed && (
                                        <Link href="/cpns/dashboard/tryout" className={cn(
                                            "inline-flex items-center gap-2 px-5 py-2 rounded-xl border-2 font-black transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-px hover:translate-y-px hover:shadow-none",
                                            allPassed ? "bg-green-600 text-white border-green-800" : "bg-gray-900 text-white border-black"
                                        )}>
                                            {linkText.replace('Materi', 'Tryout')} &rarr;
                                        </Link>
                                    )}
                                </div>
                                {allPassed && (
                                    <div className="absolute top-2 right-4 opacity-20 z-10">
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
                        href={resolvedBackHref}
                        className="flex justify-center items-center gap-2 sm:gap-3 px-6 sm:px-8 py-3 sm:py-4 rounded-2xl border-2 border-gray-900 bg-white hover:bg-gray-50 font-black text-lg sm:text-xl transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-px active:translate-y-px active:shadow-none"
                    >
                        <ArrowLeft size={20} className="sm:w-6 sm:h-6" /> {resolvedBackLabel}
                    </Link>

                    {!cameFromHistory && !isEventSession && !cameFromDrillingMateri && !isDrillingMateriSession && (
                        <RetakeButton
                            isCombined={isCombined}
                            singleType={singleType}
                            quota={profile?.tryout_quota ?? 0}
                        />
                    )}

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
