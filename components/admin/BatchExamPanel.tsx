'use client'
import { saveAssignmentAction } from '@/app/actions/admin-organization-exam'
import type { AssignmentRow } from '@/lib/organization-exam'
import { useState } from 'react'
import AdminSubmitButton from './AdminSubmitButton'
import { AdminField,adminInputClass,adminSecondaryButtonClass } from './AdminUi'
import AssessmentSelector,{ type AssessmentOption } from './AssessmentSelector'
import { AssignmentList } from './domain/organization/AssignmentList'
import { AdminFormSection } from './forms/AdminFormSection'
export default function BatchExamPanel({
  batchId,
  organizationId,
  organizationName,
  batchName,
  assessments,
  assignments,
  selectedExamId,
  returnTo,
  total,
  page
}: {
  batchId: string
  organizationId: string
  organizationName: string
  batchName: string
  assessments: AssessmentOption[]
  assignments: AssignmentRow[]
  selectedExamId: string
  returnTo: string
  total: number
  page: number
}) {
  const [exam, setExam] = useState(selectedExamId)
  const [review, setReview] = useState(false)
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [active, setActive] = useState(true)
  const [previousId, setPreviousId] = useState(selectedExamId)
  if (previousId !== selectedExamId) {
    setPreviousId(selectedExamId)
    setExam(selectedExamId)
    setReview(false)
  }
  const scheduleInvalid = Boolean(start && end && start >= end)
  const selected = assessments.find((a) => a.id === exam)
  const invalid = !selected?.eligible
    ? 'Pilih assessment yang tersedia.'
    : scheduleInvalid
      ? 'Jadwal tutup harus setelah jadwal buka.'
      : ''
  const hidden = (
    <>
      <input type="hidden" name="batch_id" value={batchId} />
      <input type="hidden" name="org" value={organizationId} />
      <input type="hidden" name="return_to" value={returnTo} />
      <input type="hidden" name="return_exam_id" value={exam} />
    </>
  )

  return (
    <section className="mt-4 space-y-5" aria-labelledby="batch-assessments-title">
      <h3 id="batch-assessments-title" className="font-bold">
        Assessment untuk batch ini
      </h3>
      <form action={saveAssignmentAction} data-admin-form>
        {hidden}
        <AdminFormSection title="Target">
          <p className="text-sm">
            {organizationName} → {batchName}
          </p>
          <p className="text-xs text-muted-foreground">
            Seluruh peserta batch. Scope mengikuti kontrak penugasan instansi.
          </p>
        </AdminFormSection>
        <AdminFormSection title="Assessment">
          <div className="sm:col-span-2">
            <AssessmentSelector
              options={assessments}
              selectedId={exam}
              onSelect={(id) => {
                setExam(id)
                setReview(false)
              }}
              total={total}
              page={page}
            />
          </div>
        </AdminFormSection>
        <AdminFormSection title="Jadwal (WIB)">
          <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
            <AdminField label="Buka (WIB)">
              <input
                className={adminInputClass}
                type="datetime-local"
                name="starts_at"
                aria-invalid={scheduleInvalid || undefined}
                aria-describedby={scheduleInvalid ? 'assignment-error' : undefined}
                value={start}
                onChange={(e) => {
                  setStart(e.target.value)
                  setReview(false)
                }}
              />
            </AdminField>
            <AdminField label="Tutup (WIB)">
              <input
                className={adminInputClass}
                type="datetime-local"
                name="due_at"
                aria-invalid={scheduleInvalid || undefined}
                aria-describedby={scheduleInvalid ? 'assignment-error' : undefined}
                value={end}
                onChange={(e) => {
                  setEnd(e.target.value)
                  setReview(false)
                }}
              />
            </AdminField>
          </div>
          <label className="mt-3 flex gap-2 text-sm">
            <input
              type="checkbox"
              name="is_active"
              checked={active}
              onChange={(e) => {
                setActive(e.target.checked)
                setReview(false)
              }}
            />
            Aktifkan penugasan
          </label>
        </AdminFormSection>
        <AdminFormSection title="Review">
          {invalid && (
            <p role="alert" id="assignment-error" className="text-sm text-warning">
              {invalid}
            </p>
          )}
          {review && !invalid && (
            <dl className="grid gap-3 text-sm sm:col-span-2 sm:grid-cols-2">
              {[
                ['Instansi', organizationName],
                ['Batch', batchName],
                ['Assessment', selected?.title || ''],
                [
                  'Ketersediaan',
                  `${start || 'Tanpa batas mulai'} — ${end || 'Tanpa batas selesai'}`
                ],
                ['Peserta', 'Seluruh peserta batch'],
                ['Status', active ? 'Aktif' : 'Nonaktif']
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
          )}
          {review && !invalid ? (
            <AdminSubmitButton>Jadwalkan assessment</AdminSubmitButton>
          ) : (
            <button
              type="button"
              className={adminSecondaryButtonClass}
              disabled={!!invalid}
              aria-describedby={invalid ? 'assignment-error' : undefined}
              onClick={() => setReview(true)}
            >
              Review Penugasan
            </button>
          )}
        </AdminFormSection>
      </form>
      <h3 className="font-semibold">Penugasan ({assignments.length})</h3>
      <AssignmentList
        assignments={assignments}
        batchId={batchId}
        organizationId={organizationId}
        returnTo={returnTo}
      />
    </section>
  )
}
