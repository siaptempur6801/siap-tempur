'use client'

import { decideContentReviewAction } from '@/app/actions/content-review'
import {
  AdminField,
  adminDangerButtonClass,
  adminInputClass,
  adminSuccessButtonClass,
  adminWarningButtonClass,
} from '@/components/admin/AdminUi'
import { useAdminConfirm } from '@/components/admin/useAdminConfirm'
import { CheckCircle2, Clock3, XCircle } from 'lucide-react'
import { useEffect, useRef, useState, useTransition, type FormEvent } from 'react'
import { toast } from 'sonner'

export default function ReviewDecisionForm({
  questionId,
  workspaceReturnTo,
  returnTo,
  program,
  track,
}: {
  questionId: string
  workspaceReturnTo: string
  returnTo?: string
  program: string
  track: string
}) {
  const notesRef = useRef<HTMLTextAreaElement>(null)
  const [notes, setNotes] = useState('')
  const [pending, startTransition] = useTransition()
  const { confirm, dialog } = useAdminConfirm()

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!notes.trim()) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [notes])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null
    const decision = submitter?.value ?? ''
    if (!['approve', 'revision_required', 'reject'].includes(decision)) return

    if (decision !== 'approve' && !notes.trim()) {
      toast.error('Catatan wajib diisi untuk meminta revisi atau menolak soal.')
      notesRef.current?.focus()
      return
    }

    if (decision !== 'approve') {
      const rejecting = decision === 'reject'
      const confirmed = await confirm({
        title: rejecting ? 'Tolak soal ini?' : 'Minta revisi soal ini?',
        message: rejecting
          ? 'Soal keluar dari alur review dan tidak dapat diterbitkan sampai diajukan ulang.'
          : 'Soal dikembalikan kepada penulis untuk diperbaiki sebelum masuk review lagi.',
        detail: 'Keputusan dan catatan akan masuk ke riwayat review soal.',
        confirmLabel: rejecting ? 'Tolak soal' : 'Minta revisi',
        danger: rejecting,
      })
      if (!confirmed) return
    }

    const data = new FormData(form)
    data.set('decision', decision)
    data.set('notes', notes.trim())
    startTransition(() => decideContentReviewAction(data))
  }

  return (
    <>
      <form
        onSubmit={handleSubmit}
        data-admin-form
        data-dirty={Boolean(notes.trim()) || undefined}
        className="rounded-lg border border-info-border bg-info-muted/50 p-4"
      >
        <input type="hidden" name="workspace_return_to" value={workspaceReturnTo} />
        <input type="hidden" name="program_code" value={program} />
        <input type="hidden" name="track_code" value={track} />
        {returnTo ? <input type="hidden" name="return_context" value={returnTo} /> : null}
        <input type="hidden" name="question_id" value={questionId} />
        <AdminField
          label="Catatan reviewer"
          hint="Wajib untuk keputusan revisi atau penolakan; opsional bila menyetujui."
        >
          <textarea
            ref={notesRef}
            className={`${adminInputClass} min-h-24 resize-y`}
            name="notes"
            value={notes}
            maxLength={4000}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Jelaskan temuan atau bagian yang perlu diperbaiki..."
          />
        </AdminField>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="submit"
            name="decision"
            value="approve"
            disabled={pending}
            className={adminSuccessButtonClass}
          >
            <CheckCircle2 size={16} />
            {pending ? 'Menyimpan…' : 'Setujui'}
          </button>
          <button
            type="submit"
            name="decision"
            value="revision_required"
            disabled={pending}
            className={adminWarningButtonClass}
          >
            <Clock3 size={16} />
            Minta revisi
          </button>
          <button
            type="submit"
            name="decision"
            value="reject"
            disabled={pending}
            className={adminDangerButtonClass}
          >
            <XCircle size={16} />
            Tolak
          </button>
        </div>
        {pending ? (
          <p role="status" className="mt-2 text-xs text-muted-foreground">
            Menyimpan keputusan review…
          </p>
        ) : null}
      </form>
      {dialog}
    </>
  )
}
