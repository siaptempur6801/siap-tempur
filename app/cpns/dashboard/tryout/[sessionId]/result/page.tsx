import { createV2Client } from '@/lib/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, Target, Trophy, XCircle } from 'lucide-react'
import ResultReviewClient from '@/components/practice/ResultReviewClient'
import { Mascot } from '@/components/brand/Mascot'
import ResultXPWrapper from '@/components/practice/ResultXPWrapper'
import { practiceResultService } from '@/src/services/practice-result.service'
import { gamificationService } from '@/src/services/gamification.service'
import { cn } from '@/lib/utils'
import TrackedLink from '@/components/analytics/TrackedLink'

function formatDuration(startedAt: string | null, submittedAt: string | null) {
    if (!startedAt || !submittedAt) return '-'
    const seconds = Math.max(0, Math.floor((Date.parse(submittedAt) - Date.parse(startedAt)) / 1000))
    const minutes = Math.floor(seconds / 60)
    const rest = seconds % 60
    return `${minutes} menit ${rest} detik`
}

function resolveBackTarget(kind: string | null, from?: string) {
    if (from === 'riwayat') return { href: '/cpns/dashboard/riwayat', label: 'riwayat' }
    if (from === 'event' || kind === 'event') return { href: '/cpns/dashboard/event', label: 'event' }
    if (from === 'drilling-materi' || kind === 'drill') return { href: '/cpns/dashboard/drilling-materi', label: 'Latihan Fokus' }
    if (from === 'mini-tryout' || kind === 'mini_tryout') return { href: '/cpns/dashboard/mini-tryout', label: 'mini tryout' }
    return { href: '/cpns/dashboard/tryout', label: 'tryout' }
}

export default async function PracticeResultPage({
    params,
    searchParams,
}: {
    params: Promise<{ sessionId: string }>
    searchParams: Promise<{ from?: string; completed?: string }>
}) {
    const { sessionId } = await params
    const { from, completed } = await searchParams
    const supabase = await createV2Client()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) redirect('/login')

    const result = await practiceResultService.getResult(user.id, sessionId)
    if (!result) redirect('/cpns/dashboard/tryout')
    if (!['completed', 'COMPLETED', 'submitted', 'SUBMITTED'].includes(result.status)) {
        redirect(`/cpns/dashboard/tryout/${sessionId}`)
    }
    const xpInfo = completed === '1'
        ? await gamificationService.getAttemptReward(user.id, {
            score: result.totalScore,
            practiceKind: result.practiceKind,
        })
        : null

    const back = resolveBackTarget(result.practiceKind, from)
    const answeredCount = result.answers.filter((answer) => Boolean(answer.option_id)).length
    const needsImprovement = result.passed === false

    return (
        <ResultXPWrapper rewardKey={sessionId} xpInfo={xpInfo} showReward={completed === '1'}>
            <main className="st-product min-h-screen bg-[var(--st-paper)] px-4 py-6 font-body text-[var(--st-ink)] sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl space-y-7">
                <TrackedLink
                    href={back.href}
                    eventName="px_result_action"
                    eventProperties={{ program: 'cpns', surface: 'result', cta: `back_${back.label.replace(/\s+/g, '_')}` }}
                    className="st-focus inline-flex min-h-11 items-center gap-2 border-2 border-[var(--st-ink)] bg-white px-4 py-2 text-sm font-black st-shadow-sm"
                >
                    <ArrowLeft size={17} /> Kembali ke {back.label}
                </TrackedLink>

                <section className="st-card-md grid gap-6 bg-white p-6 lg:grid-cols-[1.35fr_0.65fr] lg:items-center md:p-8">
                    <div>
                        <div className="st-kicker"><Trophy size={15} /> Hasil belajarmu</div>
                        <h1 className="st-heading-display mt-5 text-4xl md:text-5xl">
                            {needsImprovement ? 'Hasilnya sudah jelas. Sekarang perbaiki bagian yang lemah.' : 'Sesi selesai. Gunakan hasil ini untuk langkah berikutnya.'}
                        </h1>
                        <p className="st-muted mt-4 max-w-2xl font-semibold leading-relaxed">
                            Lihat skor, rincian tiap bagian, lalu buka pembahasan. Tujuannya bukan berhenti di angka, tetapi memahami apa yang perlu kamu lanjutkan setelah sesi ini.
                        </p>
                        <Mascot name="tama" size="xs" tone="soft" className="mt-6 hidden sm:inline-flex" />
                    </div>
                    <div className="border-2 border-[var(--st-ink)] bg-[var(--st-yellow)] p-5 text-center st-shadow-md">
                        <div className="text-xs font-black uppercase tracking-[0.16em] text-gray-600">Total skor</div>
                        <div className="mt-1 text-5xl font-black">{result.totalScore}</div>
                        <div className="mt-1 text-sm font-bold text-gray-700">
                            {result.percentage === null ? 'Persentase belum tersedia' : `${result.percentage}%`}
                        </div>
                    </div>
                </section>

                <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Metric icon={<Target size={18} />} label="Terjawab" value={`${answeredCount}/${result.answers.length}`} />
                    <Metric icon={<Clock size={18} />} label="Waktu pengerjaan" value={formatDuration(result.startedAt, result.submittedAt)} />
                    <div className="st-card p-4 sm:col-span-2">
                        <div className="flex items-center gap-2 text-sm font-black text-gray-500">
                            {needsImprovement ? <XCircle size={18} /> : <CheckCircle2 size={18} />} Status
                        </div>
                        <div className={cn('mt-2 text-2xl font-black md:text-3xl', needsImprovement ? 'text-red-700' : result.passed === true ? 'text-green-700' : 'text-gray-900')}>
                            {result.passed === null ? 'Hasil tersimpan' : result.passed ? 'Target tercapai' : 'Masih perlu diperkuat'}
                        </div>
                    </div>
                </section>

                {result.subjectResults.length > 0 && (
                    <section aria-labelledby="section-results-title" className="space-y-4">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">Rincian hasil</p>
                            <h2 id="section-results-title" className="st-heading mt-1 text-2xl md:text-3xl">Lihat bagian mana yang perlu perhatian.</h2>
                        </div>
                        <div className="grid gap-4 md:grid-cols-3">
                            {result.subjectResults.map((subject) => (
                                <article key={subject.subjectId} className="st-card p-5">
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-lg font-black">{subject.code}</span>
                                        <span className={cn('st-pill', subject.passed === false ? 'bg-red-100 text-red-800' : subject.passed === true ? 'bg-green-100 text-green-800' : 'bg-gray-100')}>
                                            {subject.passed === null ? 'Hasil tersimpan' : subject.passed ? 'Target tercapai' : 'Perlu diperkuat'}
                                        </span>
                                    </div>
                                    <div className="mt-4 text-3xl font-black">{subject.score}<span className="text-base text-gray-400"> / {subject.maxScore}</span></div>
                                    <div className="mt-4 space-y-2 border-t-2 border-dashed border-gray-300 pt-4 text-sm font-bold text-gray-600">
                                        <Row label="Benar" value={subject.correctCount} />
                                        <Row label="Salah" value={subject.wrongCount} />
                                        <Row label="Belum dijawab" value={subject.unansweredCount} />
                                        <Row label="Target minimum" value={subject.passingScore ?? '-'} />
                                    </div>
                                </article>
                            ))}
                        </div>
                    </section>
                )}

                <section className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">Langkah berikutnya</p>
                        <h2 className="st-heading mt-1 text-2xl md:text-3xl">Jangan tutup hasil ini tanpa rencana.</h2>
                        <p className="st-muted mt-2 max-w-2xl text-sm font-semibold leading-relaxed">
                            Jika ada bagian yang masih lemah, lanjutkan ke Latihan Fokus. Jika hasilmu sudah stabil, gunakan mini tryout atau full tryout berikutnya untuk mengukur ulang.
                        </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <TrackedLink
                            href="/cpns/dashboard/drilling-materi"
                            eventName="px_result_action"
                            eventProperties={{ program: 'cpns', surface: 'result', cta: 'focused_practice' }}
                            className="st-button inline-flex min-h-12 items-center justify-center gap-2 bg-blue-600 px-5 py-3 text-sm font-black text-white"
                        >
                            Latihan Fokus <ArrowRight size={17} />
                        </TrackedLink>
                        <Link href="/cpns/dashboard/riwayat" className="st-button inline-flex min-h-12 items-center justify-center bg-white px-5 py-3 text-sm font-black">Lihat semua hasil</Link>
                    </div>
                </section>

                <section className="space-y-3">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">Pembahasan</p>
                        <h2 className="st-heading mt-1 text-2xl md:text-3xl">Pahami jawabanmu satu per satu.</h2>
                        <p className="st-muted mt-2 text-sm font-semibold">Bandingkan jawabanmu dengan kunci dan pelajari pembahasan yang tersedia.</p>
                    </div>
                    {result.answers.length > 0 ? (
                        <ResultReviewClient answers={result.answers} />
                    ) : (
                        <div className="st-card p-6 text-center font-bold text-gray-500">Belum ada soal yang bisa ditinjau dari sesi ini.</div>
                    )}
                </section>
            </div>
            </main>
        </ResultXPWrapper>
    )
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="st-card p-4">
            <div className="flex items-center gap-2 text-sm font-black text-gray-500">{icon}{label}</div>
            <div className="mt-2 text-2xl font-black md:text-3xl">{value}</div>
        </div>
    )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
    return <div className="flex justify-between gap-3"><span>{label}</span><span className="text-gray-900">{value}</span></div>
}
