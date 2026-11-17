import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles, Target } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import TrackedLink from '@/components/analytics/TrackedLink'
import { Mascot } from '@/components/brand/Mascot'
import { Doodle, MascotBubble, Sticker, WashiTape } from '@/components/brand/playful'
import InPageLink from '@/components/marketing/InPageLink'
import ProgressBar from '@/components/ui/ProgressBar'

type CpnsLandingHeroProps = {
  primaryAccountHref: string
  drillHref: string
  isLoggedIn: boolean
}

export default function CpnsLandingHero({
  primaryAccountHref,
  drillHref,
  isLoggedIn,
}: CpnsLandingHeroProps) {
  return (
    <section id="hero-cpns" className="relative px-4 pb-12 pt-8 md:px-8 md:pb-20 md:pt-14 lg:pb-24">
      <div
        className="pointer-events-none absolute -left-28 top-24 h-56 w-56 rounded-full border-2 border-dashed border-amber-400 bg-[var(--st-yellow-soft)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-16 top-4 h-52 w-44 rotate-12 rounded-st-2xl border-2 border-dashed border-blue-300 bg-[var(--st-blue-soft)]"
        aria-hidden="true"
      />

      <div className="px-container-marketing relative grid items-center gap-10 lg:grid-cols-[1.04fr_0.96fr] lg:gap-14">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="st-kicker">
              <Sparkles size={15} /> Persiapan SKD · TWK · TIU · TKP
            </div>
            <Sticker tone="amber" rotate="right" className="hover-wiggle">
              Gratis buat mulai
            </Sticker>
          </div>
          <h1 className="st-heading-display mt-5 max-w-4xl text-[2.7rem] sm:text-6xl md:text-7xl">
            Bukan cuma latihan SKD.{' '}
            <span className="text-blue-600">Tahu bagian mana yang harus kamu kejar.</span>
          </h1>
          <Doodle variant="squiggle" className="mt-4 hidden md:block" />
          <p className="st-muted mt-5 max-w-2xl text-base font-semibold leading-relaxed sm:text-lg md:text-xl">
            Ukur kemampuan lewat Drill, Mini Tryout, atau Full Tryout. Baca hasilnya, pelajari
            pembahasan, lalu kembali ke materi yang memang masih lemah.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <TrackedLink
                href={primaryAccountHref}
                eventName="px_landing_cta"
                eventProperties={{ program: 'cpns', surface: 'landing', cta: 'primary_start' }}
              >
                {isLoggedIn ? 'Lanjutkan belajar' : 'Mulai belajar CPNS'} <ArrowRight size={18} />
              </TrackedLink>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <InPageLink href="#mulai-dari-mana">Aku mulai dari mana?</InPageLink>
            </Button>
            <Doodle variant="star" className="hidden -rotate-12 md:block" />
          </div>

          <div className="mt-7 grid grid-cols-2 gap-x-4 gap-y-3 text-sm font-bold text-gray-600 sm:flex sm:flex-wrap sm:gap-x-5">
            {['Drill per materi', 'Mini & Full Tryout', 'Pembahasan', 'Soal salah & remedial'].map(
              (item) => (
                <span key={item} className="inline-flex items-start gap-2">
                  <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-green-600" /> {item}
                </span>
              ),
            )}
          </div>

          <div className="mt-8 hidden items-end gap-4 sm:flex">
            <MascotBubble name="tama" size="sm" bubbleTone="blue" priority className="flex-1">
              Hai! Aku <b>Tama</b> — ini <b>Tara</b>. Kita cek dulu bagian mana yang paling perlu
              dikejar, ya, biar latihannya nggak acak.
            </MascotBubble>
            <Mascot
              name="tara"
              size="sm"
              tone="plain"
              priority
              className="hidden shrink-0 md:inline-flex animate-bob"
            />
          </div>
        </div>

        <div className="st-card-lg relative bg-white p-4 sm:p-5 md:p-7">
          <WashiTape className="-top-3 left-1/2 -translate-x-1/2" />
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-blue-700 sm:text-xs">
                Contoh tampilan evaluasi
              </p>
              <h2 className="st-heading-display mt-2 text-3xl md:text-4xl">Fokus berikutnya.</h2>
            </div>
            <span className="st-pill bg-[var(--st-blue-soft)]">SKD</span>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
            {[
              {
                label: 'TWK',
                value: 46,
                status: 'Prioritas',
                tone: 'bg-[var(--st-yellow-soft)]',
              },
              { label: 'TIU', value: 72, status: 'Berkembang', tone: 'bg-[var(--st-blue-soft)]' },
              {
                label: 'TKP',
                value: 84,
                status: 'Pertahankan',
                tone: 'bg-[var(--st-green-soft)]',
              },
            ].map((item) => (
              <div
                key={item.label}
                className={`min-w-0 rounded-xl border border-gray-200 p-3 sm:rounded-2xl sm:p-4 ${item.tone}`}
              >
                <div className="flex items-center justify-between gap-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.08em] text-gray-600 sm:text-xs">
                    {item.label}
                  </p>
                  <span className="text-[10px] font-black text-gray-700 sm:text-xs">
                    {item.value}%
                  </span>
                </div>
                <ProgressBar
                  value={item.value}
                  label={`Progres ${item.label}`}
                  size="sm"
                  className="mt-2 h-1.5 rounded-full border-0 bg-white/90 sm:mt-3 sm:h-2"
                  indicatorClassName="rounded-full bg-blue-600"
                />
                <p className="mt-2 truncate text-[10px] font-black text-gray-700 sm:text-xs">
                  {item.status}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-2xl border-2 border-[var(--st-ink)] bg-white p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--st-blue-soft)] text-blue-700">
                <Target size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-blue-700">
                  3 fokus berikutnya
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5 sm:gap-2">
                  {['Drill TWK', 'Soal salah', 'Mini Tryout TWK'].map((item) => (
                    <span
                      key={item}
                      className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-black text-gray-700 sm:px-3 sm:text-xs"
                    >
                      {item}
                    </span>
                  ))}
                </div>
                <TrackedLink
                  href={drillHref}
                  eventName="px_landing_cta"
                  eventProperties={{
                    program: 'cpns',
                    surface: 'landing',
                    cta: 'hero_preview_drill',
                    mode: 'latihan_fokus',
                  }}
                  className="st-focus mt-3 inline-flex min-h-10 items-center gap-2 text-sm font-black text-blue-700 hover:underline"
                >
                  Mulai dari area terlemah <ArrowRight size={16} />
                </TrackedLink>
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-start gap-2 text-[11px] font-bold leading-relaxed text-gray-500 sm:text-xs">
            <ShieldCheck size={15} className="mt-0.5 shrink-0" /> Ilustrasi alur produk, bukan hasil
            peserta nyata.
          </div>
        </div>
      </div>
    </section>
  )
}
