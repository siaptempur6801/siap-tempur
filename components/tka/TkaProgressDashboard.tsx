import Link from 'next/link'
import { ArrowRight, BookOpenCheck, CheckCircle2, History, RotateCcw, Target, TrendingUp } from 'lucide-react'
import TkaLearningFocusPanel from '@/components/tka/TkaLearningFocusPanel'
import TkaReadinessCard from '@/components/tka/TkaReadinessCard'
import type { TkaProgressDashboardView } from '@/src/services/tka-progress-dashboard.service'

function boundedPercent(value: number) {
    return Math.max(0, Math.min(100, value))
}

function formatAttemptDate(value: string) {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return 'Waktu tidak tersedia'
    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jakarta',
    }).format(date)
}

export default function TkaProgressDashboard({ dashboard }: { dashboard: TkaProgressDashboardView }) {
    const wrongLabel = dashboard.openWrongQuestionsIsLowerBound
        ? `${dashboard.openWrongQuestions}+`
        : String(dashboard.openWrongQuestions)

    return (
        <div className="space-y-6 md:space-y-8">
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard icon={<CheckCircle2 size={17}/>} tone="bg-emerald-50 text-emerald-700" label="Tryout selesai" value={String(dashboard.completedAttempts)} description="Jumlah tryout TKA SMP yang sudah kamu selesaikan." />
                <MetricCard icon={<RotateCcw size={17}/>} tone="bg-red-50 text-red-700" label="Soal perlu diulang" value={wrongLabel} description="Soal salah atau belum dijawab yang masih perlu kamu pelajari kembali." />
                <MetricCard icon={<BookOpenCheck size={17}/>} tone="bg-amber-50 text-amber-700" label="Latihan perbaikan" value={String(dashboard.pendingRemedialItems)} description={`Dari ${dashboard.activeRemedialSessions} sesi perbaikan yang masih aktif.`} />
                <MetricCard icon={<Target size={17}/>} tone="bg-blue-50 text-blue-700" label="Materi terukur" value={`${boundedPercent(dashboard.coveragePercent).toFixed(1)}%`} description={`${dashboard.evidencedNodes}/${dashboard.assessableNodes} bagian materi sudah memiliki hasil belajar yang bisa diukur.`} />
            </section>

            {dashboard.readiness ? (
                <TkaReadinessCard readiness={dashboard.readiness} showDashboardLink={false}/>
            ) : (
                <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-7 text-center">
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><TrendingUp size={21}/></div>
                    <h2 className="mt-4 text-xl font-bold text-slate-950">Kesiapan belum tersedia</h2>
                    <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-600">Selesaikan minimal satu tryout agar SiapTempur bisa mulai membaca perkembangan dan kesiapan belajarmu.</p>
                    <Link href="/tka/smp" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2">
                        Mulai latihan <ArrowRight size={16}/>
                    </Link>
                </section>
            )}

            <section className="space-y-4">
                <div className="max-w-3xl">
                    <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700"><TrendingUp size={17}/> Perkembangan per mapel</div>
                    <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">Lihat kekuatan tiap mata pelajaran</h2>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">Bandingkan penguasaan, ketepatan jawaban, cakupan materi, dan soal yang masih perlu diulang untuk menentukan fokus berikutnya.</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    {dashboard.subjects.map((subject) => {
                        const readinessPercent = boundedPercent(subject.readinessPercent)
                        const masteryPercent = boundedPercent(subject.masteryPercent)
                        const accuracyPercent = boundedPercent(subject.accuracyPercent)
                        const coveragePercent = boundedPercent(subject.coveragePercent)
                        return (
                            <article key={subject.subjectId} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[var(--px-shadow-xs)]">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{subject.subjectCode}</div>
                                        <h3 className="mt-1 text-xl font-bold text-slate-950">{subject.subjectName}</h3>
                                    </div>
                                    <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700">{readinessPercent.toFixed(1)}% siap</span>
                                </div>

                                <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                                    <StatTile label="Penguasaan" value={`${masteryPercent.toFixed(1)}%`} />
                                    <StatTile label="Ketepatan" value={`${accuracyPercent.toFixed(1)}%`} tone="bg-emerald-50" />
                                    <StatTile label="Cakupan" value={`${coveragePercent.toFixed(1)}%`} tone="bg-blue-50" />
                                    <StatTile label="Perlu diulang" value={String(subject.openWrongQuestions)} tone="bg-red-50" />
                                </div>

                                <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
                                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${readinessPercent}%` }}/>
                                </div>
                                <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-slate-500">
                                    <span>{subject.attempts} pengerjaan · {subject.questionsAnswered} jawaban dinilai</span>
                                    <span>Materi terukur {subject.evidencedNodes}/{subject.assessableNodes}</span>
                                </div>
                            </article>
                        )
                    })}
                </div>
            </section>

            <TkaLearningFocusPanel items={dashboard.focus.items}/>

            <section className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[var(--px-shadow-xs)]">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-500"><History size={17}/> Aktivitas terbaru</div>
                    <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">Riwayat hasil terbaru</h2>

                    {dashboard.recentAttempts.length > 0 ? (
                        <div className="mt-5 space-y-2">
                            {dashboard.recentAttempts.map((attempt) => (
                                <Link key={attempt.attemptId} href={attempt.href} className="group flex min-h-16 flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 transition hover:border-slate-200 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2">
                                    <div>
                                        <div className="font-semibold text-slate-950">{attempt.examTitle}</div>
                                        <div className="mt-1 text-xs text-slate-500">{formatAttemptDate(attempt.updatedAt)}</div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-semibold text-slate-700">{attempt.percentage === null ? 'Skor tersimpan' : `${attempt.percentage.toFixed(0)}%`}</span>
                                        <ArrowRight size={16} className="text-emerald-700 transition-transform group-hover:translate-x-0.5"/>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <p className="mt-4 text-sm text-slate-600">Belum ada hasil tryout yang tersimpan.</p>
                    )}
                </div>

                <aside className="rounded-3xl border border-amber-100 bg-amber-50/70 p-5">
                    <div className="text-sm font-semibold text-amber-700">Langkah berikutnya</div>
                    <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">Jangan berhenti di skor.</h2>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">Gunakan rekomendasi belajar, soal yang perlu diulang, atau latihan perbaikan untuk menentukan apa yang sebaiknya kamu kerjakan berikutnya.</p>
                    <Link href={dashboard.nextAction.href} className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2">
                        {dashboard.nextAction.label} <ArrowRight size={16}/>
                    </Link>
                </aside>
            </section>
        </div>
    )
}

function MetricCard({ icon, tone, label, value, description }: { icon: React.ReactNode; tone: string; label: string; value: string; description: string }) {
    return (
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[var(--px-shadow-xs)]">
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}>{icon}</div>
            <div className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950">{value}</div>
            <div className="mt-1 text-sm font-semibold text-slate-700">{label}</div>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">{description}</p>
        </article>
    )
}

function StatTile({ label, value, tone = 'bg-slate-50' }: { label: string; value: string; tone?: string }) {
    return <div className={`rounded-xl p-2.5 text-center text-xs text-slate-600 ${tone}`}>{label}<br/><b className="text-slate-950">{value}</b></div>
}
