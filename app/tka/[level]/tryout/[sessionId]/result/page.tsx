import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, BookOpenCheck, CheckCircle2, Clock3, RotateCcw, Target, Trophy, XCircle } from 'lucide-react'
import { env } from '@/lib/env'
import { createV2Client } from '@/lib/utils/supabase/server'
import TkaResultReview from '@/components/tka/TkaResultReview'
import { practiceResultService, type PracticeResultView } from '@/src/services/practice-result.service'
import { tkaFullExamRpcService, type TkaFullExamState } from '@/src/services/tka-full-exam-rpc.service'
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
    if (kind === 'drill') return 'Drill'
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

    if (level === 'SMP' && env.appEnvironment() !== 'production' && fullExamState) {
        try {
            remedial = await tkaRemedialService.findBySourceAttempt(sessionId)
        } catch {
            remedial = null
        }
    }

    const label = practiceLabel(result.practiceKind)
    const wrongGapCount = result.reviewItems.filter((item) => item.isCorrect !== true).length
    const repeatWrongEnabled = level === 'SMP' && env.appEnvironment() !== 'production' && wrongGapCount > 0
    const automaticRemedialEnabled = Boolean(remedial?.session && remedial.session.pendingItems > 0)

    return (
        <main className="min-h-screen bg-[#fdfbf7] px-4 py-6 text-gray-900 md:px-8 md:py-10">
            <div className="mx-auto max-w-6xl space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <Link href={base} className="inline-flex items-center gap-2 border-2 border-gray-900 bg-white px-4 py-2 font-black shadow-[3px_3px_0_0_#111] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none">
                        <ArrowLeft size={18}/> Kembali ke TKA {level}
                    </Link>
                    <span className="border-2 border-gray-900 bg-cyan-100 px-3 py-1 text-xs font-black uppercase">
                        {label} · TKA/{level}
                    </span>
                </div>

                <section className="grid gap-5 border-2 border-gray-900 bg-white p-6 shadow-[6px_6px_0_0_#111] lg:grid-cols-[1.4fr_0.6fr] lg:items-center md:p-8">
                    <div>
                        <div className="inline-flex items-center gap-2 border-2 border-gray-900 bg-yellow-100 px-3 py-1 text-sm font-black">
                            <Trophy size={16}/> Hasil {label} TKA {level}
                        </div>
                        <h1 className="mt-3 font-handwriting text-4xl font-black">Tryout selesai.</h1>
                        <p className="mt-2 max-w-2xl font-semibold text-gray-600">
                            Hasil sudah tersimpan. Gunakan pembahasan di bawah untuk memahami jawaban yang masih salah dan menentukan materi yang perlu diperkuat.
                        </p>
                    </div>
                    <div className="border-2 border-gray-900 bg-[#fff9c4] p-5 text-center shadow-[4px_4px_0_0_#111]">
                        <div className="text-xs font-black uppercase tracking-widest text-gray-500">Total Score</div>
                        <div className="mt-1 text-5xl font-black">{result.totalScore}</div>
                        <div className="mt-1 text-sm font-bold text-gray-600">
                            {result.percentage === null ? 'Persentase belum tersedia' : `${result.percentage}%`}
                        </div>
                    </div>
                </section>

                <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="border-2 border-gray-900 bg-white p-4 shadow-[3px_3px_0_0_#111]">
                        <div className="flex items-center gap-2 text-sm font-black text-gray-500"><Target size={17}/> Terjawab</div>
                        <div className="mt-2 text-3xl font-black">{result.answeredCount}/{result.reviewItems.length}</div>
                    </div>
                    <div className="border-2 border-gray-900 bg-white p-4 shadow-[3px_3px_0_0_#111]">
                        <div className="flex items-center gap-2 text-sm font-black text-gray-500"><Clock3 size={17}/> Durasi</div>
                        <div className="mt-2 text-3xl font-black">{formatDuration(result.startedAt, result.submittedAt)}</div>
                    </div>
                    <div className="border-2 border-gray-900 bg-white p-4 shadow-[3px_3px_0_0_#111] sm:col-span-2">
                        <div className="flex items-center gap-2 text-sm font-black text-gray-500">
                            {result.passed === false ? <XCircle size={17}/> : <CheckCircle2 size={17}/>} Status
                        </div>
                        <div className={cn('mt-2 text-3xl font-black', result.passed === false ? 'text-red-700' : result.passed === true ? 'text-green-700' : 'text-gray-700')}>
                            {result.passed === null ? 'Skor tersimpan' : result.passed ? 'LULUS' : 'BELUM LULUS'}
                        </div>
                    </div>
                </section>

                {result.subjectResults.length > 0 && (
                    <section className="grid gap-3 md:grid-cols-2">
                        {result.subjectResults.map((subject) => (
                            <article key={subject.subjectId} className="border-2 border-gray-900 bg-white p-4 shadow-[3px_3px_0_0_#111]">
                                <div className="flex items-center justify-between gap-2">
                                    <h2 className="text-lg font-black">{subject.code}</h2>
                                    <span className="border border-gray-900 bg-gray-100 px-2 py-0.5 text-[10px] font-black uppercase">
                                        {subject.totalQuestions} soal
                                    </span>
                                </div>
                                <div className="mt-2 text-3xl font-black">{subject.score}<span className="text-base text-gray-400"> / {subject.maxScore}</span></div>
                                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-bold">
                                    <div className="bg-green-50 p-2">Benar<br/><b>{subject.correctCount}</b></div>
                                    <div className="bg-red-50 p-2">Salah<br/><b>{subject.wrongCount}</b></div>
                                    <div className="bg-gray-100 p-2">Kosong<br/><b>{subject.unansweredCount}</b></div>
                                </div>
                            </article>
                        ))}
                    </section>
                )}

                {automaticRemedialEnabled && remedial?.session && (
                    <section className="flex flex-col gap-4 border-2 border-gray-900 bg-orange-50 p-5 shadow-[4px_4px_0_0_#111] md:flex-row md:items-center md:justify-between">
                        <div>
                            <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-orange-700">
                                <BookOpenCheck size={16}/> Remedial Otomatis
                            </div>
                            <h2 className="mt-1 text-2xl font-black">{remedial.session.pendingItems} soal prioritas sudah dipilih untukmu.</h2>
                            <p className="mt-1 max-w-2xl text-sm font-semibold text-gray-600">
                                Maksimal 10 gap dari tryout ini dipilih secara deterministic dan seimbang antar-mapel. Jawaban benar langsung memperbarui mastery topik.
                            </p>
                        </div>
                        <Link href={`${base}/remedial/${remedial.session.id}`} className="inline-flex shrink-0 items-center justify-center gap-2 border-2 border-gray-900 bg-orange-200 px-5 py-3 font-black shadow-[3px_3px_0_0_#111] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none">
                            <BookOpenCheck size={18}/> Mulai Remedial ({remedial.session.pendingItems})
                        </Link>
                    </section>
                )}

                {repeatWrongEnabled && (
                    <section className="flex flex-col gap-4 border-2 border-gray-900 bg-red-50 p-5 shadow-[4px_4px_0_0_#111] md:flex-row md:items-center md:justify-between">
                        <div>
                            <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-red-700">
                                <RotateCcw size={16}/> Mode Ulang Soal Salah
                            </div>
                            <h2 className="mt-1 text-2xl font-black">Ada {wrongGapCount} soal yang perlu dibereskan.</h2>
                            <p className="mt-1 max-w-2xl text-sm font-semibold text-gray-600">
                                Queue mencakup jawaban salah dan soal yang belum dijawab. Setiap soal keluar dari queue setelah kamu menjawabnya dengan benar.
                            </p>
                        </div>
                        <Link href={`${base}/wrong-questions`} className="inline-flex shrink-0 items-center justify-center gap-2 border-2 border-gray-900 bg-gray-900 px-5 py-3 font-black text-white shadow-[3px_3px_0_0_#aaa] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none">
                            <RotateCcw size={18}/> Ulang Soal Salah ({wrongGapCount})
                        </Link>
                    </section>
                )}

                <section className="space-y-3">
                    <div>
                        <h2 className="text-2xl font-black">Review & Pembahasan</h2>
                        <p className="text-sm font-semibold text-gray-600">Buka setiap soal untuk membandingkan jawabanmu dengan kunci dan pembahasannya.</p>
                    </div>
                    <TkaResultReview items={result.reviewItems} />
                </section>
            </div>
        </main>
    )
}
