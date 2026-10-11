import Link from 'next/link'
import {
  ArrowRight,
  BrainCircuit,
  ClipboardCheck,
  Coins,
  Compass,
  Layers3,
  ShieldCheck,
  Sparkles,
  Target,
} from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'

/**
 * Konten halaman **Pilih Jalur khusus CPNS**.
 *
 * Halaman ini fokus ke jalur belajar SKD (TWK/TIU/TKP + tangga latihan), bukan ke pemilihan
 * jenjang TKA seperti sebelumnya. Tautan ke program TKA tetap ada di bagian bawah sebagai
 * lintas-program.
 */
const SUBTESTS = [
  {
    href: '/cpns/dashboard/drilling-materi#focused-twk',
    code: 'TWK',
    title: 'Tes Wawasan Kebangsaan',
    description: 'Nasionalisme, integritas, bela negara, pilar negara, dan bahasa Indonesia.',
    icon: ShieldCheck,
    tone: 'bg-[var(--st-blue-soft)]',
  },
  {
    href: '/cpns/dashboard/drilling-materi#focused-tiu',
    code: 'TIU',
    title: 'Tes Intelegensia Umum',
    description: 'Verbal, numerik, figural, penalaran, dan analisis informasi.',
    icon: BrainCircuit,
    tone: 'bg-[var(--st-yellow-soft)]',
  },
  {
    href: '/cpns/dashboard/drilling-materi#focused-tkp',
    code: 'TKP',
    title: 'Tes Karakteristik Pribadi',
    description: 'Pelayanan publik, jejaring kerja, sosial budaya, dan teknologi informasi.',
    icon: Target,
    tone: 'bg-[var(--st-green-soft)]',
  },
] as const

const LADDER = [
  {
    href: '/cpns/dashboard/drilling-materi',
    title: 'Latihan fokus',
    description: 'Latihan pendek per materi untuk menutup bagian yang masih lemah.',
    icon: Layers3,
  },
  {
    href: '/cpns/dashboard/mini-tryout',
    title: 'Mini tryout',
    description: 'Sesi singkat dengan komposisi seperti ujian untuk mengukur kesiapan.',
    icon: ClipboardCheck,
  },
  {
    href: '/cpns/dashboard/tryout',
    title: 'Full tryout',
    description: 'Simulasi lengkap berstandar CAT dengan waktu dan susunan subtes penuh.',
    icon: Sparkles,
  },
] as const

export default function CpnsPilihJalurContent({ hasActivePass }: { hasActivePass: boolean }) {
  return (
    <div className="space-y-6 md:space-y-8">
      <PageHeader
        eyebrow={
          <>
            <Compass size={14} aria-hidden="true" /> Pilih jalur CPNS
          </>
        }
        title="Mulai dari satu subtes, lalu naik ke tryout penuh."
        description="Jalur CPNS menekankan penguasaan SKD. Pilih fokus yang paling perlu dikejar sekarang, kerjakan latihannya, lalu ukur lagi dengan mini tryout atau full tryout."
      />

      <section aria-labelledby="fokus-skd" className="space-y-3">
        <div>
          <h2 id="fokus-skd" className="text-lg font-semibold text-foreground">
            Pilih fokus SKD
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Tiga subtes SKD, masing-masing punya halaman latihan sendiri.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {SUBTESTS.map((subtest) => {
            const Icon = subtest.icon
            return (
              <Link
                key={subtest.code}
                href={subtest.href}
                className="st-card-md st-focus group flex flex-col p-4 transition-colors hover:border-primary/30 hover:bg-muted/20"
              >
                <span
                  className={`flex size-10 items-center justify-center rounded-lg border border-border ${subtest.tone}`}
                >
                  <Icon size={19} className="text-foreground" aria-hidden="true" />
                </span>
                <span className="mt-3 text-xs font-semibold text-primary">{subtest.code}</span>
                <span className="mt-1 text-sm font-semibold text-foreground">{subtest.title}</span>
                <span className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {subtest.description}
                </span>
                <span className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-primary group-hover:underline">
                  Latihan bagian ini <ArrowRight size={14} aria-hidden="true" />
                </span>
              </Link>
            )
          })}
        </div>
      </section>

      <section aria-labelledby="tangga-latihan" className="space-y-3">
        <div>
          <h2 id="tangga-latihan" className="text-lg font-semibold text-foreground">
            Tangga latihan
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Urutan yang disarankan: kuasai materi, ukur dengan mini tryout, lalu full tryout.
          </p>
        </div>
        <ol className="grid gap-3 md:grid-cols-3">
          {LADDER.map((step, index) => {
            const Icon = step.icon
            return (
              <li key={step.href}>
                <Link
                  href={step.href}
                  className="st-card-md st-focus group flex h-full flex-col p-4 transition-colors hover:border-primary/30 hover:bg-muted/20"
                >
                  <span className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs tabular-nums">
                      {index + 1}
                    </span>
                    Langkah
                  </span>
                  <span className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Icon size={17} className="text-primary" aria-hidden="true" /> {step.title}
                  </span>
                  <span className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </span>
                </Link>
              </li>
            )
          })}
        </ol>
      </section>

      <section aria-labelledby="akses-cpns" className="st-card-md p-5">
        <h2 id="akses-cpns" className="text-lg font-semibold text-foreground">
          Akses &amp; token CPNS
        </h2>
        {hasActivePass ? (
          <p className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-success">
            <ShieldCheck size={16} aria-hidden="true" /> Tempur Pass CPNS aktif — Mini Tryout dan
            Full Tryout tanpa hitung token.
          </p>
        ) : (
          <p className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-slate-600">
            <Coins size={16} className="text-warning" aria-hidden="true" /> Kamu masih memakai token
            per sesi. Tempur Pass CPNS membuat tryout berulang tanpa token.
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link href="/cpns/dashboard/pass">
              <Sparkles size={15} aria-hidden="true" />{' '}
              {hasActivePass ? 'Kelola Tempur Pass CPNS' : 'Lihat Tempur Pass CPNS'}
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/tka">Buka jalur TKA</Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
