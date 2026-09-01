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
        <div className="space-y-6">
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <article className="border-2 border-gray-900 bg-white p-4 shadow-[3px_3px_0_0_#111]">
                    <div className="flex items-center gap-2 text-xs font-black uppercase text-gray-500">
                        <CheckCircle2 size={16}/> Tryout selesai
                    </div>
                    <div className="mt-2 text-3xl font-black">{dashboard.completedAttempts}</div>
                    <p className="mt-1 text-xs font-semibold text-gray-500">Completed/submitted attempt TKA SMP.</p>
                </article>
                <article className="border-2 border-gray-900 bg-red-50 p-4 shadow-[3px_3px_0_0_#111]">
                    <div className="flex items-center gap-2 text-xs font-black uppercase text-red-700">
                        <RotateCcw size={16}/> Gap terbuka
                    </div>
                    <div className="mt-2 text-3xl font-black">{wrongLabel}</div>
                    <p className="mt-1 text-xs font-semibold text-gray-600">Soal salah atau belum dijawab yang masih perlu dibereskan.</p>
                </article>
                <article className="border-2 border-gray-900 bg-orange-50 p-4 shadow-[3px_3px_0_0_#111]">
                    <div className="flex items-center gap-2 text-xs font-black uppercase text-orange-700">
                        <BookOpenCheck size={16}/> Remedial pending
                    </div>
                    <div className="mt-2 text-3xl font-black">{dashboard.pendingRemedialItems}</div>
                    <p className="mt-1 text-xs font-semibold text-gray-600">Dari {dashboard.activeRemedialSessions} sesi remedial aktif.</p>
                </article>
                <article className="border-2 border-gray-900 bg-cyan-50 p-4 shadow-[3px_3px_0_0_#111]">
                    <div className="flex items-center gap-2 text-xs font-black uppercase text-cyan-800">
                        <Target size={16}/> Coverage evidence
                    </div>
                    <div className="mt-2 text-3xl font-black">{boundedPercent(dashboard.coveragePercent).toFixed(1)}%</div>
                    <p className="mt-1 text-xs font-semibold text-gray-600">{dashboard.evidencedNodes}/{dashboard.assessableNodes} knowledge node sudah punya evidence.</p>
                </article>
            </section>

            {dashboard.readiness ? (
                <TkaReadinessCard readiness={dashboard.readiness} showDashboardLink={false}/>
            ) : (
                <section className="border-2 border-dashed border-gray-400 bg-white p-6 text-center">
                    <TrendingUp className="mx-auto"/>
                    <h2 className="mt-3 text-xl font-black">Readiness belum tersedia</h2>
                    <p className="mt-1 text-sm font-semibold text-gray-600">Selesaikan minimal satu tryout agar mastery dan readiness mulai terbentuk.</p>
                    <Link href="/tka/smp" className="mt-4 inline-flex items-center gap-2 border-2 border-gray-900 bg-gray-900 px-4 py-2 font-black text-white shadow-[3px_3px_0_0_#aaa]">
                        Mulai latihan <ArrowRight size={16}/>
                    </Link>
                </section>
            )}

            <section className="space-y-3">
                <div>
                    <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-blue-700">
                        <TrendingUp size={16}/> Subject progress
                    </div>
                    <h2 className="mt-1 text-2xl font-black">Progress per mapel</h2>
                    <p className="mt-1 text-sm font-semibold text-gray-600">Mastery, accuracy, readiness, coverage, dan gap ditampilkan berdampingan agar progres tidak dinilai dari satu metrik saja.</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    {dashboard.subjects.map((subject) => {
                        const readinessPercent = boundedPercent(subject.readinessPercent)
                        const masteryPercent = boundedPercent(subject.masteryPercent)
                        const accuracyPercent = boundedPercent(subject.accuracyPercent)
                        const coveragePercent = boundedPercent(subject.coveragePercent)
                        return (
                            <article key={subject.subjectId} className="border-2 border-gray-900 bg-white p-5 shadow-[4px_4px_0_0_#111]">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="text-xs font-black uppercase text-blue-700">{subject.subjectCode}</div>
                                        <h3 className="text-xl font-black">{subject.subjectName}</h3>
                                    </div>
                                    <span className="border-2 border-gray-900 bg-cyan-100 px-3 py-1 text-sm font-black">{readinessPercent.toFixed(1)}% ready</span>
                                </div>

                                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                                    <div className="border border-gray-900 bg-gray-50 p-2 text-center text-xs font-bold">Mastery<br/><b>{masteryPercent.toFixed(1)}%</b></div>
                                    <div className="border border-gray-900 bg-green-50 p-2 text-center text-xs font-bold">Accuracy<br/><b>{accuracyPercent.toFixed(1)}%</b></div>
                                    <div className="border border-gray-900 bg-cyan-50 p-2 text-center text-xs font-bold">Coverage<br/><b>{coveragePercent.toFixed(1)}%</b></div>
                                    <div className="border border-gray-900 bg-red-50 p-2 text-center text-xs font-bold">Gap<br/><b>{subject.openWrongQuestions}</b></div>
                                </div>

                                <div className="mt-4 h-3 overflow-hidden border-2 border-gray-900 bg-gray-100">
                                    <div className="h-full bg-blue-300" style={{ width: `${readinessPercent}%` }}/>
                                </div>
                                <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs font-semibold text-gray-600">
                                    <span>{subject.attempts} attempt · {subject.questionsAnswered} jawaban dinilai</span>
                                    <span>Evidence {subject.evidencedNodes}/{subject.assessableNodes}</span>
                                </div>
                            </article>
                        )
                    })}
                </div>
            </section>

            <TkaLearningFocusPanel items={dashboard.focus.items}/>

            <section className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
                <div className="border-2 border-gray-900 bg-white p-5 shadow-[4px_4px_0_0_#111]">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-500">
                        <History size={16}/> Recent activity
                    </div>
                    <h2 className="mt-1 text-2xl font-black">Riwayat hasil terbaru</h2>

                    {dashboard.recentAttempts.length > 0 ? (
                        <div className="mt-4 space-y-3">
                            {dashboard.recentAttempts.map((attempt) => (
                                <Link key={attempt.attemptId} href={attempt.href} className="flex flex-wrap items-center justify-between gap-3 border-2 border-gray-900 bg-gray-50 p-3 hover:bg-cyan-50">
                                    <div>
                                        <div className="font-black">{attempt.examTitle}</div>
                                        <div className="text-xs font-semibold text-gray-500">{formatAttemptDate(attempt.updatedAt)}</div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-black">{attempt.percentage === null ? 'Skor tersimpan' : `${attempt.percentage.toFixed(0)}%`}</span>
                                        <ArrowRight size={17}/>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <p className="mt-4 text-sm font-semibold text-gray-600">Belum ada hasil tryout yang tersimpan.</p>
                    )}
                </div>

                <aside className="border-2 border-gray-900 bg-[#fff9c4] p-5 shadow-[4px_4px_0_0_#111]">
                    <div className="text-xs font-black uppercase tracking-widest text-gray-600">Langkah berikutnya</div>
                    <h2 className="mt-1 text-2xl font-black">Jangan berhenti di skor.</h2>
                    <p className="mt-2 text-sm font-semibold text-gray-600">Dashboard memilih jalur berikutnya dari recommendation, remedial aktif, atau wrong-question queue yang masih terbuka.</p>
                    <Link href={dashboard.nextAction.href} className="mt-5 inline-flex w-full items-center justify-center gap-2 border-2 border-gray-900 bg-gray-900 px-4 py-3 font-black text-white shadow-[3px_3px_0_0_#aaa] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none">
                        {dashboard.nextAction.label} <ArrowRight size={17}/>
                    </Link>
                </aside>
            </section>
        </div>
    )
}
