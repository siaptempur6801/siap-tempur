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
        <section className="st-card-md p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-5">
                <div className="max-w-3xl">
                    <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-blue-700">
                        <Gauge size={17}/> Kesiapan belajar
                    </div>
                    <h2 className="st-heading-display mt-2 text-3xl">Kesiapan TKA SMP</h2>
                    <p className="st-muted mt-2 text-sm font-semibold leading-relaxed">
                        Ringkasan ini membantu kamu melihat seberapa siap hasil belajarmu saat ini dan mata pelajaran mana yang masih perlu lebih banyak latihan.
                    </p>
                    {showDashboardLink && (
                        <Link
                            href="/tka/smp/progress"
                            className="st-button st-focus mt-4 inline-flex min-h-11 items-center gap-2 bg-slate-950 px-4 py-2.5 text-sm font-black text-white"
                        >
                            Lihat perkembangan <ArrowRight size={16}/>
                        </Link>
                    )}
                </div>
                <div className="min-w-40 border-2 border-slate-900 bg-emerald-100 px-5 py-4 text-center shadow-[3px_3px_0_#111827]">
                    <div className="text-xs font-black uppercase tracking-wide text-emerald-800">Kesiapan</div>
                    <div className="mt-1 text-4xl font-black tracking-tight text-slate-950">{readinessPercent.toFixed(1)}%</div>
                    <div className="mt-1 text-sm font-black text-emerald-800">{levelLabel(readiness.readinessLevel)}</div>
                </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_0.42fr]">
                <div className="grid gap-4 sm:grid-cols-2">
                    {readiness.subjects.map((subject) => {
                        const subjectPercent = percent(subject.readinessScore * 100)
                        return (
                            <article key={subject.subjectId} className="st-flat-card bg-slate-50 p-4">
                                <div className="flex items-end justify-between gap-3">
                                    <div>
                                        <div className="text-xs font-black uppercase tracking-wide text-slate-500">{subject.subjectCode}</div>
                                        <h3 className="st-heading mt-1">{subject.subjectName}</h3>
                                    </div>
                                    <div className="text-2xl font-black tracking-tight text-slate-950">{subjectPercent.toFixed(1)}%</div>
                                </div>
                                <div className="mt-4 h-3 overflow-hidden border-2 border-slate-900 bg-white">
                                    <div className="h-full bg-emerald-400" style={{ width: `${subjectPercent}%` }}/>
                                </div>
                                <div className="st-muted mt-2 text-xs font-bold">
                                    Materi terukur: {subject.evidencedNodes}/{subject.assessableNodes}
                                </div>
                            </article>
                        )
                    })}
                </div>

                <aside className="st-warning p-4">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-amber-800">
                        <ShieldCheck size={16}/> Kekuatan data belajar
                    </div>
                    <div className="mt-2 text-3xl font-black tracking-tight text-slate-950">{confidencePercent.toFixed(1)}%</div>
                    <div className="text-sm font-black text-amber-800">{confidenceLabel(readiness.confidenceLevel)}</div>
                    <div className="mt-4 h-3 overflow-hidden border-2 border-slate-900 bg-white">
                        <div className="h-full bg-yellow-300" style={{ width: `${confidencePercent}%` }}/>
                    </div>
                    <div className="st-muted mt-4 flex items-start gap-2 text-xs font-semibold leading-relaxed">
                        <BarChart3 size={15} className="mt-0.5 shrink-0 text-amber-700"/>
                        Ringkasan akan semakin kuat setelah kamu mengerjakan lebih banyak bagian materi dan memiliki lebih banyak hasil latihan yang bisa dibandingkan.
                    </div>
                </aside>
            </div>
        </section>
    )
}
