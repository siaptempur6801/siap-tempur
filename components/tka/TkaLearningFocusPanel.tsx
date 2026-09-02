import Link from 'next/link'
import { ArrowRight, Lightbulb, Target } from 'lucide-react'
import { tkaLearningFocusService, type TkaLearningFocusItem } from '@/src/services/tka-learning-focus.service'

function masteryPercent(value: number) {
    return Math.max(0, Math.min(100, Math.round(value * 100)))
}

function masteryLabel(level: string) {
    if (level === 'mastered') return 'Sudah kuat'
    if (level === 'proficient') return 'Cukup kuat'
    if (level === 'developing') return 'Berkembang'
    return 'Perlu diperkuat'
}

export default async function TkaLearningFocusPanel({ items }: { items?: TkaLearningFocusItem[] }) {
    let resolvedItems = items ?? []
    if (resolvedItems.length === 0) {
        try {
            resolvedItems = (await tkaLearningFocusService.getFocus()).items
        } catch {
            resolvedItems = []
        }
    }
    if (resolvedItems.length === 0) return null

    return (
        <section data-testid="tka-learning-focus" className="st-card-md p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-3xl">
                    <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-blue-700">
                        <Lightbulb size={17}/> Rekomendasi belajar
                    </div>
                    <h2 className="st-heading-display mt-2 text-3xl">Fokus belajar berikutnya</h2>
                    <p className="st-muted mt-2 text-sm font-semibold leading-relaxed">
                        Mulai dari topik yang masih paling lemah berdasarkan hasil latihanmu, lalu cek kembali perkembangannya setelah berlatih.
                    </p>
                </div>
                <span className="st-pill bg-violet-100 text-violet-700">{resolvedItems.length} prioritas belajar</span>
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-3">
                {resolvedItems.map((item) => {
                    const percent = masteryPercent(item.masteryScore)
                    return (
                        <article key={item.id} data-testid="tka-learning-focus-card" className="flex flex-col rounded-[1.15rem] border border-slate-200 bg-slate-50 p-4 shadow-sm">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-xs font-black text-violet-700 ring-1 ring-violet-200">
                                        {item.priority}
                                    </span>
                                    <span className="st-pill bg-emerald-100 text-emerald-800">{item.subjectCode}</span>
                                </div>
                                <span className="text-xs font-black text-slate-500">{masteryLabel(item.masteryLevel)}</span>
                            </div>

                            <h3 className="st-heading mt-4 text-lg leading-snug">{item.topicName}</h3>
                            {item.parentTopicName && <p className="st-muted mt-1 text-xs font-bold">{item.parentTopicName}</p>}

                            <div className="mt-4">
                                <div className="flex items-center justify-between text-xs font-black text-slate-600">
                                    <span>Penguasaan</span>
                                    <span>{percent}%</span>
                                </div>
                                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white ring-1 ring-slate-200">
                                    <div className="h-full rounded-full bg-violet-400" style={{ width: `${percent}%` }}/>
                                </div>
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs font-bold">
                                <div className="rounded-xl border border-slate-200 bg-white p-3 text-slate-700">
                                    <Target size={14} className="mx-auto mb-1 text-violet-700"/>
                                    Soal dinilai<br/><b className="text-slate-950">{item.attemptedQuestions}</b>
                                </div>
                                <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-red-700">
                                    Perlu diulang<br/><b>{item.openGapCount}</b>
                                </div>
                            </div>

                            <Link
                                href={item.nextAction.href}
                                className="st-button st-focus mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white"
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
