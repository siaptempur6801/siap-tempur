import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, BookOpenCheck, CheckCircle2, Clock3, RotateCcw, Target, Trophy, XCircle } from 'lucide-react'
import { createV2Client } from '@/lib/utils/supabase/server'
import TkaLearningFocusPanel from '@/components/tka/TkaLearningFocusPanel'
import TkaReadinessCard from '@/components/tka/TkaReadinessCard'
import TkaResultReview from '@/components/tka/TkaResultReview'
import ResultXPWrapper from '@/components/practice/ResultXPWrapper'
import { practiceResultService, type PracticeResultView } from '@/src/services/practice-result.service'
import { gamificationService } from '@/src/services/gamification.service'
import { tkaFullExamRpcService, type TkaFullExamState } from '@/src/services/tka-full-exam-rpc.service'
import { tkaLearningFocusService, type TkaLearningFocusView } from '@/src/services/tka-learning-focus.service'
import { tkaReadinessService, type TkaReadinessView } from '@/src/services/tka-readiness.service'
import { tkaRemedialService, type TkaRemedialView } from '@/src/services/tka-remedial.service'
import { parseTkaLevel, tkaLevelPath } from '@/src/tka/context'
import { cn } from '@/lib/utils'

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

    if (level === 'SMP') {
        try {
            const candidate = await tkaFullExamRpcService.getState(sessionId)
            if (candidate.sections.length > 0) fullExamState = candidate
        } catch {
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
    const xpInfo = completed === '1'
        ? await gamificationService.getAttemptReward(user.id, {
            score: result.totalScore,
            practiceKind: result.practiceKind,
        })
        : null

    if (level === 'SMP') {
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
    const repeatWrongEnabled = level === 'SMP' && wrongGapCount > 0
    const automaticRemedialEnabled = Boolean(remedial?.session && remedial.session.pendingItems > 0)

    return (
        <ResultXPWrapper rewardKey={sessionId} xpInfo={xpInfo} showReward={completed === '1'}>
            <main data-experience-mode="learning" data-program="tka-smp" className="min-h-screen px-4 py-5 md:px-8 md:py-8">
            <div className="mx-auto max-w-6xl space-y-6 md:space-y-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <Link href={base} className="st-focus inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-sm font-bold text-slate-500 transition hover:bg-white hover:text-indigo-700">
                        <ArrowLeft size={18}/> Kembali ke TKA {level}
                    </Link>
                    <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-[11px] font-black text-indigo-700 ring-1 ring-indigo-100">{label} · TKA/{level}</span>
                </div>

                <section className="grid gap-5 overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-indigo-600 via-violet-600 to-blue-600 p-6 text-white shadow-[0_22px_54px_rgba(79,70,229,0.2)] lg:grid-cols-[1.4fr_0.6fr] lg:items-center md:p-8">
                    <div>
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-white">
                            <Trophy size={16}/> Hasil {label}
                        </span>
                        <h1 className="mt-4 text-4xl font-black tracking-tight text-white md:text-5xl">Sesi selesai. Sekarang lihat apa yang perlu diperbaiki.</h1>
                        <p className="mt-3 max-w-2xl font-semibold leading-relaxed text-indigo-100">
                            Hasil sudah tersimpan. Gunakan ringkasan dan pembahasan di bawah untuk menentukan fokus belajar berikutnya.
                        </p>
                    </div>
                    <div className="rounded-[1.5rem] border border-white/20 bg-white/15 p-5 text-center backdrop-blur-sm">
                        <div className="text-xs font-black uppercase tracking-widest text-indigo-100">Total skor</div>
                        <div className="mt-1 text-5xl font-black text-white">{result.totalScore}</div>
                        <div className="mt-1 text-sm font-black text-indigo-100">
                            {result.percentage === null ? 'Persentase belum tersedia' : `${result.percentage}%`}
                        </div>
                    </div>
                </section>

                <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <MetricCard icon={<Target size={17}/>} label="Terjawab" value={`${result.answeredCount}/${result.reviewItems.length}`} />
                    <MetricCard icon={<Clock3 size={17}/>} label="Durasi" value={formatDuration(result.startedAt, result.submittedAt)} />
                    <div className="st-card p-4 sm:col-span-2">
                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                            {result.passed === false ? <XCircle size={17}/> : <CheckCircle2 size={17}/>} Status
                        </div>
                        <div className={cn('mt-2 text-3xl font-black tracking-tight', result.passed === false ? 'text-red-700' : result.passed === true ? 'text-emerald-700' : 'text-slate-700')}>
                            {result.passed === null ? 'Skor tersimpan' : result.passed ? 'Target tercapai' : 'Masih perlu diperkuat'}
                        </div>
                    </div>
                </section>

                {result.subjectResults.length > 0 && (
                    <section className="grid gap-4 md:grid-cols-2">
                        {result.subjectResults.map((subject) => (
                            <article key={subject.subjectId} className="st-card p-4">
                                <div className="flex items-center justify-between gap-2">
                                    <h2 className="text-lg font-black tracking-tight text-slate-950">{subject.code}</h2>
                                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-600">{subject.totalQuestions} soal</span>
                                </div>
                                <div className="mt-2 text-3xl font-black text-slate-950">{subject.score}<span className="text-base text-slate-400"> / {subject.maxScore}</span></div>
                                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-bold">
                                    <div className="rounded-xl bg-emerald-50 p-2 text-emerald-800">Benar<br/><b>{subject.correctCount}</b></div>
                                    <div className="rounded-xl bg-red-50 p-2 text-red-800">Salah<br/><b>{subject.wrongCount}</b></div>
                                    <div className="rounded-xl bg-slate-100 p-2 text-slate-700">Kosong<br/><b>{subject.unansweredCount}</b></div>
                                </div>
                            </article>
                        ))}
                    </section>
                )}

                {readiness && <TkaReadinessCard readiness={readiness}/>} 

                <TkaLearningFocusPanel items={learningFocus?.items ?? []}/>

                {automaticRemedialEnabled && remedial?.session && (
                    <section className="flex flex-col gap-4 rounded-[1.5rem] border border-amber-100 bg-amber-50/70 p-5 shadow-sm md:flex-row md:items-center md:justify-between">
                        <div>
                            <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-amber-700">
                                <BookOpenCheck size={16}/> Latihan perbaikan
                            </div>
                            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">{remedial.session.pendingItems} soal prioritas sudah dipilih untukmu.</h2>
                            <p className="mt-1 max-w-2xl text-sm font-semibold leading-relaxed text-slate-500">
                                Kerjakan soal prioritas dari hasil tryout ini untuk memperkuat bagian yang masih lemah sebelum mencoba sesi berikutnya.
                            </p>
                        </div>
                        <Link href={`${base}/remedial/${remedial.session.id}`} className="st-focus inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3 font-black text-slate-950 shadow-[0_10px_22px_rgba(245,158,11,0.18)] transition hover:bg-amber-300">
                            <BookOpenCheck size={18}/> Mulai latihan ({remedial.session.pendingItems})
                        </Link>
                    </section>
                )}

                {repeatWrongEnabled && (
                    <section className="flex flex-col gap-4 rounded-[1.5rem] border border-red-100 bg-red-50/70 p-5 shadow-sm md:flex-row md:items-center md:justify-between">
                        <div>
                            <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-red-700">
                                <RotateCcw size={16}/> Soal yang perlu diulang
                            </div>
                            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Ada {wrongGapCount} soal yang perlu kamu pelajari lagi.</h2>
                            <p className="mt-1 max-w-2xl text-sm font-semibold leading-relaxed text-slate-500">
                                Daftar ini berisi jawaban salah dan soal yang belum dijawab. Soal akan selesai setelah kamu berhasil menjawabnya dengan benar.
                            </p>
                        </div>
                        <Link href={`${base}/wrong-questions`} className="st-focus inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 font-black text-white shadow-[0_10px_22px_rgba(15,23,42,0.16)] transition hover:bg-slate-800">
                            <RotateCcw size={18}/> Ulangi soal ({wrongGapCount})
                        </Link>
                    </section>
                )}

                <section className="space-y-4">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-indigo-600">Pembahasan</p>
                        <h2 className="mt-1 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">Tinjau jawaban satu per satu</h2>
                        <p className="mt-2 text-sm font-semibold text-slate-500">Bandingkan jawabanmu dengan kunci dan pelajari penjelasannya.</p>
                    </div>
                    <TkaResultReview items={result.reviewItems} />
                </section>
            </div>
            </main>
        </ResultXPWrapper>
    )
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="st-card p-4">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-slate-400">{icon}{label}</div>
            <div className="mt-2 text-3xl font-black tracking-tight text-slate-950">{value}</div>
        </div>
    )
}
