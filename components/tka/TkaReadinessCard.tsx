import Link from 'next/link'
import { ArrowRight, BarChart3, Gauge, ShieldCheck } from 'lucide-react'
import type { TkaReadinessView } from '@/src/services/tka-readiness.service'
import ProgressBar from '@/components/ui/ProgressBar'

function levelLabel(level: TkaReadinessView['readinessLevel']) {
    if (level === 'ready') return 'Siap'
    if (level === 'almost_ready') return 'Hampir siap'
    if (level === 'developing') return 'Berkembang'
    return 'Bangun fondasi'
}

function confidenceLabel(level: TkaReadinessView['confidenceLevel']) {
    if (level === 'high') return 'Tinggi'
    if (level === 'moderate') return 'Sedang'
    return 'Rendah'
}

function percent(value: number) {
    return Math.max(0, Math.min(100, value))
}

export default function TkaReadinessCard({
    readiness,
    showDashboardLink = true,
}: {
    readiness: TkaReadinessView
    showDashboardLink?: boolean
}) {
    const readinessPercent = percent(readiness.readinessPercent)
    const confidencePercent = percent(readiness.confidencePercent)

    return (
        <section className="rounded-2xl border border-slate-200/90 bg-white p-6 md:p-7 shadow-sm transition-all hover:border-slate-300 hover:shadow-md">
            <div className="flex flex-wrap items-start justify-between gap-5">
                <div className="max-w-3xl">
                    <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-indigo-700 ring-1 ring-indigo-200/50">
                        <Gauge size={14} className="text-indigo-600"/>
                        <span>Tingkat Kesiapan</span>
                    </div>
                    <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Kesiapan TKA SMP</h2>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                        Indikator kesiapan berbasis akumulasi akurasi tryout, latihan bab materi, dan konsistensi perbaikan soal salah.
                    </p>
                    {showDashboardLink && (
                        <Link
                            href="/tka/smp/progress"
                            className="st-focus mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition"
                        >
                            <span>Lihat rincian perkembangan</span>
                            <ArrowRight size={14}/>
                        </Link>
                    )}
                </div>
                <div className="min-w-44 rounded-2xl border border-emerald-200 bg-gradient-to-b from-emerald-50 to-emerald-100/50 p-5 text-center shadow-xs">
                    <div className="text-xs font-black uppercase tracking-wider text-emerald-800">Kesiapan</div>
                    <div className="mt-1 text-4xl font-black tracking-tight text-slate-950">{readinessPercent.toFixed(1)}%</div>
                    <div className="mt-1 text-xs font-black uppercase tracking-wide text-emerald-700">{levelLabel(readiness.readinessLevel)}</div>
                </div>
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_0.42fr]">
                <div className="grid gap-4 sm:grid-cols-2">
                    {readiness.subjects.map((subject) => {
                        const subjectPercent = percent(subject.readinessScore * 100)
                        return (
                            <article key={subject.subjectId} className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 transition-colors hover:bg-slate-50">
                                <div>
                                    <div className="flex items-end justify-between gap-3">
                                        <div>
                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{subject.subjectCode}</span>
                                            <h3 className="mt-0.5 text-base font-bold text-slate-900 leading-snug">{subject.subjectName}</h3>
                                        </div>
                                        <div className="text-2xl font-black tracking-tight text-slate-950">{subjectPercent.toFixed(1)}%</div>
                                    </div>
                                    <ProgressBar
                                        value={subjectPercent}
                                        label={`Kesiapan ${subject.subjectName}`}
                                        size="sm"
                                        className="mt-3 bg-white border border-slate-200/60"
                                        indicatorClassName="bg-indigo-600"
                                    />
                                </div>
                                <div className="mt-3 flex items-center justify-between text-xs font-semibold text-slate-500">
                                    <span>Materi terukur</span>
                                    <span className="font-bold text-slate-700">{subject.evidencedNodes}/{subject.assessableNodes} topik</span>
                                </div>
                            </article>
                        )
                    })}
                </div>

                <aside className="flex flex-col justify-between rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/80 via-white to-amber-50/40 p-5 shadow-xs">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-800">
                            <ShieldCheck size={16} className="text-amber-600"/> Kekuatan data belajar
                        </div>
                        <div className="mt-3 text-3xl font-black tracking-tight text-slate-950">{confidencePercent.toFixed(1)}%</div>
                        <div className="mt-0.5 text-xs font-black uppercase tracking-wide text-amber-700">{confidenceLabel(readiness.confidenceLevel)}</div>
                        <ProgressBar
                            value={confidencePercent}
                            label="Kekuatan data belajar"
                            size="sm"
                            className="mt-3 bg-white border border-amber-200/60"
                            indicatorClassName="bg-amber-400"
                        />
                    </div>
                    <div className="mt-4 flex items-start gap-2 text-xs font-medium leading-relaxed text-slate-600">
                        <BarChart3 size={15} className="mt-0.5 shrink-0 text-amber-600"/>
                        <span>Akurasi analisis akan semakin tajam seiring makin banyaknya bab materi dan latihan yang kamu selesaikan.</span>
                    </div>
                </aside>
            </div>
        </section>
    )
}
