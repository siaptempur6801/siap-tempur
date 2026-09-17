import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'

export default function TkaNextStep({ recommendation }: {
    recommendation: { title: string; description: string; href: string; action: string }
}) {
    return (
        <article data-testid="tka-next-step" className="group relative flex min-w-0 flex-col justify-between overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/90 via-white to-blue-50/60 p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:border-indigo-200">
            <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-indigo-200/25 blur-2xl transition-all group-hover:scale-110" aria-hidden="true" />

            <div className="relative">
                <div className="inline-flex items-center gap-2 rounded-full bg-indigo-100/90 px-3 py-1 text-xs font-black tracking-wide text-indigo-800">
                    <Sparkles size={14} className="text-indigo-600" aria-hidden="true" />
                    <span>Langkah Belajar Selanjutnya</span>
                </div>

                <h2 className="mt-3.5 text-xl font-bold leading-snug text-slate-950 sm:text-2xl">
                    {recommendation.title}
                </h2>

                <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
                    {recommendation.description}
                </p>
            </div>

            <div className="relative mt-6 pt-2">
                <Link
                    href={recommendation.href}
                    className="st-focus inline-flex min-h-11 items-center justify-center gap-2.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-blue-600/20 transition-all duration-150 hover:bg-indigo-700 hover:shadow-md hover:shadow-blue-600/25 active:scale-[0.98]"
                >
                    <span>{recommendation.action}</span>
                    <ArrowRight size={16} className="transition-transform duration-150 group-hover:translate-x-1" aria-hidden="true" />
                </Link>
            </div>
        </article>
    )
}
