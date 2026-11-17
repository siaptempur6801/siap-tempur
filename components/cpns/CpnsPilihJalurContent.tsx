import Link from 'next/link'
import {
  ArrowRight,
  BrainCircuit,
  ClipboardCheck,
  Compass,
  Layers3,
  Sparkles,
  ShieldCheck,
  Target,
} from 'lucide-react'

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
    title: 'Tryout lengkap',
    description: 'Simulasi lengkap berstandar CAT dengan waktu dan susunan subtes penuh.',
    icon: Sparkles,
  },
] as const

export default function CpnsPilihJalurContent() {
  return (
    <div className="space-y-6 md:space-y-8">
      <header className="rounded-2xl border border-border-strong bg-white p-5 sm:p-6">
        <p className="inline-flex items-center gap-2 rounded-full bg-primary-muted px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-primary ring-1 ring-info-border">
          <Compass size={14} aria-hidden="true" /> Pilih jalur CPNS
        </p>
        <h1 className="mt-3 text-xl font-bold leading-tight tracking-tight text-foreground sm:text-2xl">
          Tentukan langkah belajar CPNS berikutnya
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Jalur CPNS menekankan penguasaan SKD. Pilih fokus yang paling perlu dikejar sekarang,
          kerjakan latihannya, lalu ukur lagi dengan mini tryout atau full tryout.
        </p>
      </header>

      <section aria-labelledby="fokus-skd" className="space-y-3">
        <div>
          <h2 id="fokus-skd" className="text-lg font-semibold text-foreground">
            Pilih fokus SKD
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Tiga subtes SKD, masing-masing punya halaman latihan sendiri.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {SUBTESTS.map((subtest) => {
            const Icon = subtest.icon
            return (
              <Link
                key={subtest.code}
                href={subtest.href}
                className="st-card-md st-focus group flex h-full flex-col p-4 transition duration-200 hover:border-primary/40 hover:bg-muted/20 hover:shadow-md motion-reduce:transition-none"
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
            Jalur latihan CPNS
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Urutan yang disarankan: kuasai materi, ukur dengan mini tryout, lalu full tryout.
          </p>
        </div>
        <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {LADDER.map((step, index) => {
            const Icon = step.icon
            return (
              <li key={step.href}>
                <Link
                  href={step.href}
                  className="st-card-md st-focus group flex h-full flex-col p-4 transition duration-200 hover:border-primary/40 hover:bg-muted/20 hover:shadow-md motion-reduce:transition-none"
                >
                  <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    <span className="flex size-6 items-center justify-center rounded-md bg-primary-muted text-xs tabular-nums text-primary">
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

      <section
        aria-labelledby="akses-cpns"
        className="flex flex-col gap-4 rounded-2xl border border-border-strong bg-white p-5 sm:p-6 xl:flex-row xl:items-center xl:justify-between"
      >
        <div className="max-w-2xl">
          <h2 id="akses-cpns" className="text-lg font-semibold text-foreground">
            Token CPNS
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            Sesi tertentu menggunakan token. Saldo token dan riwayat penggunaannya tersedia di
            profil.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/cpns/dashboard/beli-paket"
            className="st-focus inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 motion-reduce:transition-none"
          >
            Lihat paket token
          </Link>
          <Link
            href="/tka"
            className="st-focus inline-flex min-h-11 items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted motion-reduce:transition-none"
          >
            Buka jalur TKA
          </Link>
        </div>
      </section>
    </div>
  )
}
