import Link from 'next/link'
import { ArrowRight, BarChart3, Gauge, ShieldCheck } from 'lucide-react'
import type { TkaReadinessView } from '@/src/services/tka-readiness.service'

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
        <section className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-[var(--px-shadow-xs)] md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-5">
                <div className="max-w-3xl">
                    <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                        <Gauge size={17}/> Kesiapan belajar
                    </div>
                    <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">Kesiapan TKA SMP</h2>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                        Ringkasan ini membantu kamu melihat seberapa siap hasil belajarmu saat ini dan mata pelajaran mana yang masih perlu lebih banyak latihan.
                    </p>
                    {showDashboardLink && (
                        <Link
                            href="/tka/smp/progress"
                            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
                        >
                            Lihat perkembangan <ArrowRight size={16}/>
                        </Link>
                    )}
                </div>
                <div className="min-w-40 rounded-2xl bg-emerald-50 px-5 py-4 text-center">
                    <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Kesiapan</div>
                    <div className="mt-1 text-4xl font-extrabold tracking-tight text-slate-950">{readinessPercent.toFixed(1)}%</div>
                    <div className="mt-1 text-sm font-semibold text-emerald-700">{levelLabel(readiness.readinessLevel)}</div>
                </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_0.42fr]">
                <div className="grid gap-3 sm:grid-cols-2">
                    {readiness.subjects.map((subject) => {
                        const subjectPercent = percent(subject.readinessScore * 100)
                        return (
                            <article key={subject.subjectId} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                                <div className="flex items-end justify-between gap-3">
                                    <div>
                                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{subject.subjectCode}</div>
                                        <h3 className="mt-1 font-bold text-slate-950">{subject.subjectName}</h3>
                                    </div>
                                    <div className="text-2xl font-extrabold tracking-tight text-slate-950">{subjectPercent.toFixed(1)}%</div>
                                </div>
                                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
                                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${subjectPercent}%` }}/>
                                </div>
                                <div className="mt-2 text-xs font-medium text-slate-500">
                                    Materi terukur: {subject.evidencedNodes}/{subject.assessableNodes}
                                </div>
                            </article>
                        )
                    })}
                </div>

                <aside className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-700">
                        <ShieldCheck size={16}/> Kekuatan data belajar
                    </div>
                    <div className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">{confidencePercent.toFixed(1)}%</div>
                    <div className="text-sm font-semibold text-amber-700">{confidenceLabel(readiness.confidenceLevel)}</div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
                        <div className="h-full rounded-full bg-amber-400" style={{ width: `${confidencePercent}%` }}/>
                    </div>
                    <div className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-slate-600">
                        <BarChart3 size={15} className="mt-0.5 shrink-0 text-amber-700"/>
                        Ringkasan akan semakin kuat setelah kamu mengerjakan lebih banyak bagian materi dan memiliki lebih banyak hasil latihan yang bisa dibandingkan.
                    </div>
                </aside>
            </div>
        </section>
    )
}
