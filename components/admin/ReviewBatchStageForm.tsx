'use client'

import {
  adminDangerButtonClass,
  adminInputClass,
  adminSuccessButtonClass,
  adminWarningButtonClass,
} from '@/components/admin/AdminUi'
import { useAdminConfirm } from '@/components/admin/useAdminConfirm'
import { STAGE_LABEL, type ReviewStage } from '@/lib/review-batch'
import { cn } from '@/lib/utils'
import { CheckCircle2, Clock3, XCircle } from 'lucide-react'
import { useState, useTransition, type FormEvent } from 'react'
import { toast } from 'sonner'

/**
 * Langkah 2 panel review massal: putuskan SATU tahap untuk seluruh batch.
 *
 * Form ini sengaja klien (bukan form server polos) karena dua alasan:
 *   1. keputusan batch, termasuk menyetujui puluhan soal sekaligus, perlu
 *      dialog konfirmasi yang menyebut jumlah dan akibatnya;
 *   2. catatan wajib diisi untuk keputusan itu, sedangkan `Setujui` boleh tanpa
 *      catatan — aturan per-tombol yang tidak bisa diungkapkan atribut `required`
 *      biasa (atribut itu berlaku untuk semua tombol submit).
 *
 * Pengaman sebenarnya tetap di server: `reviewReviewBatchStageAction` menolak
 * keputusan non-approve tanpa catatan, dan RPC massal tetap menegakkan
 * permission serta aturan "author != reviewer".
 */
export default function ReviewBatchStageForm({
  action,
  batch,
  program,
  track,
  stage,
  stageNumber,
  activeCount,
  activeStages,
  highlight = false,
}: {
  action: (formData: FormData) => void | Promise<void>
  batch: string
  program: string
  track: string
  stage: ReviewStage
  /** Posisi tahap dalam alur 1-3, mis. Akademik = 2. */
  stageNumber: number
  activeCount: number
  activeStages: ReviewStage[]
  /** True bila langkah ini yang disarankan panel. */
  highlight?: boolean
}) {
  const { confirm, dialog } = useAdminConfirm()
  const [notes, setNotes] = useState('')
  const [pending, startTransition] = useTransition()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null
    const decision = submitter?.value ?? ''
    if (decision !== 'approve' && decision !== 'revision_required' && decision !== 'reject') return
    if (decision !== 'approve' && !notes.trim()) {
      toast.error('Catatan wajib diisi untuk Tolak atau Minta revisi.')
      return
    }
    const rejecting = decision === 'reject'
    const revising = decision === 'revision_required'
    const confirmed = await confirm({
      title: rejecting
        ? `Tolak ${activeCount} soal pada tahap ini?`
        : revising
          ? `Minta revisi ${activeCount} soal pada tahap ini?`
          : `Setujui ${activeCount} soal pada tahap ini?`,
      message: rejecting
        ? 'Soal dikeluarkan dari alur review dan tidak akan terbit sampai diajukan ulang.'
        : revising
          ? 'Soal dikembalikan ke penulis untuk diperbaiki sebelum masuk review lagi.'
          : 'Setiap soal maju satu tahap review. Soal belum langsung diterbitkan.',
      detail: `Keputusan berlaku untuk ${activeCount} soal pada tahap aktif${activeStages.length > 1 ? ` (${activeStages.map((key) => STAGE_LABEL[key]).join(' + ')})` : ''}.`,
      confirmLabel: rejecting
        ? `Tolak ${activeCount} soal`
        : revising
          ? `Minta revisi ${activeCount} soal`
          : `Setujui ${activeCount} soal`,
      danger: rejecting,
    })
    if (!confirmed) return
    const data = new FormData(form)
    // `new FormData(form)` tidak memuat tombol submitter, jadi keputusan
    // ditulis eksplisit — sama dengan nilai tombol yang diklik.
    data.set('decision', decision)
    data.set('notes', notes)
    startTransition(() => action(data))
  }

  const mixed = activeStages.length > 1

  return (
    <>
      {dialog}
      <form
        action={action}
        onSubmit={handleSubmit}
        className={cn(
          'rounded-lg border p-4',
          highlight ? 'border-info-border bg-info-muted/60' : 'border-info-border bg-info-muted/40',
        )}
      >
        <input type="hidden" name="batch" value={batch} />
        <input type="hidden" name="program_code" value={program} />
        <input type="hidden" name="track_code" value={track} />
        <input type="hidden" name="stage" value={stage} />
        <h3 className="text-sm font-semibold text-foreground">
          Langkah 2 · Tahap {stageNumber} dari 3
          {mixed
            ? ` — aktif: ${activeStages.map((key) => STAGE_LABEL[key]).join(' + ')}`
            : ` — ${STAGE_LABEL[stage]}`}
        </h3>
        <p className="mt-0.5 text-xs font-medium text-muted-foreground">
          Berlaku untuk {activeCount} soal pada tahap aktif. Setiap soal naik SATU tahap, lalu klaim
          reviewer dikosongkan — panel ini mengklaim ulang otomatis, jadi satu klik per tahap.
        </p>
        {mixed ? (
          <p className="mt-2 rounded-lg border border-warning-border bg-warning-muted px-3 py-2 text-[11px] font-semibold leading-5 text-warning">
            Batch tidak seragam: {activeStages.map((key) => STAGE_LABEL[key]).join(' dan ')}{' '}
            berjalan bersamaan. Satu klik memajukan setiap soal satu tahap sesuai posisinya
            masing-masing — batch akan menyeragamkan diri setelah beberapa klik.
          </p>
        ) : null}
        <label
          htmlFor="review-batch-notes"
          className="mt-3 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
        >
          Catatan review{' '}
          <span className="normal-case text-muted-foreground">
            (wajib untuk Tolak / Minta revisi)
          </span>
        </label>
        <textarea
          id="review-batch-notes"
          className={`${adminInputClass} mt-1 min-h-20 resize-y`}
          name="notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Catatan untuk seluruh batch (opsional bila menyetujui)..."
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="submit"
            name="decision"
            value="approve"
            disabled={pending}
            className={adminSuccessButtonClass}
          >
            <CheckCircle2 size={16} />
            Setujui {activeCount} soal
          </button>
          <button
            type="submit"
            name="decision"
            value="revision_required"
            disabled={pending}
            className={adminWarningButtonClass}
          >
            <Clock3 size={16} />
            Revisi {activeCount} soal
          </button>
          <button
            type="submit"
            name="decision"
            value="reject"
            disabled={pending}
            className={adminDangerButtonClass}
          >
            <XCircle size={16} />
            Tolak {activeCount} soal
          </button>
        </div>
      </form>
    </>
  )
}
