import Link from 'next/link'
import { ArrowRight, Lightbulb, Target } from 'lucide-react'
import { tkaLearningFocusService, type TkaLearningFocusItem } from '@/src/services/tka-learning-focus.service'
import ProgressBar from '@/components/ui/ProgressBar'

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
        <section data-testid="tka-learning-focus" className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 via-white to-violet-50/40 p-6 md:p-7 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-3xl">
                    <div className="inline-flex items-center gap-2 rounded-full bg-indigo-100/80 px-3 py-1 text-xs font-black uppercase tracking-wider text-indigo-700">
                        <Lightbulb size={14} className="text-indigo-600"/>
                        <span>Rekomendasi Belajar</span>
                    </div>
                    <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Fokus belajar berikutnya</h2>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                        Topik prioritas yang paling membutuhkan latihan berdasarkan riwayat evaluasimu. Tingkatkan penguasaan di sini untuk menaikkan skor kesiapan secara bertahap.
                    </p>
                </div>
                <span className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 ring-1 ring-indigo-200">
                    {resolvedItems.length} prioritas belajar
                </span>
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-3">
                {resolvedItems.map((item) => {
                    const percent = masteryPercent(item.masteryScore)
                    return (
                        <article key={item.id} data-testid="tka-learning-focus-card" className="flex flex-col justify-between rounded-2xl border border-indigo-100/80 bg-white p-5 shadow-sm transition-all duration-200 hover:border-indigo-200 hover:shadow-md">
                            <div>
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-xs font-black text-indigo-700 ring-1 ring-indigo-200">
                                            {item.priority}
                                        </span>
                                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">{item.subjectCode}</span>
                                    </div>
                                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${
                                        item.masteryLevel === 'mastered'
                                            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60'
                                            : item.masteryLevel === 'proficient'
                                                ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200/60'
                                                : item.masteryLevel === 'developing'
                                                    ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/60'
                                                    : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/60'
                                    }`}>
                                        {masteryLabel(item.masteryLevel)}
                                    </span>
                                </div>

                                <h3 className="mt-4 text-base font-bold text-slate-950 leading-snug">{item.topicName}</h3>
                                {item.parentTopicName && <p className="mt-1 text-xs font-semibold text-slate-400">{item.parentTopicName}</p>}

                                <div className="mt-4">
                                    <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                                        <span>Tingkat Penguasaan</span>
                                        <span className="font-black text-slate-900">{percent}%</span>
                                    </div>
                                    <ProgressBar
                                        value={percent}
                                        label={`Penguasaan ${item.topicName}`}
                                        size="sm"
                                        className="mt-2 border-slate-200 bg-slate-100"
                                        indicatorClassName="bg-indigo-600"
                                    />
                                </div>

                                <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs">
                                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-slate-600">
                                        <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 font-semibold">
                                            <Target size={12} className="text-indigo-600"/>
                                            <span>Soal dinilai</span>
                                        </div>
                                        <p className="mt-0.5 text-base font-black text-slate-900">{item.attemptedQuestions}</p>
                                    </div>
                                    <div className="rounded-xl border border-red-100 bg-red-50/60 p-2.5 text-red-700">
                                        <span className="text-[11px] font-semibold text-red-500">Perlu diulang</span>
                                        <p className="mt-0.5 text-base font-black text-red-700">{item.openGapCount}</p>
                                    </div>
                                </div>
                            </div>

                            <Link
                                href={item.nextAction.href}
                                className="st-focus mt-5 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700 active:scale-[0.98]"
                            >
                                <span>{item.nextAction.label}</span>
                                <ArrowRight size={14}/>
                            </Link>
                        </article>
                    )
                })}
            </div>
        </section>
    )
}
