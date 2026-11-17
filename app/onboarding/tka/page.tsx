import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, Layers3 } from 'lucide-react'
import TkaLevelChooser from '@/components/onboarding/TkaLevelChooser'
import { MascotBubble } from '@/components/brand/playful'
import { createV2Client } from '@/lib/utils/supabase/server'

export const metadata: Metadata = {
  title: 'Pilih jenjang TKA — Siap Tempur',
  description: 'Tentukan jenjang TKA yang ingin dilanjutkan: SD, SMP, atau SMA.',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Langkah antara setelah memilih program TKA di `/onboarding`.
 *
 * Menampilkan pilihan jenjang (SD/SMP/SMA) sebelum masuk ke ruang belajar, dengan jenjang yang
 * sedang aktif ditandai. Pilihan disimpan sebagai cookie `tka-level` oleh pemilihnya agar
 * kunjungan berikutnya ke `/tka` langsung menuju jenjang yang sama.
 */
export default async function OnboardingTkaPage() {
  const supabase = await createV2Client()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/login?returnTo=${encodeURIComponent('/onboarding/tka')}`)

  return (
    <main className="st-product relative min-h-screen overflow-hidden bg-[var(--st-paper)] px-4 py-6 font-body text-[var(--st-ink)] md:px-8 md:py-8">
      <div
        className="pointer-events-none absolute -left-20 top-40 h-48 w-48 rounded-full border-2 border-dashed border-amber-400 bg-[var(--st-yellow-soft)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-16 bottom-24 h-52 w-44 rotate-6 border-2 border-dashed border-emerald-300 bg-[var(--st-green-soft)]"
        aria-hidden="true"
      />

      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] max-w-5xl flex-col">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="st-focus w-fit font-script text-2xl font-black tracking-tight md:text-3xl"
          >
            Siap
            <span className="text-blue-600 underline decoration-wavy decoration-2 underline-offset-2">
              Tempur
            </span>
            .
          </Link>
          <Link
            href="/onboarding"
            className="st-focus inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-black text-gray-700 hover:bg-white hover:text-blue-700"
          >
            <ArrowLeft size={17} /> Ganti program
          </Link>
        </div>

        <section
          className="flex flex-1 flex-col justify-center py-10"
          aria-labelledby="level-title"
        >
          <div className="mx-auto max-w-3xl text-center">
            <div className="st-kicker">
              <Layers3 size={15} /> Langkah terakhir
            </div>
            <h1 id="level-title" className="st-heading-display mt-4 text-4xl md:text-5xl">
              Pilih jenjang TKA-mu
            </h1>
            <p className="st-muted mx-auto mt-4 max-w-2xl text-base font-semibold leading-relaxed md:text-lg">
              Materi, latihan, dan tryout menyesuaikan jenjang. Pilihan ini bisa diganti kapan saja
              dari sidebar ruang belajar.
            </p>
          </div>

          <div className="mt-8">
            <TkaLevelChooser />
          </div>

          <MascotBubble
            name="tama"
            size="sm"
            soft
            bubbleTone="blue"
            className="mx-auto mt-8 w-fit"
            bubbleClassName="max-w-md"
          >
            Belum yakin? <b>Pilih yang paling dekat dengan kelasmu sekarang.</b> Kamu bisa pindah
            jenjang kapan saja tanpa kehilangan riwayat.
          </MascotBubble>
        </section>
      </div>
    </main>
  )
}
