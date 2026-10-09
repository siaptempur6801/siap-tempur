import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { logger } from '@/lib/logger'
import {
    ArrowLeft,
    BookOpenCheck,
    CheckCircle2,
    Clock3,
    ExternalLink,
    ListChecks,
    RotateCcw,
    Target,
    Trophy,
} from 'lucide-react'
import { createV2Client } from '@/lib/utils/supabase/server'
import TkaLearningFocusPanel from '@/components/tka/TkaLearningFocusPanel'
import { Mascot } from '@/components/brand/Mascot'
import TkaReadinessCard from '@/components/tka/TkaReadinessCard'
import TkaInteractiveReviewClient from '@/components/tka/TkaInteractiveReviewClient'
import ResultXPWrapper from '@/components/practice/ResultXPWrapper'
import { practiceResultService, type PracticeResultView } from '@/src/services/practice-result.service'
import { gamificationService } from '@/src/services/gamification.service'
import { tkaFullExamRpcService, type TkaFullExamState } from '@/src/services/tka-full-exam-rpc.service'
import { tkaLearningFocusService, type TkaLearningFocusView } from '@/src/services/tka-learning-focus.service'
import { tkaReadinessService, type TkaReadinessView } from '@/src/services/tka-readiness.service'
import { tkaRemedialService, type TkaRemedialView } from '@/src/services/tka-remedial.service'
import { isTkaLevelAvailable, parseTkaLevel, tkaLevelPath } from '@/src/tka/context'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function formatDuration(startedAt: string | null, submittedAt: string | null) {
    if (!startedAt || !submittedAt) return '-'
    const seconds = Math.max(0, Math.floor((Date.parse(submittedAt) - Date.parse(startedAt)) / 1000))
    const minutes = Math.floor(seconds / 60)
    const rest = seconds % 60
    return `${minutes}m ${rest}s`
}

function practiceLabel(kind: string | null | undefined) {
    if (kind === 'mini_tryout') return 'Mini Tryout'
    if (kind === 'drill') return 'Latihan Fokus'
    return 'Full Tryout'
}

function formatSubjectTitle(code: string) {
    const titles: Record<string, string> = {
        BIN: 'Bahasa Indonesia',
        MAT: 'Matematika',
        IPA: 'Ilmu Pengetahuan Alam',
        IPS: 'Ilmu Pengetahuan Sosial',
        ING: 'Bahasa Inggris',
        PPKN: 'Pendidikan Pancasila',
    }
    return titles[code.toUpperCase()] ?? code
}

export default async function TkaResultPage({
    params,
    searchParams,
}: {
    params: Promise<{ level: string; sessionId: string }>
    searchParams: Promise<{ completed?: string }>
}) {
    const { level: rawLevel, sessionId } = await params
    const { completed } = await searchParams
    const level = parseTkaLevel(rawLevel)
    if (!level) notFound()

    const base = tkaLevelPath(level)
    const supabase = await createV2Client()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) redirect(`/login?returnTo=${encodeURIComponent(`${base}/tryout/${sessionId}/result`)}`)

    let result: PracticeResultView | null = null
    let fullExamState: TkaFullExamState | null = null
    let remedial: TkaRemedialView | null = null
    let learningFocus: TkaLearningFocusView | null = null
    let readiness: TkaReadinessView | null = null

    if (isTkaLevelAvailable(level)) {
        try {
            const candidate = await tkaFullExamRpcService.getState(sessionId)
            if (candidate.sections.length > 0) fullExamState = candidate
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            if (!message.toLowerCase().includes('attempt not found')) {
                logger.error('[tka-result] Section engine result lookup failed', error, { sessionId, level })
                throw error
            }
            // Legacy/generic TKA result continues through practiceResultService.
        }
    }

    if (fullExamState) {
        if (fullExamState.status !== 'completed') {
            redirect(`${base}/tryout/${sessionId}`)
        }
        result = await tkaFullExamRpcService.getResultView(sessionId)
    }

    if (!result) result = await practiceResultService.getResult(user.id, sessionId)
    if (!result) redirect(base)
    if (result.programCode.toUpperCase() !== 'TKA' || result.trackCode.toUpperCase() !== level) redirect(base)
    if (!['completed', 'COMPLETED', 'submitted', 'SUBMITTED'].includes(result.status)) {
        redirect(`${base}/tryout/${sessionId}`)
    }
    // Learner rewards use the authenticated client and owner-only aggregate.
    // Keep the result available during a transient reward lookup failure.
    let xpInfo: Awaited<ReturnType<typeof gamificationService.getAttemptReward>> | null = null
    if (completed === '1') {
        try {
            xpInfo = await gamificationService.getAttemptReward(user.id, {
                score: result.totalScore,
                practiceKind: result.practiceKind,
            }, supabase)
        } catch (error) {
            logger.warn('[tka-result] reward lookup failed', {
                error: error instanceof Error ? error.message : String(error),
                attemptId: sessionId,
                userId: user.id,
            })
            xpInfo = null
        }
    }

    if (isTkaLevelAvailable(level)) {
        if (fullExamState) {
            try {
                remedial = await tkaRemedialService.findBySourceAttempt(sessionId)
            } catch {
                remedial = null
            }
        }

        try {
            readiness = await tkaReadinessService.getReadiness()
        } catch {
            readiness = null
        }

        try {
            learningFocus = await tkaLearningFocusService.getFocus()
        } catch {
            learningFocus = null
        }
    }

    const label = practiceLabel(result.practiceKind)
    const wrongGapCount = result.reviewItems.filter((item) => item.isCorrect !== true).length
    const correctCount = result.reviewItems.filter((item) => item.isCorrect === true).length
    const repeatWrongEnabled = isTkaLevelAvailable(level) && wrongGapCount > 0
    const automaticRemedialEnabled = Boolean(remedial?.session && remedial.session.pendingItems > 0)
    const accuracyPercent = result.reviewItems.length > 0
        ? Math.round((correctCount / result.reviewItems.length) * 100)
        : 0

    return (
        <ResultXPWrapper rewardKey={sessionId} xpInfo={xpInfo} showReward={completed === '1'}>
            <main data-experience-mode="learning" data-program={`tka-${level.toLowerCase()}`} className="min-h-screen px-4 py-6 md:px-8 md:py-8 font-body">
                <div className="mx-auto max-w-6xl space-y-6 md:space-y-8">
                    {/* Top Navigation & Status Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <Link
                                href={result.accessContext === 'organization'
                                    ? '/cpns/dashboard/assignments'
                                    : result.accessContext === 'event' ? '/cpns/dashboard/event' : `${base}/tryout`}
                                className="st-focus inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs md:text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
                            >
                                <ArrowLeft size={16} /> {result.accessContext === 'organization'
                                    ? 'Kembali ke Assignment'
                                    : result.accessContext === 'event' ? 'Kembali ke Event' : 'Kembali ke Tryout'}
                            </Link>
                        </div>
                        <span className="rounded-full bg-indigo-50 px-3.5 py-1.5 text-xs font-black text-indigo-700 ring-1 ring-indigo-200">
                            {label} · TKA/{level}
                        </span>
                    </div>

                    {/* Hero Result Banner */}
                    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-blue-600 to-blue-700 p-6 text-white shadow-[0_24px_60px_rgba(25,118,210,0.28)] md:p-10">
                        {/* Background Subtle Accent */}
                        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
                        <div className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-indigo-400/20 blur-3xl" />

                        <div className="relative grid gap-8 lg:grid-cols-[1.35fr_0.65fr] lg:items-center">
                            <div className="space-y-4">
                                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-white backdrop-blur-md">
                                    <Trophy size={16} className="text-amber-300" /> Hasil Evaluasi {label}
                                </span>
                                <h1 className="text-3xl font-black tracking-tight text-white md:text-5xl lg:leading-tight">
                                    Sesi selesai. Sekarang lihat apa yang perlu diperbaiki.
                                </h1>
                                <p className="max-w-2xl text-sm font-semibold leading-relaxed text-indigo-100 md:text-base">
                                    Hasil evaluasimu telah disimpan dan dianalisis. Pelajari ringkasan di bawah dan buka pembahasan soal untuk memahami setiap konsep dengan matang.
                                </p>

                                <div className="flex flex-wrap items-center gap-3 pt-2">
                                    <Link
                                        href={`${base}/tryout/${sessionId}/review`}
                                        className="st-focus inline-flex h-11 w-full sm:w-[280px] shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-indigo-700 shadow-sm transition hover:bg-slate-50 hover:shadow-md active:scale-[0.98]"
                                    >
                                        <BookOpenCheck size={17} className="shrink-0 text-indigo-600" />
                                        <span className="truncate">Buka Pembahasan Soal</span>
                                    </Link>
                                    {automaticRemedialEnabled && remedial?.session && (
                                        <Link
                                            href={`${base}/remedial/${remedial.session.id}`}
                                            className="st-focus inline-flex h-11 w-full sm:w-[280px] shrink-0 items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/15 px-5 text-sm font-bold text-white backdrop-blur-md transition hover:bg-white/25 active:scale-[0.98]"
                                        >
                                            <RotateCcw size={17} className="shrink-0 text-indigo-200" />
                                            <span className="truncate">Mulai Remedial ({remedial.session.pendingItems} Soal)</span>
                                        </Link>
                                    )}
                                </div>
                            </div>

                            <p className="text-sm font-bold text-white/85">
                                Santai — hasil ini titik awal, bukan garis akhir. Pilih satu langkah perbaikan dulu, sisanya nanti mengikuti.
                            </p>

                            {/* Score Card Tile */}
                            <div className="flex flex-col items-center justify-center rounded-2xl border border-white/20 bg-white/15 p-6 text-center backdrop-blur-md shadow-inner md:p-8">
                                <Mascot name="tama" size="xs" tone="plain" className="mb-3" />
                                <span className="text-xs font-black uppercase tracking-widest text-indigo-200">Total Skor</span>
                                <div className="mt-2 text-5xl font-black tracking-tight text-white md:text-6xl">
                                    {result.totalScore}
                                </div>
                                <div className="mt-2 inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-xs font-black text-white">
                                    {result.percentage === null ? 'Persentase belum tersedia' : `${result.percentage}% Capaian`}
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Metrics Grid */}
                    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <MetricCard
                            icon={<Target size={18} className="text-indigo-600" />}
                            label="Soal Terjawab"
                            value={`${result.answeredCount}/${result.reviewItems.length}`}
                            helper={`${Math.round((result.answeredCount / Math.max(1, result.reviewItems.length)) * 100)}% dari total butir`}
                        />
                        <MetricCard
                            icon={<CheckCircle2 size={18} className="text-emerald-600" />}
                            label="Akurasi Jawaban"
                            value={`${correctCount} Benar`}
                            helper={`${accuracyPercent}% akurasi · ${wrongGapCount} perlu ditinjau`}
                        />
                        <MetricCard
                            icon={<Clock3 size={18} className="text-blue-600" />}
                            label="Durasi Pengerjaan"
                            value={formatDuration(result.startedAt, result.submittedAt)}
                            helper="Total waktu tercatat"
                        />
                    </section>

                    {/* Subject Breakdown Cards */}
                    {result.subjectResults.length > 0 && (
                        <section className="space-y-4">
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-wider text-indigo-600">Rincian Capaian</p>
                                    <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
                                        Performa Tiap Mata Pelajaran
                                    </h2>
                                </div>
                                <span className="text-xs font-bold text-slate-500">
                                    {result.subjectResults.length} Bidang Studi
                                </span>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                {result.subjectResults.map((subject) => {
                                    const percent = subject.maxScore > 0
                                        ? Math.round((subject.score / subject.maxScore) * 100)
                                        : 0

                                    return (
                                        <article
                                            key={subject.subjectId}
                                            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <span className="text-xs font-black uppercase tracking-wider text-indigo-600">
                                                        {subject.code}
                                                    </span>
                                                    <h3 className="text-lg font-black text-slate-950">
                                                        {formatSubjectTitle(subject.code)}
                                                    </h3>
                                                </div>
                                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                                                    {subject.totalQuestions} soal
                                                </span>
                                            </div>

                                            {/* Score and percentage */}
                                            <div className="mt-4 flex items-baseline justify-between">
                                                <div className="text-3xl font-black text-slate-950">
                                                    {subject.score}
                                                    <span className="text-base font-semibold text-slate-400"> / {subject.maxScore}</span>
                                                </div>
                                                <span className="text-xs font-black text-slate-500">{percent}%</span>
                                            </div>

                                            {/* Progress Bar */}
                                            <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                                                <div
                                                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-500"
                                                    style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
                                                />
                                            </div>

                                            {/* Breakdown Pills */}
                                            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                                                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-2 text-emerald-800">
                                                    <span className="text-[10px] font-black uppercase tracking-wider">Benar</span>
                                                    <div className="text-base font-black">{subject.correctCount}</div>
                                                </div>
                                                <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-2 text-rose-800">
                                                    <span className="text-[10px] font-black uppercase tracking-wider">Salah</span>
                                                    <div className="text-base font-black">{subject.wrongCount}</div>
                                                </div>
                                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-700">
                                                    <span className="text-[10px] font-black uppercase tracking-wider">Kosong</span>
                                                    <div className="text-base font-black">{subject.unansweredCount}</div>
                                                </div>
                                            </div>
                                        </article>
                                    )
                                })}
                            </div>
                        </section>
                    )}

                    {/* Remedial & Next Action Recommendation */}
                    {(automaticRemedialEnabled || (repeatWrongEnabled && !automaticRemedialEnabled)) && (
                        <section className="flex flex-col gap-4 rounded-3xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/80 via-white to-blue-50/60 p-6 shadow-sm md:flex-row md:items-center md:justify-between">
                            <div className="space-y-1">
                                <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-indigo-700">
                                    {automaticRemedialEnabled ? <BookOpenCheck size={16} /> : <RotateCcw size={16} />}
                                    Rekomendasi Lanjutan
                                </div>
                                <h2 className="text-xl font-black tracking-tight text-slate-950 md:text-2xl">
                                    {automaticRemedialEnabled
                                        ? `${remedial?.session?.pendingItems ?? 0} soal prioritas sudah dipilih untuk latihan remedialmu.`
                                        : `Ada ${wrongGapCount} butir soal yang perlu kamu pelajari kembali.`}
                                </h2>
                                <p className="max-w-2xl text-sm font-semibold leading-relaxed text-slate-600">
                                    {automaticRemedialEnabled
                                        ? 'Kerjakan latihan remedial ini sebelum mencoba sesi tryout berikutnya agar pemahaman materimu lebih kokoh.'
                                        : 'Ulangi soal yang belum tepat sampai kamu memahami cara penyelesaiannya dengan benar.'}
                                </p>
                            </div>
                            <div className="flex shrink-0 flex-wrap items-center gap-2 md:justify-end">
                                {automaticRemedialEnabled && remedial?.session && (
                                    <Link
                                        href={`${base}/remedial/${remedial.session.id}`}
                                        className="st-focus inline-flex h-11 w-full sm:w-[280px] shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white shadow-md transition hover:bg-indigo-700 active:scale-[0.98]"
                                    >
                                        <RotateCcw size={17} className="shrink-0" />
                                        <span>Mulai Remedial</span>
                                    </Link>
                                )}
                                {repeatWrongEnabled && !automaticRemedialEnabled && (
                                    <Link
                                        href={`${base}/wrong-questions`}
                                        className="st-focus inline-flex h-11 w-full sm:w-[280px] shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white shadow-md transition hover:bg-slate-800 active:scale-[0.98]"
                                    >
                                        <RotateCcw size={17} className="shrink-0" />
                                        <span>Ulangi Soal Salah</span>
                                    </Link>
                                )}
                            </div>
                        </section>
                    )}

                    {/* Pembahasan Section */}
                    <section id="pembahasan" className="scroll-mt-6 space-y-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                            <div className="space-y-1">
                                <p className="text-xs font-black uppercase tracking-wider text-indigo-600">Pembahasan & Solusi</p>
                                <h2 className="text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
                                    Tinjau jawaban satu per satu
                                </h2>
                                <p className="max-w-3xl text-sm font-semibold leading-relaxed text-slate-500">
                                    Bandingkan jawabanmu dengan kunci jawaban dan pelajari pembahasannya menggunakan navigasi kisi soal di bawah.
                                </p>
                            </div>
                            <div className="flex shrink-0">
                                <Link
                                    href={`${base}/tryout/${sessionId}/review`}
                                    className="st-focus inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50 hover:text-indigo-600 hover:border-slate-300 active:scale-[0.98] w-full sm:w-auto"
                                >
                                    <ExternalLink size={16} className="shrink-0 text-slate-500" />
                                    <span>Mode Layar Penuh</span>
                                </Link>
                            </div>
                        </div>

                        {result.reviewItems.length > 0 ? (
                            <TkaInteractiveReviewClient
                                level={level}
                                attemptId={sessionId}
                                practiceKind={result.practiceKind}
                                backUrl={`${base}/tryout/${sessionId}/result`}
                                fullReviewUrl={`${base}/tryout/${sessionId}/review`}
                                items={result.reviewItems}
                                embedded
                            />
                        ) : (
                            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center font-bold text-slate-500">
                                Belum ada soal yang dapat ditinjau dari sesi ini.
                            </div>
                        )}
                    </section>

                    {/* Diagnostic / Readiness Card */}
                    {readiness && <TkaReadinessCard readiness={readiness} level={level} />}

                    {/* Learning Focus Panel */}
                    <TkaLearningFocusPanel items={learningFocus?.items ?? []} />

                    {/* Bottom Next Steps Bar */}
                    <section className="flex flex-col gap-4 border-t border-slate-200 pt-6 md:flex-row md:items-center md:justify-between">
                        <div>
                            <p className="text-xs font-black uppercase tracking-wider text-blue-600">Langkah Berikutnya</p>
                            <h2 className="mt-1 text-xl font-black text-slate-950">Coba lagi setelah selesai memperbaiki hasilmu.</h2>
                            <p className="mt-1 text-sm font-semibold text-slate-500">Pilih Mini Tryout atau Full Tryout berikutnya saat kamu sudah siap.</p>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                            <Link
                                href={`${base}/tryout`}
                                className="st-focus inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 active:scale-[0.98]"
                            >
                                <ListChecks size={18} className="shrink-0" /> Pilih tryout berikutnya
                            </Link>
                        </div>
                    </section>
                </div>
            </main>
        </ResultXPWrapper>
    )
}

function MetricCard({
    icon,
    label,
    value,
    helper,
}: {
    icon: React.ReactNode
    label: string
    value: string
    helper?: string
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400">
                {icon}
                {label}
            </div>
            <div className="mt-2 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
                {value}
            </div>
            {helper && (
                <p className="mt-1 text-xs font-semibold text-slate-400">
                    {helper}
                </p>
            )}
        </div>
    )
}
