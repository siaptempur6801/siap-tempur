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
        <section className="border-2 border-gray-900 bg-emerald-50 p-5 shadow-[4px_4px_0_0_#111] md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-emerald-800">
                        <Gauge size={16}/> Kesiapan belajar
                    </div>
                    <h2 className="mt-1 text-2xl font-black">Kesiapan TKA SMP</h2>
                    <p className="mt-1 max-w-3xl text-sm font-semibold leading-relaxed text-gray-600">
                        Ringkasan ini membantu kamu melihat seberapa siap hasil belajarmu saat ini dan mata pelajaran mana yang masih perlu lebih banyak latihan.
                    </p>
                    {showDashboardLink && (
                        <Link
                            href="/tka/smp/progress"
                            className="mt-3 inline-flex items-center gap-2 border-2 border-gray-900 bg-gray-900 px-4 py-2 text-sm font-black text-white shadow-[3px_3px_0_0_#aaa] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
                        >
                            Lihat perkembangan <ArrowRight size={16}/>
                        </Link>
                    )}
                </div>
                <div className="min-w-40 border-2 border-gray-900 bg-white px-4 py-3 text-center shadow-[3px_3px_0_0_#111]">
                    <div className="text-xs font-black uppercase tracking-wider text-gray-500">Kesiapan</div>
                    <div className="text-4xl font-black">{readinessPercent.toFixed(1)}%</div>
                    <div className="text-sm font-black text-emerald-800">{levelLabel(readiness.readinessLevel)}</div>
                </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.45fr]">
                <div className="grid gap-3 sm:grid-cols-2">
                    {readiness.subjects.map((subject) => {
                        const subjectPercent = percent(subject.readinessScore * 100)
                        return (
                            <article key={subject.subjectId} className="border-2 border-gray-900 bg-white p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <div className="text-xs font-black uppercase text-gray-500">{subject.subjectCode}</div>
                                        <h3 className="font-black">{subject.subjectName}</h3>
                                    </div>
                                    <div className="text-2xl font-black">{subjectPercent.toFixed(1)}%</div>
                                </div>
                                <div className="mt-3 h-3 overflow-hidden border-2 border-gray-900 bg-gray-100">
                                    <div className="h-full bg-emerald-300" style={{ width: `${subjectPercent}%` }}/>
                                </div>
                                <div className="mt-2 text-xs font-bold text-gray-600">
                                    Materi terukur: {subject.evidencedNodes}/{subject.assessableNodes}
                                </div>
                            </article>
                        )
                    })}
                </div>

                <aside className="border-2 border-gray-900 bg-[#fff9c4] p-4">
                    <div className="flex items-center gap-2 text-xs font-black uppercase text-gray-600">
                        <ShieldCheck size={16}/> Kekuatan data belajar
                    </div>
                    <div className="mt-2 text-3xl font-black">{confidencePercent.toFixed(1)}%</div>
                    <div className="text-sm font-black">{confidenceLabel(readiness.confidenceLevel)}</div>
                    <div className="mt-3 h-3 overflow-hidden border-2 border-gray-900 bg-white">
                        <div className="h-full bg-yellow-300" style={{ width: `${confidencePercent}%` }}/>
                    </div>
                    <div className="mt-3 flex items-start gap-2 text-xs font-semibold leading-relaxed text-gray-600">
                        <BarChart3 size={15} className="mt-0.5 shrink-0"/>
                        Ringkasan akan semakin kuat setelah kamu mengerjakan lebih banyak bagian materi dan memiliki lebih banyak hasil latihan yang bisa dibandingkan.
                    </div>
                </aside>
            </div>
        </section>
    )
}
