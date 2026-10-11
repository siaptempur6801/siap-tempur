'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Crown, Loader2, ShieldCheck, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import {
  createPackageTransaction,
  createTkaPassTransaction,
  syncPaymentStatus,
} from '@/app/actions/payment'
import { trackProductEvent } from '@/lib/product-analytics'

export type PassPackageOption = {
  code: string
  name: string
  description: string | null
  price: number
  currency: string
  durationDays: number | null
}

function rupiah(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  })
    .format(value)
    .replace(/\s+/g, '')
}

function analyticsPackageDays(days: number | null): 30 | 90 | undefined {
  if (days === 30 || days === 90) return days
  return undefined
}

export default function PassPackagesClient({
  level,
  packages,
  hasActivePass = false,
  program = 'tka',
  scopeLabel,
}: {
  /** Jenjang TKA (hanya dipakai bila `program = 'tka'`). */
  level?: string
  packages: PassPackageOption[]
  hasActivePass?: boolean
  /** Program pemilik paket ini; menentukan aksi pembelian & label. */
  program?: 'tka' | 'cpns'
  /** Label cakupan yang ditampilkan, mis. `TKA SMP` atau `CPNS`. */
  scopeLabel?: string
}) {
  const levelLabel = scopeLabel ?? (level ? `TKA ${level}` : 'CPNS')
  const analyticsProgram: 'cpns' | 'tka_sd' | 'tka_smp' | 'tka_sma' =
    program === 'cpns'
      ? 'cpns'
      : String(level ?? '').toLowerCase() === 'sd'
        ? 'tka_sd'
        : String(level ?? '').toLowerCase() === 'sma'
          ? 'tka_sma'
          : 'tka_smp'
  const router = useRouter()
  const [buying, setBuying] = useState<string | null>(null)

  useEffect(() => {
    if (packages.length === 0) return
    trackProductEvent('px_package_view', {
      program: analyticsProgram,
      surface: 'pass',
    })
  }, [packages.length, analyticsProgram])

  const bestValueCode = useMemo(() => {
    const pricedByDay = packages
      .filter((pkg) => (pkg.durationDays ?? 0) > 0)
      .map((pkg) => ({
        code: pkg.code,
        pricePerDay: pkg.price / Number(pkg.durationDays),
      }))
      .sort((a, b) => a.pricePerDay - b.pricePerDay)

    if (pricedByDay.length < 2) return null
    return pricedByDay[0]?.code ?? null
  }, [packages])

  const buy = async (productCode: string, durationDays: number | null) => {
    if (buying) return
    const packageDays = analyticsPackageDays(durationDays)

    trackProductEvent('px_package_select', {
      program: analyticsProgram,
      surface: 'pass',
      package_days: packageDays,
    })

    setBuying(productCode)
    const loadingToast = toast.loading(
      hasActivePass ? 'Menyiapkan perpanjangan akses...' : 'Menyiapkan pembayaran...',
    )
    try {
      const transaction =
        program === 'cpns'
          ? await createPackageTransaction(productCode, '/cpns/dashboard/profile')
          : await createTkaPassTransaction(productCode, String(level))
      if (!transaction.success) {
        toast.error('Pembayaran belum bisa dimulai', {
          id: loadingToast,
          description: transaction.message,
        })
        trackProductEvent('px_checkout_state', {
          program: analyticsProgram,
          surface: 'pass',
          package_days: packageDays,
          payment_state: 'error',
        })
        return
      }

      toast.dismiss(loadingToast)
      if (!window.snap?.pay) {
        toast.error('Pembayaran belum siap dimuat', {
          description: 'Muat ulang halaman lalu coba lagi.',
        })
        trackProductEvent('px_checkout_state', {
          program: analyticsProgram,
          surface: 'pass',
          package_days: packageDays,
          payment_state: 'error',
        })
        return
      }

      trackProductEvent('px_checkout_state', {
        program: analyticsProgram,
        surface: 'pass',
        package_days: packageDays,
        payment_state: 'opened',
      })

      window.snap.pay(transaction.token, {
        onSuccess: async () => {
          trackProductEvent('px_checkout_state', {
            program: analyticsProgram,
            surface: 'pass',
            package_days: packageDays,
            payment_state: 'success',
          })
          const id = toast.loading(
            hasActivePass ? 'Memperpanjang akses...' : 'Mengaktifkan akses...',
          )
          const ok = await syncPaymentStatus(transaction.orderId)
          if (ok) {
            toast.success(
              hasActivePass ? 'Akses berhasil diperpanjang' : 'Akses belajar sudah aktif',
              {
                id,
                description: hasActivePass
                  ? 'Durasi tambahan akan dimulai setelah masa aktif kamu saat ini berakhir.'
                  : 'Kamu sudah bisa menggunakan fitur belajar yang termasuk dalam paket.',
              },
            )
            router.refresh()
          } else {
            trackProductEvent('px_checkout_state', {
              program: analyticsProgram,
              surface: 'pass',
              package_days: packageDays,
              payment_state: 'verifying',
            })
            toast.info('Pembayaran sedang diverifikasi', {
              id,
              description: 'Tunggu sebentar lalu muat ulang halaman untuk melihat status terbaru.',
            })
          }
        },
        onPending: async () => {
          trackProductEvent('px_checkout_state', {
            program: analyticsProgram,
            surface: 'pass',
            package_days: packageDays,
            payment_state: 'pending',
          })
          const id = toast.loading('Memperbarui status pembayaran...')
          await syncPaymentStatus(transaction.orderId)
          toast.info('Menunggu pembayaran', {
            id,
            description: 'Selesaikan pembayaran sesuai petunjuk pada metode yang kamu pilih.',
          })
        },
        onError: () => {
          trackProductEvent('px_checkout_state', {
            program: analyticsProgram,
            surface: 'pass',
            package_days: packageDays,
            payment_state: 'error',
          })
          toast.error('Pembayaran belum berhasil', {
            description: 'Coba lagi atau pilih metode pembayaran lain.',
          })
        },
        onClose: async () => {
          trackProductEvent('px_checkout_state', {
            program: analyticsProgram,
            surface: 'pass',
            package_days: packageDays,
            payment_state: 'closed',
          })
          const id = toast.loading('Memeriksa status pembayaran...')
          await syncPaymentStatus(transaction.orderId)
          toast.info('Pembayaran belum selesai', {
            id,
            description:
              'Tidak ada akses yang diaktifkan sebelum pembayaran berhasil diverifikasi.',
          })
          router.refresh()
        },
      })
    } catch (error) {
      toast.dismiss(loadingToast)
      trackProductEvent('px_checkout_state', {
        program: analyticsProgram,
        surface: 'pass',
        package_days: packageDays,
        payment_state: 'error',
      })
      toast.error('Pembayaran belum bisa dimulai', {
        description: error instanceof Error ? error.message : 'Coba lagi beberapa saat.',
      })
    } finally {
      setBuying(null)
    }
  }

  if (packages.length === 0) return null

  return (
    <section className="space-y-6" aria-labelledby="tka-pass-packages-title">
      <div className="max-w-3xl">
        <div className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
          <Crown size={15} aria-hidden="true" />
          <span>Pilihan Durasi Belajar</span>
        </div>
        <h2
          id="tka-pass-packages-title"
          className="mt-1 text-lg font-semibold text-foreground sm:text-xl"
        >
          {hasActivePass ? `Perpanjang akses ${levelLabel}` : `Pilih akses belajar ${levelLabel}`}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {hasActivePass
            ? 'Lanjutkan persiapanmu dengan durasi tambahan. Perpanjangan dimulai setelah masa aktif saat ini berakhir, sehingga sisa aksesmu tetap utuh.'
            : 'Mulai dengan persiapan satu bulan atau beri diri lebih banyak waktu untuk latihan rutin. Mini Tryout dan Full Tryout tersedia sesuai akses paket selama masa aktif.'}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {packages.map((pkg) => {
          const days = pkg.durationDays ?? 0
          const isBestValue = pkg.code === bestValueCode
          const isBuyingThis = buying === pkg.code

          return (
            <article
              key={pkg.code}
              className={`relative flex h-full flex-col justify-between rounded-xl border bg-white p-5 shadow-xs transition-[border-color,box-shadow] duration-150 hover:shadow-sm ${
                isBestValue
                  ? 'border-primary ring-1 ring-primary/20'
                  : 'border-border hover:border-slate-300'
              }`}
            >
              {/* Best value badge */}
              {isBestValue && (
                <div className="absolute -top-3 right-5">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground">
                    <Crown size={12} />
                    <span>Nilai Terbaik · Rekomendasi</span>
                  </span>
                </div>
              )}

              <div>
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${
                      isBestValue ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    <Crown size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{pkg.name}</h3>
                    <span className="text-xs font-semibold text-slate-500">
                      Akses Penuh {days} Hari
                    </span>
                  </div>
                </div>

                <p className="mt-3 min-h-10 text-sm leading-relaxed text-muted-foreground">
                  {days === 30
                    ? 'Satu bulan untuk mulai rutin, mengenali kemampuan, dan menentukan fokus latihan.'
                    : days === 90
                      ? 'Lebih banyak waktu untuk membangun kebiasaan, mengulang latihan, dan mengevaluasi progres.'
                      : pkg.description ||
                        `Siapkan rencana belajarmu dengan akses ${levelLabel} selama ${days} hari.`}
                </p>

                <div className="mt-4 rounded-lg border border-border bg-muted/50 p-4">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-medium text-muted-foreground">
                        Harga paket
                      </div>
                      <div className="mt-0.5 text-xl font-semibold tabular-nums text-foreground sm:text-2xl">
                        {rupiah(pkg.price)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] font-medium text-muted-foreground">
                        Biaya per hari
                      </div>
                      <div className="mt-0.5 text-base font-semibold tabular-nums text-foreground sm:text-lg">
                        {days > 0 ? rupiah(Math.round(pkg.price / days)) : '—'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="my-5 flex-1 space-y-2 text-xs font-medium text-slate-700">
                  <Benefit icon={<CheckCircle2 size={16} />} text={`Full Tryout ${levelLabel}`} />
                  <Benefit
                    icon={<CheckCircle2 size={16} />}
                    text="Mini Tryout selama paket aktif"
                  />
                  <Benefit icon={<CheckCircle2 size={16} />} text={`Masa aktif ${days} hari`} />
                  <Benefit
                    icon={<ShieldCheck size={16} />}
                    text="Akses aktif setelah pembayaran terverifikasi"
                    blue
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <Button
                  type="button"
                  disabled={Boolean(buying)}
                  aria-busy={isBuyingThis}
                  onClick={() => void buy(pkg.code, pkg.durationDays)}
                  variant={isBestValue ? 'primary' : 'secondary'}
                  size="lg"
                  className="w-full"
                >
                  {isBuyingThis ? (
                    <>
                      <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                      <span>Menyiapkan pembayaran...</span>
                    </>
                  ) : (
                    <>
                      <Zap size={16} aria-hidden="true" />
                      <span>
                        {hasActivePass ? `Perpanjang ${days} hari` : `Pilih ${days} hari`}
                      </span>
                    </>
                  )}
                </Button>
              </div>
            </article>
          )
        })}
      </div>

      <p className="text-sm leading-relaxed text-muted-foreground">
        Pembayaran diproses melalui Midtrans. Akses tidak berubah jika pembayaran dibatalkan atau
        belum terverifikasi.
      </p>
    </section>
  )
}

function Benefit({
  icon,
  text,
  blue = false,
}: {
  icon: React.ReactNode
  text: string
  blue?: boolean
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className={`mt-0.5 shrink-0 ${blue ? 'text-indigo-600' : 'text-emerald-600'}`}>
        {icon}
      </span>
      <span>{text}</span>
    </div>
  )
}
