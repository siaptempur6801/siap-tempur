import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, BookOpenCheck, CheckCircle2, Clock3, RotateCcw, Target, Trophy, XCircle } from 'lucide-react'
import { env } from '@/lib/env'
import { createV2Client } from '@/lib/utils/supabase/server'
import TkaLearningFocusPanel from '@/components/tka/TkaLearningFocusPanel'
import TkaReadinessCard from '@/components/tka/TkaReadinessCard'
import TkaResultReview from '@/components/tka/TkaResultReview'
import { practiceResultService, type PracticeResultView } from '@/src/services/practice-result.service'
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
    if (kind === 'drill') return 'Latihan'
    return 'Full Tryout'
}

export default async function TkaResultPage({
    params,
}: {
    params: Promise<{ level: string; sessionId: string }>
}) {
    const { level: rawLevel, sessionId } = await params
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

    if (level === 'SMP' && env.appEnvironment() !== 'production') {
        try {
            const candidate = await tkaFullExamRpcService.getState(sessionId)
            if (candidate.sections.length > 0) fullExamState = candidate
        } catch {
            // Legacy TKA mini/drill result continues through practiceResultService.
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

    if (level === 'SMP' && env.appEnvironment() !== 'production') {
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
    const repeatWrongEnabled = level === 'SMP' && env.appEnvironment() !== 'production' && wrongGapCount > 0
    const automaticRemedialEnabled = Boolean(remedial?.session && remedial.session.pendingItems > 0)

    return (
        <main data-experience-mode="learning" data-program="tka-smp" className="st-product min-h-screen px-4 py-6 md:px-8 md:py-10">
            <div className="mx-auto max-w-6xl space-y-6 md:space-y-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <Link href={base} className="st-focus inline-flex min-h-11 items-center gap-2 text-sm font-black text-slate-700 hover:text-blue-700">
                        <ArrowLeft size={18}/> Kembali ke TKA {level}
                    </Link>
                    <span className="st-pill bg-blue-100 text-blue-700">{label} · TKA/{level}</span>
                </div>

                <section className="st-card-lg grid gap-5 p-6 lg:grid-cols-[1.4fr_0.6fr] lg:items-center md:p-8">
                    <div>
                        <span className="st-kicker"><Trophy size={16}/> Hasil {label}</span>
                        <h1 className="st-heading-display mt-4 text-4xl md:text-5xl">Sesi selesai. Sekarang lihat apa yang perlu diperbaiki.</h1>
                        <p className="st-muted mt-3 max-w-2xl font-semibold leading-relaxed">
                            Hasil sudah tersimpan. Gunakan ringkasan dan pembahasan di bawah untuk menentukan fokus belajar berikutnya.
                        </p>
                    </div>
                    <div className="border-2 border-slate-900 bg-yellow-100 p-5 text-center shadow-[4px_4px_0_#111827]">
                        <div className="text-xs font-black uppercase tracking-widest text-slate-500">Total skor</div>
                        <div className="mt-1 text-5xl font-black">{result.totalScore}</div>
                        <div className="mt-1 text-sm font-black text-slate-600">
                            {result.percentage === null ? 'Persentase belum tersedia' : `${result.percentage}%`}
                        </div>
                    </div>
                </section>

                <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <MetricCard icon={<Target size={17}/>} label="Terjawab" value={`${result.answeredCount}/${result.reviewItems.length}`} />
                    <MetricCard icon={<Clock3 size={17}/>} label="Durasi" value={formatDuration(result.startedAt, result.submittedAt)} />
                    <div className="st-card p-4 sm:col-span-2">
                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                            {result.passed === false ? <XCircle size={17}/> : <CheckCircle2 size={17}/>} Status
                        </div>
                        <div className={cn('mt-2 text-3xl font-black', result.passed === false ? 'text-red-700' : result.passed === true ? 'text-emerald-700' : 'text-slate-700')}>
                            {result.passed === null ? 'Skor tersimpan' : result.passed ? 'Target tercapai' : 'Masih perlu diperkuat'}
                        </div>
                    </div>
                </section>

                {result.subjectResults.length > 0 && (
                    <section className="grid gap-4 md:grid-cols-2">
                        {result.subjectResults.map((subject) => (
                            <article key={subject.subjectId} className="st-card p-4">
                                <div className="flex items-center justify-between gap-2">
                                    <h2 className="st-heading text-lg">{subject.code}</h2>
                                    <span className="st-pill bg-slate-100 text-slate-600">{subject.totalQuestions} soal</span>
                                </div>
                                <div className="mt-2 text-3xl font-black">{subject.score}<span className="text-base text-slate-400"> / {subject.maxScore}</span></div>
                                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-bold">
                                    <div className="border-2 border-slate-900 bg-emerald-50 p-2">Benar<br/><b>{subject.correctCount}</b></div>
                                    <div className="border-2 border-slate-900 bg-red-50 p-2">Salah<br/><b>{subject.wrongCount}</b></div>
                                    <div className="border-2 border-slate-900 bg-slate-100 p-2">Kosong<br/><b>{subject.unansweredCount}</b></div>
                                </div>
                            </article>
                        ))}
                    </section>
                )}

                {readiness && <TkaReadinessCard readiness={readiness}/>} 

                <TkaLearningFocusPanel items={learningFocus?.items ?? []}/>

                {automaticRemedialEnabled && remedial?.session && (
                    <section className="st-warning flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
                        <div>
                            <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-amber-800">
                                <BookOpenCheck size={16}/> Latihan perbaikan
                            </div>
                            <h2 className="st-heading mt-1 text-2xl">{remedial.session.pendingItems} soal prioritas sudah dipilih untukmu.</h2>
                            <p className="st-muted mt-1 max-w-2xl text-sm font-semibold leading-relaxed">
                                Kerjakan soal prioritas dari hasil tryout ini untuk memperkuat bagian yang masih lemah sebelum mencoba sesi berikutnya.
                            </p>
                        </div>
                        <Link href={`${base}/remedial/${remedial.session.id}`} className="st-button st-focus inline-flex shrink-0 items-center justify-center gap-2 bg-yellow-200 px-5 py-3 font-black text-slate-950">
                            <BookOpenCheck size={18}/> Mulai latihan ({remedial.session.pendingItems})
                        </Link>
                    </section>
                )}

                {repeatWrongEnabled && (
                    <section className="st-danger flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
                        <div>
                            <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-red-700">
                                <RotateCcw size={16}/> Soal yang perlu diulang
                            </div>
                            <h2 className="st-heading mt-1 text-2xl">Ada {wrongGapCount} soal yang perlu kamu pelajari lagi.</h2>
                            <p className="st-muted mt-1 max-w-2xl text-sm font-semibold leading-relaxed">
                                Daftar ini berisi jawaban salah dan soal yang belum dijawab. Soal akan selesai setelah kamu berhasil menjawabnya dengan benar.
                            </p>
                        </div>
                        <Link href={`${base}/wrong-questions`} className="st-button st-focus inline-flex shrink-0 items-center justify-center gap-2 bg-slate-950 px-5 py-3 font-black text-white">
                            <RotateCcw size={18}/> Ulangi soal ({wrongGapCount})
                        </Link>
                    </section>
                )}

                <section className="space-y-4">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">Pembahasan</p>
                        <h2 className="st-heading-display mt-1 text-3xl md:text-4xl">Tinjau jawaban satu per satu</h2>
                        <p className="st-muted mt-2 text-sm font-semibold">Bandingkan jawabanmu dengan kunci dan pelajari penjelasannya.</p>
                    </div>
                    <TkaResultReview items={result.reviewItems} />
                </section>
            </div>
        </main>
    )
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="st-card p-4">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500">{icon}{label}</div>
            <div className="mt-2 text-3xl font-black">{value}</div>
        </div>
    )
}
