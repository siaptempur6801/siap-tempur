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
        <section className="border-2 border-gray-900 bg-violet-50 p-5 shadow-[4px_4px_0_0_#111] md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-violet-700">
                        <Lightbulb size={16}/> Rekomendasi belajar
                    </div>
                    <h2 className="mt-1 text-2xl font-black">Fokus belajar berikutnya</h2>
                    <p className="mt-1 max-w-3xl text-sm font-semibold leading-relaxed text-gray-600">
                        Mulai dari topik yang masih paling lemah berdasarkan hasil latihanmu, lalu cek kembali perkembangannya setelah berlatih.
                    </p>
                </div>
                <span className="border-2 border-gray-900 bg-white px-3 py-1 text-xs font-black uppercase">
                    {items.length} prioritas belajar
                </span>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-3">
                {items.map((item) => {
                    const percent = masteryPercent(item.masteryScore)
                    return (
                        <article key={item.id} className="flex flex-col border-2 border-gray-900 bg-white p-4 shadow-[3px_3px_0_0_#111]">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <span className="flex h-7 w-7 items-center justify-center border-2 border-gray-900 bg-violet-200 text-xs font-black">
                                        {item.priority}
                                    </span>
                                    <span className="border border-gray-900 bg-cyan-100 px-2 py-0.5 text-[10px] font-black uppercase">
                                        {item.subjectCode}
                                    </span>
                                </div>
                                <span className="text-xs font-black text-gray-500">{masteryLabel(item.masteryLevel)}</span>
                            </div>

                            <h3 className="mt-3 text-lg font-black leading-snug">{item.topicName}</h3>
                            {item.parentTopicName && (
                                <p className="mt-1 text-xs font-bold text-gray-500">{item.parentTopicName}</p>
                            )}

                            <div className="mt-4">
                                <div className="flex items-center justify-between text-xs font-black">
                                    <span>Penguasaan</span>
                                    <span>{percent}%</span>
                                </div>
                                <div className="mt-1 h-3 overflow-hidden border-2 border-gray-900 bg-gray-100">
                                    <div className="h-full bg-violet-300" style={{ width: `${percent}%` }}/>
                                </div>
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs font-bold">
                                <div className="border border-gray-900 bg-gray-50 p-2">
                                    <Target size={14} className="mx-auto mb-1"/>
                                    Soal dinilai<br/><b>{item.attemptedQuestions}</b>
                                </div>
                                <div className="border border-gray-900 bg-red-50 p-2">
                                    Perlu diulang<br/><b>{item.openGapCount}</b>
                                </div>
                            </div>

                            <Link
                                href={item.nextAction.href}
                                className="mt-4 inline-flex items-center justify-center gap-2 border-2 border-gray-900 bg-gray-900 px-4 py-2.5 font-black text-white shadow-[3px_3px_0_0_#aaa] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
                            >
                                {item.nextAction.label} <ArrowRight size={17}/>
                            </Link>
                        </article>
                    )
                })}
            </div>
        </section>
    )
}
