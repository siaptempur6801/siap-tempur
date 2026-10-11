import MidtransSnapScript from '@/components/payments/MidtransSnapScript'
import Link from 'next/link'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { CalendarDays, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react'
import PassPackagesClient from '@/components/pass/PassPackagesClient'
import { PageAnimateContainer, PageAnimateItem } from '@/components/ui/PageAnimate'
import { Button } from '@/components/ui/Button'
import PageHeader from '@/components/ui/PageHeader'
import { createV2Client } from '@/lib/utils/supabase/server'
import { getPassAccess, listActivePassPackages } from '@/src/services/pass-catalog.service'

export const metadata: Metadata = {
  title: 'Tempur Pass CPNS — SIAP TEMPUR',
  description:
    'Paket akses belajar CPNS: Mini Tryout dan Full Tryout berstandar CAT tanpa token per sesi.',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

const BENEFITS = [
  'Mini Tryout tanpa batas token',
  'Full Tryout berstandar CAT',
  'Pembahasan dan bank soal salah',
  'Riwayat serta perkembangan belajar',
] as const

function formatAccessDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeZone: 'Asia/Jakarta' }).format(
    new Date(value),
  )
}

/**
 * Halaman Tempur Pass **khusus CPNS**.
 *
 * Dipisah dari halaman pass TKA supaya cakupannya jelas: pass CPNS berlaku untuk program CPNS,
 * sedangkan TKA punya pass per jenjang dengan halaman sendiri.
 */
export default async function CpnsPassPage() {
  const supabase = await createV2Client()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) redirect(`/login?returnTo=${encodeURIComponent('/cpns/dashboard/pass')}`)

  const [packages, passAccess] = await Promise.all([
    listActivePassPackages(supabase, { programCode: 'CPNS' }),
    getPassAccess(supabase, user.id, 'cpns'),
  ])

  return (
    <div data-experience-mode="learning" data-program="cpns" className="st-product">
      <MidtransSnapScript />
      <PageAnimateContainer className="space-y-6">
        <PageAnimateItem>
          <div className="space-y-6 md:space-y-8">
            <PageHeader
              eyebrow={
                <>
                  <Sparkles size={14} aria-hidden="true" /> Tempur Pass · CPNS
                </>
              }
              title={
                passAccess.hasActivePass
                  ? 'Kelola akses belajar CPNS-mu'
                  : 'Buka akses belajar CPNS tanpa hitung token'
              }
              description="Tempur Pass CPNS berlaku untuk latihan dan tryout SKD di program CPNS. Pass TKA memiliki cakupan sendiri per jenjang."
            />
            <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
              {BENEFITS.map((benefit) => (
                <li key={benefit} className="inline-flex items-center gap-2">
                  <CheckCircle2 size={16} className="shrink-0 text-success" /> {benefit}
                </li>
              ))}
            </ul>

            {passAccess.hasActivePass ? (
              <section
                className="rounded-xl border border-success-border bg-success-muted p-5 sm:p-6"
                aria-label="Status Tempur Pass CPNS"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="inline-flex items-center gap-2 rounded-full bg-card px-3 py-1 text-xs font-medium text-success">
                      <ShieldCheck size={14} /> Tempur Pass aktif
                    </span>
                    <h2 className="mt-2.5 text-lg font-semibold text-foreground sm:text-xl">
                      Akses Premium CPNS Kamu Sedang Aktif
                    </h2>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {passAccess.accessThrough
                        ? `Akses kamu sudah aman sampai ${formatAccessDate(passAccess.accessThrough)}.`
                        : 'Akses kamu aktif tanpa batas waktu.'}
                    </p>
                    {passAccess.scheduledExtensions > 0 && (
                      <p className="mt-1 text-xs font-medium text-success">
                        Termasuk {passAccess.scheduledExtensions} perpanjangan yang sudah terjadwal.
                      </p>
                    )}
                  </div>
                  {passAccess.accessThrough && (
                    <span className="inline-flex items-center gap-2 rounded-lg border border-success-border bg-card px-3.5 py-2 text-xs font-medium text-success">
                      <CalendarDays size={15} /> Sampai {formatAccessDate(passAccess.accessThrough)}
                    </span>
                  )}
                </div>
              </section>
            ) : null}

            {packages.length > 0 ? (
              <PassPackagesClient
                packages={packages}
                program="cpns"
                scopeLabel="CPNS"
                hasActivePass={passAccess.hasActivePass}
              />
            ) : (
              <section
                className="rounded-xl border border-dashed border-border bg-card p-10 text-center"
                role="status"
              >
                <p className="text-lg font-semibold text-foreground">
                  Paket Tempur Pass CPNS belum tersedia.
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Kamu tetap bisa memakai latihan dan tryout gratis yang tersedia di dashboard CPNS.
                </p>
                <Button className="mt-4" variant="secondary" asChild>
                  <Link href="/cpns/dashboard">Kembali ke dashboard CPNS</Link>
                </Button>
              </section>
            )}

            <section className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground sm:p-6">
              <p>
                Sedang menyiapkan jenjang TKA juga?{' '}
                <Link
                  href="/tka"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Pilih jenjang TKA
                </Link>{' '}
                lalu buka <span className="font-semibold text-foreground">Tempur Pass</span> di
                jenjang tersebut — pass TKA dihitung per jenjang (SD, SMP, SMA).
              </p>
            </section>
          </div>
        </PageAnimateItem>
      </PageAnimateContainer>
    </div>
  )
}
