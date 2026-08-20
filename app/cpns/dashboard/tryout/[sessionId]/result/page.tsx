import { createV2Client } from '@/lib/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Clock, Target, Trophy, XCircle } from 'lucide-react'
import ResultReviewClient from '@/components/practice/ResultReviewClient'
import PaperBackground from '@/components/PaperBackground'
import { practiceResultService } from '@/src/services/practice-result.service'
import { cn } from '@/lib/utils'

function formatDuration(startedAt: string | null, submittedAt: string | null) {
    if (!startedAt || !submittedAt) return '-'
    const seconds = Math.max(0, Math.floor((Date.parse(submittedAt) - Date.parse(startedAt)) / 1000))
    const minutes = Math.floor(seconds / 60)
    const rest = seconds % 60
    return `${minutes}m ${rest}s`
}

function resolveBackTarget(kind: string | null, from?: string) {
    if (from === 'riwayat') return { href: '/cpns/dashboard/riwayat', label: 'Riwayat' }
    if (from === 'event' || kind === 'event') return { href: '/cpns/dashboard/event', label: 'Event' }
    if (from === 'drilling-materi' || kind === 'drill') {
        return { href: '/cpns/dashboard/drilling-materi', label: 'Drilling Materi' }
    }
    if (from === 'mini-tryout' || kind === 'mini_tryout') {
        return { href: '/cpns/dashboard/mini-tryout', label: 'Mini Tryout' }
    }
    return { href: '/cpns/dashboard/tryout', label: 'Tryout' }
}

export default async function PracticeResultPage({
    params,
    searchParams,
}: {
    params: Promise<{ sessionId: string }>
    searchParams: Promise<{ from?: string; completed?: string }>
}) {
    const { sessionId } = await params
    const { from } = await searchParams
    const supabase = await createV2Client()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) redirect('/login')

    const result = await practiceResultService.getResult(user.id, sessionId)
    if (!result) redirect('/cpns/dashboard/tryout')

    if (!['completed', 'COMPLETED', 'submitted', 'SUBMITTED'].includes(result.status)) {
        redirect(`/cpns/dashboard/tryout/${sessionId}`)
    }

    const back = resolveBackTarget(result.practiceKind, from)
    const answeredCount = result.answers.filter((answer) => Boolean(answer.option_id)).length

    return (
        <main className="min-h-screen bg-[#fffdf5] px-4 py-6 font-handwriting sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl space-y-6">
                <div className="flex items-center justify-between gap-4">
                    <Link
                        href={back.href}
                        className="inline-flex items-center gap-2 rounded-xl border-2 border-gray-900 bg-white px-4 py-2 font-black text-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition hover:translate-x-px hover:translate-y-px hover:shadow-none"
                    >
                        <ArrowLeft size={18} /> Kembali ke {back.label}
                    </Link>
                    <span className="rounded-full border-2 border-gray-900 bg-yellow-200 px-3 py-1 text-xs font-black uppercase tracking-wider">
                        Schema V2
                    </span>
                </div>

                <section className="relative overflow-hidden rounded-3xl border-2 border-gray-900 bg-white p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] sm:p-7">
                    <PaperBackground />
                    <div className="relative z-10 grid gap-5 lg:grid-cols-[1.3fr_0.7fr] lg:items-center">
                        <div>
                            <div className="mb-2 inline-flex items-center gap-2 rounded-full border-2 border-gray-900 bg-blue-100 px-3 py-1 text-sm font-black">
                                <Trophy size={16} /> Hasil Latihan
                            </div>
                            <h1 className="text-3xl font-black text-gray-900 sm:text-4xl">
                                {result.passed === false ? 'Masih Bisa Ditingkatkan' : 'Sesi Selesai!'}
                            </h1>
                            <p className="mt-2 max-w-xl font-bold text-gray-600">
                                Hasil dihitung server-side dari snapshot soal pada attempt. Kunci jawaban tidak dikirim ke browser selama ujian.
                            </p>
                        </div>

                        <div className="rounded-2xl border-2 border-gray-900 bg-[#fff9c4] p-5 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            <div className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">Total Score</div>
                            <div className="mt-1 text-5xl font-black font-sans text-gray-900">{result.totalScore}</div>
                            <div className="mt-1 text-sm font-bold text-gray-600">
                                {result.percentage === null ? 'Persentase belum tersedia' : `${result.percentage}%`}
                            </div>
                        </div>
                    </div>
                </section>

                <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-2xl border-2 border-gray-900 bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <div className="flex items-center gap-2 text-sm font-black text-gray-500"><Target size={18} /> Terjawab</div>
                        <div className="mt-2 text-3xl font-black font-sans">{answeredCount}/{result.answers.length}</div>
                    </div>
                    <div className="rounded-2xl border-2 border-gray-900 bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <div className="flex items-center gap-2 text-sm font-black text-gray-500"><Clock size={18} /> Durasi</div>
                        <div className="mt-2 text-3xl font-black font-sans">{formatDuration(result.startedAt, result.submittedAt)}</div>
                    </div>
                    <div className="rounded-2xl border-2 border-gray-900 bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:col-span-2">
                        <div className="flex items-center gap-2 text-sm font-black text-gray-500">
                            {result.passed === false ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
                            Status
                        </div>
                        <div className={cn(
                            'mt-2 text-3xl font-black font-sans',
                            result.passed === false ? 'text-red-600' : result.passed === true ? 'text-green-600' : 'text-gray-900',
                        )}>
                            {result.passed === null ? 'Menunggu aturan kelulusan' : result.passed ? 'LULUS' : 'BELUM LULUS'}
                        </div>
                    </div>
                </section>

                {result.subjectResults.length > 0 && (
                    <section className="grid gap-4 md:grid-cols-3">
                        {result.subjectResults.map((subject) => (
                            <div key={subject.subjectId} className="rounded-2xl border-2 border-gray-900 bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-lg font-black">{subject.code}</span>
                                    <span className={cn(
                                        'rounded-full border-2 border-gray-900 px-2 py-0.5 text-[10px] font-black',
                                        subject.passed === false ? 'bg-red-100' : subject.passed === true ? 'bg-green-100' : 'bg-gray-100',
                                    )}>
                                        {subject.passed === null ? 'N/A' : subject.passed ? 'LULUS' : 'BELUM'}
                                    </span>
                                </div>
                                <div className="mt-3 text-3xl font-black font-sans">
                                    {subject.score}<span className="text-base text-gray-400"> / {subject.maxScore}</span>
                                </div>
                                <div className="mt-3 space-y-1 text-sm font-bold text-gray-600">
                                    <div className="flex justify-between"><span>Benar</span><span>{subject.correctCount}</span></div>
                                    <div className="flex justify-between"><span>Salah</span><span>{subject.wrongCount}</span></div>
                                    <div className="flex justify-between"><span>Kosong</span><span>{subject.unansweredCount}</span></div>
                                    <div className="flex justify-between"><span>Passing</span><span>{subject.passingScore ?? '-'}</span></div>
                                </div>
                            </div>
                        ))}
                    </section>
                )}

                <section className="space-y-3">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900">Review Jawaban</h2>
                        <p className="font-bold text-gray-500">Pembahasan dan answer key baru dikirim setelah attempt selesai.</p>
                    </div>
                    {result.answers.length > 0 ? (
                        <ResultReviewClient answers={result.answers} />
                    ) : (
                        <div className="rounded-2xl border-2 border-gray-900 bg-white p-6 text-center font-bold text-gray-500">
                            Tidak ada soal pada attempt ini.
                        </div>
                    )}
                </section>
            </div>
        </main>
    )
}
