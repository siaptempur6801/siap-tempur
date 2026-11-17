import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'

/**
 * Kartu "Langkah Belajar Selanjutnya" pada halaman jenjang TKA.
 *
 * Rekomendasi belajar dengan CTA utama dan gaya surface TKA.
 * Teks serta `data-testid="tka-next-step"` dipertahankan (dipakai gate staging TKA).
 */
export default function TkaNextStep({
  recommendation,
}: {
  recommendation: { title: string; description: string; href: string; action: string }
}) {
  return (
    <article
      data-testid="tka-next-step"
      className="group flex min-w-0 flex-col justify-between gap-5 rounded-xl border border-info-border bg-primary-muted p-5 lg:flex-row lg:items-center"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
          <Sparkles size={13} aria-hidden="true" />
          <span>Langkah Belajar Selanjutnya</span>
        </div>

        <h2 className="mt-2 text-lg font-bold leading-snug tracking-tight text-foreground">
          {recommendation.title}
        </h2>

        <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">
          {recommendation.description}
        </p>
      </div>

      <div className="shrink-0">
        <Link
          href={recommendation.href}
          className="st-focus inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary-hover sm:w-auto"
        >
          <span>{recommendation.action}</span>
          <ArrowRight
            size={16}
            className="transition-transform duration-150 group-hover:translate-x-1"
            aria-hidden="true"
          />
        </Link>
      </div>
    </article>
  )
}
