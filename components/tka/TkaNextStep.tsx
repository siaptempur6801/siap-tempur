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
        <article data-testid="tka-next-step" className="group relative flex min-w-0 flex-col justify-between overflow-hidden rounded-st-2xl border-2 border-[var(--st-ink)] bg-[var(--st-blue-soft)] p-6 st-shadow-md transition-transform duration-200 hover:-translate-y-1">
            <Doodle variant="dots" className="pointer-events-none absolute -right-2 -top-2 opacity-30" />

            <div className="relative">
                <div className="st-kicker bg-white">
                    <Sparkles size={14} aria-hidden="true" />
                    <span>Langkah Belajar Selanjutnya</span>
                </div>

                <h2 className="st-heading-display mt-4 text-xl leading-snug sm:text-2xl">
                    {recommendation.title}
                </h2>

                <p className="st-muted mt-2 text-sm font-semibold leading-relaxed sm:text-base">
                    {recommendation.description}
                </p>
            </div>

            <div className="relative mt-6">
                <Link
                    href={recommendation.href}
                    className="st-button st-focus inline-flex min-h-12 items-center justify-center gap-2.5 bg-blue-600 px-5 py-3 text-sm font-black text-white"
                >
                    <span>{recommendation.action}</span>
                    <ArrowRight size={16} className="transition-transform duration-150 group-hover:translate-x-1" aria-hidden="true" />
                </Link>
            </div>
        </article>
    )
}
