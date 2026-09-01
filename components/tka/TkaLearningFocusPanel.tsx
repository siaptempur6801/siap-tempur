import Link from 'next/link'
import { ArrowRight, Lightbulb, Target } from 'lucide-react'
import type { TkaLearningFocusItem } from '@/src/services/tka-learning-focus.service'

function masteryPercent(value: number) {
    return Math.max(0, Math.min(100, Math.round(value * 100)))
}

function masteryLabel(level: string) {
    if (level === 'mastered') return 'Sudah kuat'
    if (level === 'proficient') return 'Cukup kuat'
    if (level === 'developing') return 'Berkembang'
    return 'Perlu diperkuat'
}

export default function TkaLearningFocusPanel({ items }: { items: TkaLearningFocusItem[] }) {
    if (items.length === 0) return null

    return (
        <section className="rounded-3xl border border-violet-100 bg-white p-5 shadow-[var(--px-shadow-xs)] md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-3xl">
                    <div className="flex items-center gap-2 text-sm font-semibold text-violet-700">
                        <Lightbulb size={17}/> Rekomendasi belajar
                    </div>
                    <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">Fokus belajar berikutnya</h2>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                        Mulai dari topik yang masih paling lemah berdasarkan hasil latihanmu, lalu cek kembali perkembangannya setelah berlatih.
                    </p>
                </div>
                <span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700">
                    {items.length} prioritas belajar
                </span>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
                {items.map((item) => {
                    const percent = masteryPercent(item.masteryScore)
                    return (
                        <article key={item.id} className="flex flex-col rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-xs font-bold text-violet-700">
                                        {item.priority}
                                    </span>
                                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-700">
                                        {item.subjectCode}
                                    </span>
                                </div>
                                <span className="text-xs font-semibold text-slate-500">{masteryLabel(item.masteryLevel)}</span>
                            </div>

                            <h3 className="mt-4 text-lg font-bold leading-snug text-slate-950">{item.topicName}</h3>
                            {item.parentTopicName && <p className="mt-1 text-xs font-medium text-slate-500">{item.parentTopicName}</p>}

                            <div className="mt-4">
                                <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                                    <span>Penguasaan</span>
                                    <span>{percent}%</span>
                                </div>
                                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                                    <div className="h-full rounded-full bg-violet-500" style={{ width: `${percent}%` }}/>
                                </div>
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs">
                                <div className="rounded-xl bg-white p-3 text-slate-600">
                                    <Target size={14} className="mx-auto mb-1 text-violet-700"/>
                                    Soal dinilai<br/><b className="text-slate-950">{item.attemptedQuestions}</b>
                                </div>
                                <div className="rounded-xl bg-red-50 p-3 text-red-700">
                                    Perlu diulang<br/><b>{item.openGapCount}</b>
                                </div>
                            </div>

                            <Link
                                href={item.nextAction.href}
                                className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2"
                            >
                                {item.nextAction.label} <ArrowRight size={16}/>
                            </Link>
                        </article>
                    )
                })}
            </div>
        </section>
    )
}
