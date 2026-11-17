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
        <section
            data-testid="tka-learning-focus"
            className="rounded-2xl border border-indigo-100/90 bg-gradient-to-br from-indigo-50/70 via-white to-blue-50/40 p-5 sm:p-6 shadow-xs"
        >
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-3xl">
                    <div className="inline-flex items-center gap-2 rounded-full bg-indigo-100/80 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-indigo-700 ring-1 ring-indigo-200/60 shadow-2xs">
                        <Lightbulb size={14} className="text-indigo-600" />
                        <span>Rekomendasi Belajar</span>
                    </div>
                    <h2 className="mt-3 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
                        Fokus belajar berikutnya
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                        Topik prioritas yang paling membutuhkan latihan berdasarkan riwayat evaluasimu. Tingkatkan penguasaan di sini untuk menaikkan skor kesiapan secara bertahap.
                    </p>
                </div>
                <span className="inline-flex items-center rounded-full bg-indigo-50 px-3.5 py-1.5 text-xs font-bold text-indigo-700 ring-1 ring-indigo-200/80 shadow-2xs">
                    {resolvedItems.length} prioritas belajar
                </span>
            </div>

            <div className="mt-7 grid gap-5 lg:grid-cols-3">
                {resolvedItems.map((item) => {
                    const percent = masteryPercent(item.masteryScore)
                    const isTopPriority = item.priority === 1
                    return (
                        <article
                            key={item.id}
                            data-testid="tka-learning-focus-card"
                            className="group flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 md:p-6 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-indigo-300 hover:shadow-md"
                        >
                            <div>
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <span
                                            className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black shadow-2xs ${
                                                isTopPriority
                                                    ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white ring-2 ring-amber-200/60'
                                                    : 'bg-indigo-600 text-white'
                                            }`}
                                        >
                                            {item.priority}
                                        </span>
                                        <span className="rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700 ring-1 ring-slate-200/70">
                                            {item.subjectCode}
                                        </span>
                                    </div>
                                    <span
                                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                                            item.masteryLevel === 'mastered'
                                                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70'
                                                : item.masteryLevel === 'proficient'
                                                    ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200/70'
                                                    : item.masteryLevel === 'developing'
                                                        ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/70'
                                                        : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/70'
                                        }`}
                                    >
                                        {masteryLabel(item.masteryLevel)}
                                    </span>
                                </div>

                                <h3 className="mt-4 text-base font-bold text-slate-950 leading-snug transition-colors group-hover:text-indigo-950">
                                    {item.topicName}
                                </h3>
                                {item.parentTopicName && (
                                    <p className="mt-1 text-xs font-medium text-slate-400">
                                        {item.parentTopicName}
                                    </p>
                                )}

                                <div className="mt-4">
                                    <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                                        <span>Tingkat Penguasaan</span>
                                        <span className="font-extrabold text-slate-900">{percent}%</span>
                                    </div>
                                    <ProgressBar
                                        value={percent}
                                        label={`Penguasaan ${item.topicName}`}
                                        size="sm"
                                        className="mt-2 rounded-full border border-slate-200/80 bg-slate-100"
                                        indicatorClassName="rounded-full bg-indigo-600"
                                    />
                                </div>

                                <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs">
                                    <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-2.5 text-slate-600">
                                        <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-500">
                                            <Target size={12} className="text-indigo-600" />
                                            <span>Soal dinilai</span>
                                        </div>
                                        <p className="mt-0.5 text-base font-black text-slate-950">
                                            {item.attemptedQuestions}
                                        </p>
                                    </div>
                                    <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-2.5 text-rose-700">
                                        <span className="text-[11px] font-semibold text-rose-500">
                                            Perlu diulang
                                        </span>
                                        <p className="mt-0.5 text-base font-black text-rose-700">
                                            {item.openGapCount}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <Link
                                href={item.nextAction.href}
                                className="st-focus mt-5 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-all duration-200 hover:bg-indigo-700 active:scale-[0.98]"
                            >
                                <span>{item.nextAction.label}</span>
                                <ArrowRight size={14} />
                            </Link>
                        </article>
                    )
                })}
            </div>
        </section>
    )
}
