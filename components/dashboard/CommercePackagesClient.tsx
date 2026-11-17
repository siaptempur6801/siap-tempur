'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  CheckCircle2,
  Coins,
  Copy,
  ExternalLink,
  Loader2,
  Package,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Wallet,
  Zap,
} from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import { negativeTokenBalanceNote } from '@/lib/token-balance'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'
import {
  createPackageTransaction,
  createQrisQaTransaction,
  syncPaymentStatus,
  type CreateQrisQaTransactionResult,
} from '@/app/actions/payment'

export type CommercePackage = {
  code: string
  name: string
  description: string | null
  price: number
  currency: string
  tokenGrant: number
}

type QrisQaData = Extract<CreateQrisQaTransactionResult, { success: true }>

function rupiah(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  })
    .format(value)
    .replace(/\s+/g, '')
}

export default function CommercePackagesClient({
  packages,
  qaQrisEnabled = false,
  program = 'CPNS',
  level,
  tokenBalance,
}: {
  packages: CommercePackage[]
  qaQrisEnabled?: boolean
  program?: 'CPNS' | 'TKA'
  level?: string
  tokenBalance?: number
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [qaQris, setQaQris] = useState<QrisQaData | null>(null)
  const [buying, setBuying] = useState<string | null>(null)

  const bestValueCode = useMemo(() => {
    const ranked = packages
      .filter((pkg) => pkg.tokenGrant > 0)
      .map((pkg) => ({ code: pkg.code, unitPrice: pkg.price / pkg.tokenGrant }))
      .sort((a, b) => a.unitPrice - b.unitPrice)
    if (ranked.length < 2) return null
    return ranked[0]?.code ?? null
  }, [packages])

  const unitPackage = packages
    .filter((pkg) => pkg.tokenGrant > 0)
    .sort((a, b) => a.tokenGrant - b.tokenGrant)[0]
  const referenceUnitPrice = unitPackage ? unitPackage.price / unitPackage.tokenGrant : 0

  const handleBuy = async (productCode: string) => {
    if (buying) return
    setBuying(productCode)
    const loadingToast = toast.loading('Menyiapkan pembayaran...')
    try {
      const returnPath =
        program === 'TKA'
          ? `${pathname.replace(/\/beli-token$/, '/profile')}?tab=history`
          : '/cpns/dashboard/profile'
      const transaction = await createPackageTransaction(productCode, returnPath)
      if (!transaction.success) {
        toast.error('Pembayaran belum bisa dimulai', {
          id: loadingToast,
          description: transaction.message,
        })
        return
      }

      toast.dismiss(loadingToast)
      if (!window.snap?.pay) {
        toast.error('Pembayaran belum siap dimuat', {
          description: 'Muat ulang halaman lalu coba lagi.',
        })
        return
      }

      window.snap.pay(transaction.token, {
        onSuccess: async () => {
          const id = toast.loading('Memverifikasi pembayaran...')
          const ok = await syncPaymentStatus(transaction.orderId)
          if (ok) {
            toast.success('Pembayaran berhasil', {
              id,
              description: 'Token akan tersedia di akunmu setelah pembayaran terverifikasi.',
            })
            router.refresh()
          } else {
            toast.info('Pembayaran sedang diverifikasi', {
              id,
              description: 'Tunggu sebentar lalu muat ulang halaman untuk melihat status terbaru.',
            })
          }
        },
        onPending: async () => {
          const id = toast.loading('Memperbarui status pembayaran...')
          await syncPaymentStatus(transaction.orderId)
          toast.info('Menunggu pembayaran', {
            id,
            description: 'Selesaikan pembayaran sesuai petunjuk pada metode yang kamu pilih.',
          })
        },
        onError: () => {
          toast.error('Pembayaran belum berhasil', {
            description: 'Coba lagi atau pilih metode pembayaran lain.',
          })
        },
        onClose: async () => {
          const id = toast.loading('Memeriksa status pembayaran...')
          await syncPaymentStatus(transaction.orderId)
          toast.info('Pembayaran belum selesai', {
            id,
            description: 'Token tidak ditambahkan sebelum pembayaran berhasil diverifikasi.',
          })
          router.refresh()
        },
      })
    } catch (error) {
      toast.dismiss(loadingToast)
      toast.error('Pembayaran belum bisa dimulai', {
        description: error instanceof Error ? error.message : 'Coba lagi beberapa saat.',
      })
    } finally {
      setBuying(null)
    }
  }

  const handleQaQris = async (productCode: string) => {
    const loadingToast = toast.loading('Membuat QRIS Sandbox QA...')
    try {
      const transaction = await createQrisQaTransaction(productCode)
      if (!transaction.success) {
        toast.error('QRIS QA gagal dibuat', { id: loadingToast, description: transaction.message })
        return
      }
      setQaQris(transaction)
      toast.success('QRIS Sandbox QA siap', { id: loadingToast })
    } catch (error) {
      toast.error('QRIS QA gagal dibuat', {
        id: loadingToast,
        description: error instanceof Error ? error.message : 'Terjadi kesalahan.',
      })
    }
  }

  const copyQrisUrl = async () => {
    if (!qaQris) return
    try {
      await navigator.clipboard.writeText(qaQris.qrImageUrl)
      toast.success('Code Img URL disalin')
    } catch {
      toast.error('Browser gagal menyalin URL.')
    }
  }

  const openSimulator = async () => {
    if (!qaQris) return
    window.open(qaQris.simulatorUrl, '_blank', 'noopener,noreferrer')
    try {
      await navigator.clipboard.writeText(qaQris.qrImageUrl)
      toast.success('Simulator dibuka dan URL QR disalin')
    } catch {
      toast.info('Simulator dibuka. Salin URL QR secara manual dari panel.')
    }
  }

  const checkQaStatus = async () => {
    if (!qaQris) return
    const id = toast.loading('Sinkronisasi status Midtrans...')
    const ok = await syncPaymentStatus(qaQris.orderId)
    if (ok) {
      toast.success('Status pembayaran sudah disinkronkan', { id })
      router.refresh()
    } else {
      toast.error('Gagal sinkronisasi status', { id })
    }
  }

  const effectiveLevel = level || 'SMP'

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header Section */}
      <PageHeader
        eyebrow={
          <>
            <Coins size={14} aria-hidden="true" />{' '}
            {program === 'TKA' ? `Beli Token · TKA ${effectiveLevel}` : 'Beli Paket Token CPNS'}
          </>
        }
        title={program === 'TKA' ? 'Beli Token TKA' : 'Beli paket token Tryout SKD CPNS'}
        description={
          program === 'TKA'
            ? 'Pilih jumlah token sesuai kebutuhanmu. Gunakan untuk Tryout, Mini Tryout, atau Latihan Fokus saat memulai sesi baru.'
            : 'Pilih token sesuai ritme tryout-mu. Token digunakan untuk akses simulasi CAT SKD dan drilling materi berstandar nasional.'
        }
      />

      {/* Quick Context & Stat Tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <div className="col-span-2 flex items-center gap-3 rounded-xl border border-border-strong bg-card p-4 sm:col-span-1">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary-muted text-primary">
            <Wallet size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">
              {program === 'TKA' ? 'Saldo Token TKA' : 'Saldo akun'}
            </p>
            <p className="text-xl font-semibold tabular-nums text-foreground">
              {tokenBalance !== undefined ? `${tokenBalance} token` : 'Lihat saldo di profil'}
            </p>
            {negativeTokenBalanceNote(tokenBalance) && (
              <p className="text-xs text-danger">{negativeTokenBalanceNote(tokenBalance)}</p>
            )}
            <Link
              href={
                program === 'TKA'
                  ? `/tka/${effectiveLevel.toLowerCase()}/profile?tab=history`
                  : '/cpns/dashboard/profile'
              }
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Lihat riwayat transaksi →
            </Link>
          </div>
        </div>

        <div className="flex flex-col items-start gap-3 rounded-xl border border-border-strong bg-card p-4 sm:flex-row sm:items-center">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-success-muted text-success">
            <Sparkles size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">
              {program === 'TKA' ? 'Pemakaian token' : 'Masa berlaku'}
            </p>
            <p className="text-sm font-semibold text-foreground">
              {program === 'TKA' ? 'Hanya untuk sesi baru' : 'Aktif selamanya'}
            </p>
            <p className="text-sm text-muted-foreground">
              {program === 'TKA'
                ? 'Lanjutkan sesi aktif tanpa token tambahan'
                : 'Tanpa batas waktu kedaluwarsa'}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-start gap-3 rounded-xl border border-border-strong bg-card p-4 sm:flex-row sm:items-center">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-info-muted text-info">
            <ShieldCheck size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">Verifikasi pembayaran</p>
            <p className="text-sm font-semibold text-foreground">Otomatis dan aman</p>
            <p className="text-xs text-muted-foreground">
              QRIS, VA Bank, dan e-wallet via Midtrans
            </p>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {packages.length === 0 ? (
        <section className="rounded-xl border border-dashed border-border-strong bg-card p-8 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Package size={24} />
          </div>
          <h2 className="mt-3 text-lg font-semibold text-foreground">Paket token belum tersedia</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Coba kembali nanti untuk melihat pilihan paket token.
          </p>
        </section>
      ) : (
        /* Packages Grid */
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg) => {
            const saving =
              referenceUnitPrice > 0 && pkg.tokenGrant > 0
                ? Math.max(0, Math.round(referenceUnitPrice * pkg.tokenGrant - pkg.price))
                : 0
            const isBestValue = pkg.code === bestValueCode
            const isBuying = buying === pkg.code

            return (
              <article
                key={pkg.code}
                className={`relative flex flex-col justify-between rounded-xl border bg-card p-5 transition-colors ${
                  isBestValue
                    ? 'border-primary ring-1 ring-primary/20'
                    : 'border-border-strong hover:border-primary'
                }`}
              >
                {/* Best Value Top Badge */}
                {isBestValue && (
                  <div className="absolute -top-3 right-5">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                      <Sparkles size={12} />
                      <span>Nilai Terbaik · Paling Hemat</span>
                    </span>
                  </div>
                )}

                <div>
                  {/* Card Header */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex size-11 shrink-0 items-center justify-center rounded-lg ${
                        isBestValue
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <Coins size={22} />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">{pkg.name}</h2>
                      <span className="text-xs font-medium text-muted-foreground">
                        {pkg.tokenGrant} Token Siap Pakai
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="mt-3 min-h-10 text-sm leading-relaxed text-muted-foreground">
                    {program === 'TKA'
                      ? pkg.code === unitPackage?.code
                        ? 'Mulai secukupnya, fokus pada sesi latihan yang paling kamu perlukan.'
                        : 'Siapkan bekal untuk latihan berikutnya dan bangun ritme belajar yang konsisten.'
                      : pkg.description || `${pkg.tokenGrant} token untuk akses simulasi tryout.`}
                  </p>

                  {/* Price & Unit Metric */}
                  <div className="mt-4 rounded-lg border border-border bg-muted/50 p-4">
                    <p className="text-xs font-medium text-muted-foreground">Total harga</p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
                      {rupiah(pkg.price)}
                    </p>
                    <p className="mt-0.5 text-xs font-medium text-slate-600">
                      {pkg.tokenGrant} token · sekitar{' '}
                      <b className="font-semibold text-foreground">
                        {rupiah(Math.round(pkg.price / pkg.tokenGrant))}
                      </b>
                      /token
                    </p>
                  </div>

                  {/* Saving Pill */}
                  {saving > 0 && (
                    <div className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-lg bg-success-muted px-2.5 py-1 text-xs font-medium text-success">
                      <Sparkles size={13} />
                      <span>Hemat {rupiah(saving)} dibanding paket satuan</span>
                    </div>
                  )}

                  {/* Benefits List */}
                  <div className="my-5 flex-1 space-y-2 text-sm text-muted-foreground">
                    <Benefit
                      text={`${pkg.tokenGrant} token otomatis masuk ke akun setelah pembayaran`}
                    />
                    <Benefit
                      text={
                        program === 'TKA'
                          ? 'Untuk Tryout, Mini Tryout, dan Latihan Fokus'
                          : 'Digunakan untuk simulasi Tryout CAT & drilling materi'
                      }
                    />
                    <Benefit text="Sisa token tersimpan aman tanpa masa kedaluwarsa" />
                  </div>
                </div>

                {/* Purchase Action Button */}
                <div className="space-y-2.5 border-t border-border pt-4">
                  <Button
                    type="button"
                    onClick={() => handleBuy(pkg.code)}
                    disabled={Boolean(buying)}
                    aria-busy={isBuying}
                    variant={isBestValue ? 'primary' : 'secondary'}
                    size="lg"
                    className="w-full"
                  >
                    {isBuying ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Menyiapkan pembayaran...</span>
                      </>
                    ) : (
                      <>
                        <Zap size={16} />
                        <span>Beli {pkg.tokenGrant} Token</span>
                      </>
                    )}
                  </Button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {/* Reassurance Footer Notice */}
      <section className="rounded-xl border border-info-border bg-info-muted/50 p-4 text-sm text-info sm:p-5">
        <div className="flex items-start gap-3.5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-info-muted text-info">
            <ShieldCheck size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">
              {program === 'TKA'
                ? 'Token masuk setelah pembayaran berhasil'
                : 'Token Masuk Otomatis Setelah Pembayaran'}
            </h3>
            <p className="mt-1 leading-relaxed text-muted-foreground">
              {program === 'TKA'
                ? 'Pilih metode pembayaran yang tersedia dan ikuti petunjuknya. Token ditambahkan setelah pembayaran terkonfirmasi. Kamu bisa memeriksa statusnya di riwayat transaksi.'
                : 'Jika pembayaran masih menunggu atau ditutup sebelum selesai, saldo token tidak berubah. Status terbaru akan otomatis diperbarui setelah pembayaran berhasil diverifikasi.'}
            </p>
          </div>
        </div>
      </section>

      {qaQrisEnabled && (
        <details className="rounded-xl border border-border-strong bg-card">
          <summary className="st-focus min-h-11 cursor-pointer rounded-xl px-4 py-3 text-sm font-semibold text-muted-foreground">
            Pengujian pembayaran · khusus admin
          </summary>
          <div className="space-y-4 border-t border-border p-4">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Uji pembayaran QRIS di sandbox tanpa transaksi uang asli. Pilih paket yang ingin
              diuji. Bagian ini hanya terlihat oleh admin yang memiliki izin pengujian.
            </p>
            <div className="flex flex-wrap gap-3">
              {packages.map((pkg) => (
                <Button
                  key={pkg.code}
                  type="button"
                  onClick={() => handleQaQris(pkg.code)}
                  disabled={Boolean(buying)}
                  variant="warning"
                >
                  <QrCode size={16} aria-hidden="true" />
                  Uji QRIS · {pkg.tokenGrant} token
                </Button>
              ))}
            </div>
            {/* Staging Simulator Panel */}
            {qaQris && (
              <section className="rounded-xl border border-border-strong bg-card p-5 sm:p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
                  <div>
                    <span className="text-xs font-medium text-warning">Staging QA Simulator</span>
                    <h2 className="text-lg font-semibold text-foreground">
                      QRIS Sandbox siap disimulasikan
                    </h2>
                  </div>
                  <div className="rounded-xl bg-amber-50 px-3 py-1.5 text-sm font-bold text-amber-900 ring-1 ring-amber-200">
                    {rupiah(qaQris.amount)}
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-[240px_1fr]">
                  <div className="rounded-lg border border-border-strong bg-background p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qaQris.qrImageUrlV2 || qaQris.qrImageUrl}
                      alt="QRIS Sandbox QA"
                      className="h-auto w-full rounded-lg"
                    />
                  </div>
                  <div className="space-y-3.5">
                    <div>
                      <span className="text-xs font-medium text-muted-foreground">Order ID</span>
                      <code className="mt-1 block break-all rounded-lg border border-border bg-muted/50 p-2 text-xs font-mono text-foreground">
                        {qaQris.orderNumber}
                      </code>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-muted-foreground">
                        URL gambar QR
                      </span>
                      <div className="mt-1 flex gap-2">
                        <input
                          readOnly
                          value={qaQris.qrImageUrl}
                          className="st-input min-w-0 flex-1 text-xs"
                          aria-label="URL gambar QR"
                        />
                        <Button
                          type="button"
                          onClick={copyQrisUrl}
                          variant="outline"
                          size="sm"
                          title="Salin URL QR"
                          aria-label="Salin URL gambar QR"
                        >
                          <Copy size={14} /> Salin
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2.5 sm:flex-row pt-1">
                      <Button
                        type="button"
                        onClick={openSimulator}
                        variant="success"
                        size="sm"
                        className="flex-1"
                      >
                        <ExternalLink size={14} /> Buka Simulator QRIS
                      </Button>
                      <Button
                        type="button"
                        onClick={checkQaStatus}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        <RefreshCw size={14} /> Sinkronkan Status
                      </Button>
                    </div>
                    <p className="rounded-lg bg-amber-50 p-2.5 text-xs text-amber-900 border border-amber-200/60">
                      Gunakan hanya Sandbox Simulator resmi Midtrans. Jangan scan QR Sandbox dengan
                      aplikasi e-wallet nyata.
                    </p>
                  </div>
                </div>
              </section>
            )}
          </div>
        </details>
      )}
    </div>
  )
}

function Benefit({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
      <span>{text}</span>
    </div>
  )
}
