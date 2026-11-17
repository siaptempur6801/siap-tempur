'use client'

import { useId } from 'react'
import DialogSurface from '@/components/ui/DialogSurface'
import { Button } from '@/components/ui/Button'
import { Ticket, X } from 'lucide-react'
import { TRYOUT_TOKEN_COST } from '@/lib/constants'
import { LoadingSpinner } from '@/components/ui/LoadingState'

type TokenUsageConfirmModalProps = {
  isOpen: boolean
  heading?: string
  title: string
  description: string
  details: Array<{ label: string; value: string | number }>
  quota: number
  tokenCost?: number
  confirmLabel?: string
  isLoading: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function TokenUsageConfirmModal({
  isOpen,
  heading = 'Konfirmasi Token',
  title,
  description,
  details,
  quota,
  tokenCost = TRYOUT_TOKEN_COST,
  confirmLabel = `Gunakan ${tokenCost} Token`,
  isLoading,
  onConfirm,
  onCancel,
}: TokenUsageConfirmModalProps) {
  const titleId = useId()
  const descriptionId = useId()
  const remainingQuota = Math.max(0, quota - tokenCost)

  return (
    <DialogSurface
      isOpen={isOpen}
      onClose={onCancel}
      labelledBy={titleId}
      describedBy={descriptionId}
      dismissible={!isLoading}
      className="max-w-md flex-col overflow-y-hidden border border-slate-200 font-body open:flex"
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-3">
          <Ticket className="h-5 w-5 shrink-0 text-amber-800" aria-hidden="true" />
          <h2 id={titleId} className="text-lg font-bold text-gray-900">
            {heading}
          </h2>
        </div>
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          aria-label="Tutup dialog"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-50"
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      <div
        role="region"
        aria-label="Ringkasan sesi dan token"
        tabIndex={0}
        className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 sm:p-5"
        aria-busy={isLoading}
      >
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
          <p id={descriptionId} className="text-sm font-medium leading-relaxed text-gray-600">
            {description}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 font-sans">
          {details.map((detail) => (
            <div
              key={detail.label}
              className="min-w-0 rounded-xl border border-gray-200 bg-gray-50 p-3 text-center"
            >
              <p className="text-xs font-semibold text-slate-600">{detail.label}</p>
              <p className="mt-1 break-words text-xl font-bold text-gray-900">{detail.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 font-sans">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
            <div className="flex items-center gap-2 text-blue-700">
              <Ticket size={16} />
              <p className="text-sm font-semibold">Saldo saat ini</p>
            </div>
            <p className="mt-1 text-xl font-bold text-gray-900">{quota}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm font-semibold text-slate-600">Sisa setelah sesi baru</p>
            <p className="mt-1 text-xl font-bold text-gray-900">{remainingQuota}</p>
          </div>
        </div>

        <p className="rounded-xl border border-border bg-muted px-3 py-2 text-sm leading-relaxed text-muted-foreground">
          Token dipakai saat sesi baru berhasil dimulai. Melanjutkan sesi yang masih berjalan tidak
          memakai token tambahan.
        </p>
      </div>
      <div className="flex shrink-0 flex-col gap-3 border-t border-slate-200 p-4 sm:flex-row sm:px-5">
        <Button
          type="button"
          variant="outline"
          data-autofocus
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1"
        >
          Batal
        </Button>
        <Button type="button" onClick={onConfirm} disabled={isLoading} className="flex-1">
          {isLoading ? <LoadingSpinner label="Memulai sesi" /> : <Ticket size={18} />}
          {isLoading ? 'Memulai...' : confirmLabel}
        </Button>
      </div>
    </DialogSurface>
  )
}
