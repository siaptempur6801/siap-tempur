'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import {
  AlertTriangle,
  Award,
  CreditCard,
  Download,
  Loader2,
  RefreshCw,
  Ticket,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import { claimEventCertificate } from '@/app/actions/event-certificate'
import { createEventPaymentTransaction, syncEventPaymentStatus } from '@/app/actions/event-payment'
import { EventCertificatePreview } from '@/components/certificates/EventCertificatePreview'
import DialogSurface from '@/components/ui/DialogSurface'
import { Button } from '@/components/ui/Button'
import type { UserEvent } from './event-types'
import { formatEventDate } from './event-utils'

// --- Confirm Modal ---
export function ConfirmModal({
  event,
  onConfirm,
  onCancel,
  isLoading,
}: {
  event: UserEvent
  onConfirm: () => void
  onCancel: () => void
  isLoading: boolean
}) {
  return (
    <DialogSurface
      isOpen
      onClose={onCancel}
      dismissible={!isLoading}
      role="alertdialog"
      labelledBy="event-start-title"
      describedBy="event-start-description"
      className="max-w-md"
    >
      <div className="border-b border-border bg-warning-muted px-5 py-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="size-5 shrink-0 text-warning" aria-hidden="true" />
          <h2 id="event-start-title" className="text-lg font-semibold text-foreground">
            Siap Mulai?
          </h2>
        </div>
      </div>
      <div className="space-y-4 p-5">
        <p id="event-start-description" className="text-sm leading-relaxed text-foreground">
          Kamu akan memulai <span className="text-blue-700">{event.title}</span>. Waktu akan
          langsung berjalan begitu kamu mulai!
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border bg-muted/50 p-3 text-center">
            <p className="text-xs font-medium text-muted-foreground">Durasi</p>
            <p className="text-lg font-semibold tabular-nums text-foreground">
              {event.duration_minutes}m
            </p>
          </div>
          <div className="rounded-lg border border-border bg-muted/50 p-3 text-center">
            <p className="text-xs font-medium text-muted-foreground">Soal</p>
            <p className="text-lg font-semibold tabular-nums text-foreground">
              {event.question_count}
            </p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Pastikan koneksi internetmu stabil sebelum mulai.
        </p>
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            data-autofocus
            disabled={isLoading}
            onClick={onCancel}
          >
            Batal
          </Button>
          <Button
            type="button"
            className="flex-1"
            aria-busy={isLoading}
            disabled={isLoading}
            onClick={onConfirm}
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
            {isLoading ? 'Menyiapkan…' : 'Mulai tryout'}
          </Button>
        </div>
      </div>
    </DialogSurface>
  )
}

// ─── Event Payment Modal (Midtrans Snap) ─────────────────────────────────────
export function CertificateModal({
  event,
  onClose,
  onClaimed,
}: {
  event: UserEvent
  onClose: () => void
  onClaimed: (certificateNumber: string) => void
}) {
  const [name, setName] = useState(event.certificate_name || '')
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const nameInputRef = useRef<HTMLInputElement>(null)
  const previewName = name.replace(/\s+/g, ' ').trim() || 'Nama Lengkap Peserta'

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Masukkan nama lengkap yang akan dicetak di sertifikat.')
      nameInputRef.current?.focus()
      return
    }

    if (!confirmed) {
      setError('Centang konfirmasi bahwa nama sudah benar.')
      return
    }

    startTransition(async () => {
      const result = await claimEventCertificate(event.id, name)
      if (!result.success || !result.certificateNumber) {
        setError(result.message || 'Gagal membuat sertifikat.')
        return
      }

      toast.success(result.message || 'Nama sertifikat tersimpan.')
      onClaimed(result.certificateNumber)
    })
  }

  return (
    <DialogSurface
      isOpen
      onClose={onClose}
      dismissible={!isPending}
      labelledBy="event-certificate-title"
      className="max-w-3xl"
    >
      <form onSubmit={submit} aria-busy={isPending}>
        <div className="flex items-center gap-3 border-b border-border bg-success-muted px-5 py-4">
          <Award className="size-5 text-success" aria-hidden="true" />
          <h2 id="event-certificate-title" className="text-lg font-semibold text-foreground">
            Nama Sertifikat
          </h2>
        </div>
        <div className="space-y-5 p-5">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Event</p>
            <p className="mt-1 text-base font-semibold leading-snug text-foreground">
              {event.title}
            </p>
          </div>
          <label className="block">
            <span className="text-sm font-medium text-foreground">
              Nama lengkap sesuai sertifikat
            </span>
            <input
              ref={nameInputRef}
              value={name}
              onChange={(inputEvent) => {
                setName(inputEvent.target.value)
                setError(null)
              }}
              maxLength={100}
              autoComplete="name"
              required
              aria-invalid={Boolean(error && !name.trim())}
              aria-describedby={error && !name.trim() ? 'event-certificate-error' : undefined}
              placeholder="Masukkan nama lengkap"
              className="st-input mt-2 w-full"
            />
          </label>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-muted-foreground">Preview sebelum dikunci</p>
              <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                Pratinjau
              </span>
            </div>
            {event.certificate_number ? (
              <EventCertificatePreview
                certificateNumber={event.certificate_number}
                previewName={previewName}
              />
            ) : (
              <div className="rounded-lg border border-warning-border bg-warning-muted p-4 text-sm text-warning">
                Snapshot sertifikat belum tersedia. Simpan nama akan membuat sertifikat berdasarkan
                data ranking final.
              </div>
            )}
          </div>
          <label className="flex items-start gap-3 rounded-lg border border-warning-border bg-warning-muted p-3 text-sm text-warning">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(inputEvent) => {
                setConfirmed(inputEvent.target.checked)
                setError(null)
              }}
              aria-invalid={Boolean(error && !confirmed)}
              aria-describedby={error && !confirmed ? 'event-certificate-error' : undefined}
              className="mt-1 h-4 w-4 shrink-0"
            />
            <span>
              Nama yang sudah disimpan akan dicetak pada sertifikat dan tidak bisa diedit lagi oleh
              user. Pastikan ejaan, gelar, dan spasi sudah benar.
            </span>
          </label>
          {error && (
            <p
              id="event-certificate-error"
              role="alert"
              className="rounded-lg border border-danger-border bg-danger-muted px-4 py-3 text-sm text-danger"
            >
              {error}
            </p>
          )}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              data-autofocus
              disabled={isPending}
              onClick={onClose}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="success"
              className="flex-1"
              disabled={isPending}
              aria-busy={isPending}
            >
              {isPending ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
              {isPending ? 'Menyimpan…' : 'Simpan nama'}
            </Button>
          </div>
        </div>
      </form>
    </DialogSurface>
  )
}

export function EventPaymentModal({
  event,
  onClose,
  onSuccess,
}: {
  event: UserEvent
  onClose: () => void
  onSuccess: () => void
}) {
  const [isLoading, setIsLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(event.payment_order_id)
  const [pendingSnapToken, setPendingSnapToken] = useState<string | null>(event.payment_snap_token)
  const [shouldRefreshPendingToken, setShouldRefreshPendingToken] = useState(
    Boolean(event.payment_snap_token),
  )
  const [isCheckingStatus, setIsCheckingStatus] = useState(false)

  // Load Midtrans Snap script
  useEffect(() => {
    if (document.getElementById('midtrans-snap-script')) {
      setIsLoading(false)
      return
    }
    const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || ''
    const isSandbox = !clientKey || clientKey.includes('SB-')
    const script = document.createElement('script')
    script.id = 'midtrans-snap-script'
    script.src = isSandbox
      ? 'https://app.sandbox.midtrans.com/snap/snap.js'
      : 'https://app.midtrans.com/snap/snap.js'
    script.setAttribute('data-client-key', clientKey)
    script.onload = () => setIsLoading(false)
    script.onerror = () => {
      setIsLoading(false)
      setError('Gagal memuat sistem pembayaran')
    }
    document.head.appendChild(script)
  }, [])

  const openSnapPayment = (token: string, orderId = pendingOrderId) => {
    if (!window.snap) {
      setError('Sistem pembayaran belum siap. Muat ulang halaman.')
      return
    }

    setError(null)
    window.snap.pay(token, {
      onSuccess: async () => {
        if (!orderId) {
          setError('Pembayaran diterima. Periksa status transaksi sebelum menganggap tiket aktif.')
          return
        }
        try {
          const result = await syncEventPaymentStatus(orderId)
          if (result.registered) {
            toast.success(result.message || 'Pembayaran terverifikasi dan kamu sudah terdaftar.')
            onSuccess()
          } else {
            toast.info(
              result.message || 'Pembayaran sedang diverifikasi. Cek status lagi sebentar.',
            )
          }
        } catch {
          toast.info('Pembayaran sedang diverifikasi. Cek status lagi sebentar.')
        }
      },
      onPending: async () => {
        if (orderId) await syncEventPaymentStatus(orderId).catch(() => undefined)
        toast.info(
          'Pembayaran masih menunggu konfirmasi. Tiket aktif setelah status terverifikasi.',
        )
      },
      onError: () => {
        toast.error('Pembayaran gagal. Coba lagi.')
      },
      onClose: () => {
        toast('Pembayaran dibatalkan.')
      },
    })
  }

  const handleBuy = () => {
    if (pendingSnapToken && !shouldRefreshPendingToken) {
      openSnapPayment(pendingSnapToken, pendingOrderId)
      return
    }

    startTransition(async () => {
      try {
        const result = await createEventPaymentTransaction(event.id, {
          refreshPending: shouldRefreshPendingToken,
        })
        if (!result.success) {
          setError(result.message)
          return
        }
        setPendingOrderId(result.orderId)
        setPendingSnapToken(result.token)
        setShouldRefreshPendingToken(false)
        openSnapPayment(result.token, result.orderId)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Gagal membuat transaksi'
        setError(msg)
      }
    })
  }

  const handleCheckStatus = async () => {
    if (!pendingOrderId) return
    setIsCheckingStatus(true)
    try {
      const result = await syncEventPaymentStatus(pendingOrderId)
      if (result.registered) {
        toast.success(result.message)
        onSuccess()
      } else {
        toast.info(result.message)
      }
    } catch {
      setError('Status pembayaran belum bisa diperiksa. Coba lagi sebentar.')
    } finally {
      setIsCheckingStatus(false)
    }
  }

  return (
    <DialogSurface
      isOpen
      onClose={onClose}
      dismissible={!isPending && !isLoading && !isCheckingStatus}
      labelledBy="event-payment-title"
      describedBy="event-payment-description"
      className="max-w-md"
    >
      <div className="flex items-center gap-3 border-b border-border bg-warning-muted px-5 py-4">
        <Ticket className="size-5 text-warning" aria-hidden="true" />
        <h2 id="event-payment-title" className="text-lg font-semibold text-foreground">
          Beli tiket event
        </h2>
      </div>
      <div className="space-y-5 p-5">
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">Event</p>
          <p
            id="event-payment-description"
            className="text-base font-semibold leading-snug text-foreground"
          >
            {event.title}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border bg-muted/50 p-3 text-center">
            <p className="text-xs font-medium text-muted-foreground">Mulai</p>
            <p className="text-sm font-semibold text-foreground">
              {formatEventDate(event.starts_at)}
            </p>
          </div>
          <div className="rounded-lg border border-warning-border bg-warning-muted p-3 text-center">
            <p className="text-xs font-medium text-warning">Harga tiket</p>
            <p className="text-lg font-semibold tabular-nums text-foreground">
              Rp {event.price.toLocaleString('id-ID')}
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Pembayaran via QRIS. Tidak ada biaya tambahan.
        </p>
        {error && (
          <p
            role="alert"
            className="rounded-lg border border-danger-border bg-danger-muted px-4 py-3 text-sm text-danger"
          >
            {error}
          </p>
        )}
        {pendingOrderId && (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleCheckStatus}
            disabled={isCheckingStatus}
            aria-busy={isCheckingStatus}
          >
            {isCheckingStatus ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <RefreshCw size={14} />
            )}
            {isCheckingStatus ? 'Memeriksa status…' : 'Cek status pembayaran'}
          </Button>
        )}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            data-autofocus
            disabled={isPending || isLoading || isCheckingStatus}
            onClick={onClose}
          >
            Tutup
          </Button>
          <Button
            type="button"
            variant="warning"
            className="flex-1"
            onClick={handleBuy}
            disabled={isPending || isLoading || isCheckingStatus}
            aria-busy={isPending || isLoading}
          >
            {isPending || isLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <CreditCard size={18} />
            )}
            {isLoading
              ? 'Memuat...'
              : shouldRefreshPendingToken
                ? 'Buat QRIS Baru'
                : 'Bayar Sekarang'}
          </Button>
        </div>
      </div>
    </DialogSurface>
  )
}
