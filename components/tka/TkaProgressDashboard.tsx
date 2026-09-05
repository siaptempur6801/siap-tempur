import Link from 'next/link'
import { ArrowRight, BookOpenCheck, CheckCircle2, History, RotateCcw, Target, TrendingUp } from 'lucide-react'
import TkaLearningFocusPanel from '@/components/tka/TkaLearningFocusPanel'
import TkaReadinessCard from '@/components/tka/TkaReadinessCard'
import type { TkaProgressDashboardView } from '@/src/services/tka-progress-dashboard.service'
import ProgressBar from '@/components/ui/ProgressBar'

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
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard icon={<CheckCircle2 size={18}/>} tone="bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60" label="Tryout selesai" value={String(dashboard.completedAttempts)} description="Paket tryout dan simulasi yang telah kamu tuntaskan." />
                <MetricCard icon={<RotateCcw size={18}/>} tone="bg-rose-50 text-rose-700 ring-1 ring-rose-200/60" label="Soal perlu diulang" value={wrongLabel} description="Soal keliru yang perlu dipelajari kembali pembahasannya." />
                <MetricCard icon={<BookOpenCheck size={18}/>} tone="bg-amber-50 text-amber-800 ring-1 ring-amber-200/60" label="Latihan perbaikan" value={String(dashboard.pendingRemedialItems)} description={`Dari ${dashboard.activeRemedialSessions} sesi remedial yang masih aktif.`} />
                <MetricCard icon={<Target size={18}/>} tone="bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200/60" label="Materi terukur" value={`${boundedPercent(dashboard.coveragePercent).toFixed(1)}%`} description={`${dashboard.evidencedNodes} dari ${dashboard.assessableNodes} topik materi telah teruji melalui evaluasi.`} />
            </section>

            {dashboard.readiness ? (
                <TkaReadinessCard readiness={dashboard.readiness} showDashboardLink={false}/>
            ) : (
                <section className="rounded-2xl border border-slate-200/90 bg-white p-8 text-center shadow-sm md:p-12">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100"><TrendingUp size={22}/></div>
                    <h2 className="mt-4 text-xl font-bold tracking-tight text-slate-950">Kesiapan belum tersedia</h2>
                    <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">Selesaikan minimal satu tryout agar SiapTempur bisa membaca peta kekuatan dan tingkat kesiapan belajarmu secara akurat.</p>
                    <Link href="/tka/smp/focus" className="st-focus mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 active:scale-[0.98] transition">
                        <span>Mulai Latihan Fokus</span> <ArrowRight size={16}/>
                    </Link>
                </section>
            )}

            <section className="space-y-4">
                <div className="max-w-3xl">
                    <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-indigo-700 ring-1 ring-indigo-200/50">
                        <TrendingUp size={14} className="text-indigo-600"/>
                        <span>Perkembangan per Mapel</span>
                    </div>
                    <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Lihat kekuatan tiap mata pelajaran</h2>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">Bandingkan tingkat penguasaan konsep, akurasi pengerjaan, dan jumlah soal yang masih perlu dikaji ulang pada tiap mata pelajaran.</p>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                    {dashboard.subjects.map((subject) => {
                        const readinessPercent = boundedPercent(subject.readinessPercent)
                        const masteryPercent = boundedPercent(subject.masteryPercent)
                        const accuracyPercent = boundedPercent(subject.accuracyPercent)
                        const coveragePercent = boundedPercent(subject.coveragePercent)
                        return (
                            <article key={subject.subjectId} className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md">
                                <div>
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <span className="text-xs font-black uppercase tracking-wider text-indigo-600">{subject.subjectCode}</span>
                                            <h3 className="mt-1 text-xl font-bold text-slate-950">{subject.subjectName}</h3>
                                        </div>
                                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
                                            {readinessPercent.toFixed(1)}% siap
                                        </span>
                                    </div>

                                    <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                                        <StatTile label="Penguasaan" value={`${masteryPercent.toFixed(1)}%`} />
                                        <StatTile label="Ketepatan" value={`${accuracyPercent.toFixed(1)}%`} tone="bg-emerald-50/70 border-emerald-100 text-emerald-800" />
                                        <StatTile label="Cakupan" value={`${coveragePercent.toFixed(1)}%`} tone="bg-indigo-50/70 border-indigo-100 text-indigo-800" />
                                        <StatTile label="Perlu diulang" value={String(subject.openWrongQuestions)} tone="bg-rose-50/70 border-rose-100 text-rose-800" />
                                    </div>

                                    <ProgressBar
                                        value={readinessPercent}
                                        label={`Kesiapan ${subject.subjectName}`}
                                        size="sm"
                                        className="mt-5 bg-slate-100"
                                        indicatorClassName="bg-indigo-600"
                                    />
                                </div>
                                <div className="mt-4 flex flex-wrap justify-between gap-2 border-t border-slate-100 pt-3 text-xs font-semibold text-slate-500">
                                    <span>{subject.attempts} kali pengerjaan · {subject.questionsAnswered} butir soal dinilai</span>
                                    <span>Materi terukur {subject.evidencedNodes}/{subject.assessableNodes}</span>
                                </div>
                            </article>
                        )
                    })}
                </div>
            </section>

            <TkaLearningFocusPanel items={dashboard.focus.items}/>

            <section className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
                <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
                    <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400">
                        <History size={15}/> Aktivitas terbaru
                    </div>
                    <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950">Riwayat hasil terbaru</h2>

                    {dashboard.recentAttempts.length > 0 ? (
                        <div className="mt-5 space-y-3">
                            {dashboard.recentAttempts.map((attempt) => (
                                <Link
                                    key={attempt.attemptId}
                                    href={attempt.href}
                                    className="st-focus group flex min-h-14 flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-4 transition hover:border-indigo-200 hover:bg-indigo-50/40"
                                >
                                    <div>
                                        <div className="font-bold text-slate-900">{attempt.examTitle}</div>
                                        <div className="mt-1 text-xs font-semibold text-slate-400">{formatAttemptDate(attempt.updatedAt)}</div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-black text-slate-800">
                                            {attempt.percentage === null ? 'Skor tersimpan' : `${attempt.percentage.toFixed(0)}%`}
                                        </span>
                                        <ArrowRight size={15} className="text-indigo-600 transition-transform group-hover:translate-x-0.5"/>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <p className="mt-4 text-sm font-semibold text-slate-400">Belum ada hasil tryout yang tersimpan.</p>
                    )}
                </div>

                <aside className="flex flex-col justify-between rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50/80 via-white to-amber-50/40 p-6 shadow-sm">
                    <div>
                        <div className="text-xs font-black uppercase tracking-wider text-amber-800">Langkah berikutnya</div>
                        <h2 className="mt-2 text-xl font-bold text-slate-950">Jangan berhenti di skor.</h2>
                        <p className="mt-2 text-sm leading-relaxed text-slate-600">
                            Nilai tryout adalah peta diagnostik, bukan hasil akhir. Tingkatkan kemampuanmu secara terarah dengan menuntaskan soal salah dan melatih materi prioritas.
                        </p>
                    </div>
                    <Link
                        href={dashboard.nextAction.href}
                        className="st-focus mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-slate-800 active:scale-[0.98] transition"
                    >
                        <span>{dashboard.nextAction.label}</span>
                        <ArrowRight size={16}/>
                    </Link>
                </aside>
            </section>
        </div>
    )
}

function MetricCard({ icon, tone, label, value, description }: { icon: React.ReactNode; tone: string; label: string; value: string; description: string }) {
    return (
        <article className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md">
            <div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}>{icon}</div>
                <div className="mt-3 text-3xl font-black tracking-tight text-slate-950">{value}</div>
                <div className="mt-1 text-sm font-bold text-slate-800">{label}</div>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">{description}</p>
        </article>
    )
}

function StatTile({ label, value, tone = 'bg-slate-50/80 border-slate-100 text-slate-700' }: { label: string; value: string; tone?: string }) {
    return (
        <div className={`rounded-xl border p-2.5 text-center text-xs font-semibold ${tone}`}>
            <span className="text-[11px] opacity-80">{label}</span>
            <p className="mt-0.5 text-sm font-black text-slate-950">{value}</p>
        </div>
    )
}
