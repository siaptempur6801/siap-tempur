'use client'

import { cn } from '@/lib/utils'
import TkaSurfaceLink from '@/components/tka/TkaSurfaceLink'
import { isTkaLevelAvailable } from '@/src/tka/context'
import { TKA_LEVEL_OPTIONS } from '@/components/onboarding/tka-level-options'
import { BookOpenCheck, GraduationCap, School } from 'lucide-react'

/**
 * Pemilih jenjang TKA untuk langkah onboarding (setelah memilih program TKA).
 *
 * Memakai mekanisme yang sama dengan pengalih jenjang di sidebar: menyimpan pilihan ke cookie
 * `tka-level`, lalu membuka halaman jenjang dengan **navigasi dokumen penuh** (`TkaSurfaceLink`)
 * supaya chrome halaman jenjang selalu dirender benar oleh server.
 */
const ICONS = {
  SD: School,
  SMP: BookOpenCheck,
  SMA: GraduationCap,
} as const

const TONES = {
  SD: 'bg-[var(--st-yellow-soft)]',
  SMP: 'bg-[var(--st-blue-soft)]',
  SMA: 'bg-[var(--st-green-soft)]',
} as const

export default function TkaLevelChooser({ className }: { className?: string }) {
  return (
    <div className={cn('mx-auto grid w-full max-w-4xl gap-5 md:grid-cols-3', className)}>
      {TKA_LEVEL_OPTIONS.map((option) => {
        const Icon = ICONS[option.level]
        const available = isTkaLevelAvailable(option.level)
        const href = `/tka/${option.level.toLowerCase()}`

        if (!available) {
          return (
            <div
              key={option.level}
              data-testid={`tka-level-${option.level.toLowerCase()}`}
              className="st-card-md flex flex-col bg-white/70 p-5 opacity-70 sm:p-6"
              aria-disabled="true"
            >
              <span className="st-kicker bg-white">Segera hadir</span>
              <h2 className="st-heading-display mt-4 text-2xl">{option.title}</h2>
              <p className="st-muted mt-3 font-semibold leading-relaxed">{option.description}</p>
            </div>
          )
        }

        return (
          <TkaSurfaceLink
            key={option.level}
            href={href}
            data-testid={`tka-level-${option.level.toLowerCase()}`}
            onClick={() => {
              document.cookie = `tka-level=${option.level}; Path=/; Max-Age=31536000; SameSite=Lax`
            }}
            className="st-card-md st-focus group flex flex-col bg-white p-5 transition-transform hover:-translate-y-1 sm:p-6"
          >
            <span
              className={cn(
                'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-[var(--st-ink)]',
                TONES[option.level],
              )}
            >
              <Icon size={24} />
            </span>

            <h2 className="st-heading-display mt-5 text-3xl">{option.title}</h2>
            <p className="st-muted mt-3 font-semibold leading-relaxed">{option.description}</p>

            <div className="mt-5 grid gap-2 text-sm font-bold text-gray-600">
              {option.highlights.map((highlight) => (
                <span key={highlight} className="inline-flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-600" aria-hidden="true" />
                  {highlight}
                </span>
              ))}
            </div>

            <span className="st-button mt-6 inline-flex min-h-12 items-center justify-center gap-2 bg-blue-600 px-5 py-3 font-black text-white">
              Pilih {option.level}
            </span>
          </TkaSurfaceLink>
        )
      })}
    </div>
  )
}
