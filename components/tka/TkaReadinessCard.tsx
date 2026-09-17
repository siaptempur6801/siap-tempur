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
    level,
    showDashboardLink = true,
}: {
    readiness: TkaReadinessView
    /** Jenjang yang sedang dibuka (mis. `SMP`) untuk label kartu. */
    level?: string
    showDashboardLink?: boolean
}) {
    const readinessPercent = percent(readiness.readinessPercent)
    const confidencePercent = percent(readiness.confidencePercent)

    return (
        <section className="group rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs transition-all duration-200 hover:border-slate-300 hover:shadow-md">
            <div className="flex flex-wrap items-start justify-between gap-6">
                <div className="max-w-2xl">
                    <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-indigo-700 ring-1 ring-indigo-200/70 shadow-2xs">
                        <Gauge size={14} className="text-indigo-600" />
                        <span>Tingkat Kesiapan</span>
                    </div>
                    <h2 className="mt-3 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
                        {level ? `Kesiapan TKA ${level}` : 'Kesiapan belajar'}
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                        Indikator kesiapan berbasis akumulasi akurasi tryout, latihan bab materi, dan konsistensi perbaikan soal salah.
                    </p>
                    {showDashboardLink && (
                        <Link
                            href="/tka/smp/progress"
                            className="st-focus mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition-all duration-200 hover:bg-indigo-700 active:scale-[0.98]"
                        >
                            <span>Lihat rincian perkembangan</span>
                            <ArrowRight size={14} />
                        </Link>
                    )}
                </div>

                <div className="min-w-48 rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/90 via-blue-50/40 to-emerald-100/30 p-5 text-center shadow-xs ring-1 ring-emerald-200/50">
                    <div className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800">
                        Kesiapan Ujian
                    </div>
                    <div className="mt-1 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                        {readinessPercent.toFixed(1)}%
                    </div>
                    <div className="mt-2">
                        <span className="inline-flex items-center rounded-full bg-emerald-600 px-3 py-0.5 text-xs font-bold text-white shadow-2xs">
                            {levelLabel(readiness.readinessLevel)}
                        </span>
                    </div>
                </div>
            </div>

            <div className="mt-7 grid gap-5 lg:grid-cols-[1fr_0.42fr]">
                <div className="grid gap-4 sm:grid-cols-2">
                    {readiness.subjects.map((subject) => {
                        const subjectPercent = percent(subject.readinessScore * 100)
                        return (
                            <article
                                key={subject.subjectId}
                                className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-slate-50/70 p-5 transition-all duration-200 hover:border-indigo-200 hover:bg-white hover:shadow-2xs"
                            >
                                <div>
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <span className="inline-flex items-center rounded-lg bg-white px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-indigo-700 ring-1 ring-indigo-200/70 shadow-2xs">
                                                {subject.subjectCode}
                                            </span>
                                            <h3 className="mt-2 text-base font-bold text-slate-950 leading-snug">
                                                {subject.subjectName}
                                            </h3>
                                        </div>
                                        <div className="text-2xl font-black tracking-tight text-slate-950">
                                            {subjectPercent.toFixed(1)}%
                                        </div>
                                    </div>
                                    <ProgressBar
                                        value={subjectPercent}
                                        label={`Kesiapan ${subject.subjectName}`}
                                        size="sm"
                                        className="mt-4 rounded-full border border-slate-200/80 bg-slate-100"
                                        indicatorClassName="rounded-full bg-indigo-600"
                                    />
                                </div>
                                <div className="mt-4 flex items-center justify-between border-t border-slate-200/60 pt-3 text-xs font-medium text-slate-500">
                                    <span>Materi terukur</span>
                                    <span className="font-bold text-slate-800">
                                        {subject.evidencedNodes}/{subject.assessableNodes} topik
                                    </span>
                                </div>
                            </article>
                        )
                    })}
                </div>

                <aside className="flex flex-col justify-between rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/70 via-white to-amber-50/30 p-5 shadow-2xs">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-800">
                            <ShieldCheck size={16} className="text-amber-600" />
                            <span>Kekuatan data belajar</span>
                        </div>
                        <div className="mt-3 text-2xl font-black tracking-tight text-slate-950">
                            {confidencePercent.toFixed(1)}%
                        </div>
                        <div className="mt-1">
                            <span className="inline-flex items-center rounded-full bg-amber-100/90 px-2.5 py-0.5 text-xs font-bold text-amber-900 ring-1 ring-amber-200/60">
                                {confidenceLabel(readiness.confidenceLevel)}
                            </span>
                        </div>
                        <ProgressBar
                            value={confidencePercent}
                            label="Kekuatan data belajar"
                            size="sm"
                            className="mt-3.5 rounded-full border border-amber-200/70 bg-white"
                            indicatorClassName="rounded-full bg-amber-500"
                        />
                    </div>
                    <div className="mt-4 flex items-start gap-2.5 border-t border-amber-100/80 pt-3 text-xs font-medium leading-relaxed text-slate-600">
                        <BarChart3 size={15} className="mt-0.5 shrink-0 text-amber-600" />
                        <span>Akurasi analisis akan semakin tajam seiring makin banyaknya bab materi dan latihan yang kamu selesaikan.</span>
                    </div>
                </aside>
            </div>
        </section>
    )
}
