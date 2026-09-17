import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Doodle } from '@/components/brand/playful'

/**
 * Kartu "Langkah Belajar Selanjutnya" pada halaman jenjang TKA.
 *
 * Memakai bahasa visual design system: border ink + hard shadow, judul display, dan CTA brand.
 * Teks serta `data-testid="tka-next-step"` dipertahankan (dipakai gate staging TKA).
 */
export default function TkaNextStep({ recommendation }: {
    recommendation: { title: string; description: string; href: string; action: string }
}) {
    return (
        <article data-testid="tka-next-step" className="group relative flex min-w-0 flex-col justify-between overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/90 via-white to-blue-50/50 p-5 shadow-xs transition-shadow duration-200 hover:shadow-sm">
            <Doodle variant="dots" className="pointer-events-none absolute -right-2 -top-2 opacity-30" />

            <div className="relative">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-blue-700 ring-1 ring-blue-100">
                    <Sparkles size={13} aria-hidden="true" />
                    <span>Langkah Belajar Selanjutnya</span>
                </div>

                <h2 className="mt-3 text-lg font-black leading-snug tracking-tight text-slate-950 sm:text-xl">
                    {recommendation.title}
                </h2>

                <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">
                    {recommendation.description}
                </p>
            </div>

            <div className="relative mt-5">
                <Link
                    href={recommendation.href}
                    className="st-focus inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-xs transition hover:bg-blue-700 active:scale-[0.98]"
                >
                    <span>{recommendation.action}</span>
                    <ArrowRight size={16} className="transition-transform duration-150 group-hover:translate-x-1" aria-hidden="true" />
                </Link>
            </div>
        </article>
    )
}
