'use client'
import { saveEventAction } from '@/app/actions/admin-v2'
import { adminStatusLabel,formatLocalDateTimeInput } from '@/lib/admin-format'
import { useState } from 'react'
import AdminSubmitButton from './AdminSubmitButton'
import { AdminField,adminInputClass,adminSecondaryButtonClass } from './AdminUi'
import AssessmentSelector,{ type AssessmentOption } from './AssessmentSelector'
import { AdminFormActions } from './forms/AdminFormActions'
import { AdminFormSection } from './forms/AdminFormSection'
export type EventFormValue = {
  id?: string
  title?: string
  code?: string
  description?: string | null
  flyer_image_url?: string | null
  status?: string
  registration_start?: string | null
  registration_end?: string | null
  starts_at?: string
  ends_at?: string
}
export default function EventWorkflowForm({
  event,
  options,
  selectedId,
  program,
  track,
  returnTo,
  total,
  page
}: {
  event?: EventFormValue
  options: AssessmentOption[]
  selectedId?: string
  program: string
  track: string
  returnTo: string
  total: number
  page: number
}) {
  const [exam, setExam] = useState(selectedId || ''),
    [previous, setPrevious] = useState(selectedId)
  if (previous !== selectedId) {
    setPrevious(selectedId)
    setExam(selectedId || '')
  }
  const [values, setValues] = useState<Record<string, string>>({
    title: event?.title || '',
    code: event?.code || '',
    registration_start: formatLocalDateTimeInput(event?.registration_start),
    registration_end: formatLocalDateTimeInput(event?.registration_end),
    starts_at: formatLocalDateTimeInput(event?.starts_at),
    ends_at: formatLocalDateTimeInput(event?.ends_at),
    capacity: '100',
    status: event?.status || 'draft'
  })
  const [review, setReview] = useState(false),
    assessment = options.find((o) => o.id === exam)
  const problem =
    !values.title.trim() || !values.code.trim()
      ? 'Nama dan kode event wajib diisi.'
      : !event && !assessment?.eligible
        ? 'Pilih assessment yang dapat digunakan.'
        : !values.starts_at || !values.ends_at || values.starts_at >= values.ends_at
          ? 'Waktu selesai harus setelah waktu mulai.'
          : values.registration_start &&
              values.registration_end &&
              values.registration_start >= values.registration_end
            ? 'Rentang registrasi tidak valid.'
            : values.registration_end && values.registration_end > values.ends_at
              ? 'Registrasi harus berakhir sebelum event selesai.'
              : !event && Number(values.capacity) < 1
                ? 'Kapasitas harus lebih dari 0.'
                : ''
  const scheduleError = !!values.starts_at && !!values.ends_at && values.starts_at >= values.ends_at
  function input(name: string, label: string, type = 'text', required = false) {
    return (
      <AdminField label={label} fieldId={`event-${name}`}>
        <input
          id={`event-${name}`}
          className={adminInputClass}
          name={name}
          type={type}
          min={type === 'number' ? 1 : undefined}
          required={required}
          aria-invalid={(scheduleError && ['starts_at', 'ends_at'].includes(name)) || undefined}
          aria-describedby={problem ? 'event-form-error' : undefined}
          value={values[name]}
          onChange={(e) => {
            setReview(false)
            setValues({ ...values, [name]: e.target.value })
          }}
        />
      </AdminField>
    )
  }
  return (
    <form data-admin-form action={saveEventAction}>
      <input type="hidden" name="workflow" value="1" />
      <input type="hidden" name="return_to" value={returnTo} />
      <input type="hidden" name="program_code" value={assessment?.domain || program} />
      <input type="hidden" name="track_code" value={assessment?.level || track} />
      {event?.id && <input type="hidden" name="id" value={event.id} />}
      <AdminFormSection title="Event Info" description="Identitas event yang akan dibuka peserta.">
        {input('title', 'Judul', 'text', true)}
        {input('code', 'Kode', 'text', true)}
        <AdminField label="Deskripsi">
          <textarea
            className={adminInputClass}
            name="description"
            onChange={() => setReview(false)}
            defaultValue={event?.description || ''}
          />
        </AdminField>
        <AdminField label="Status">
          <select
            className={adminInputClass}
            name="status"
            value={values.status}
            onChange={(e) => {
              setValues({ ...values, status: e.target.value })
              setReview(false)
            }}
          >
            {[
              'draft',
              'scheduled',
              'live',
              'closed',
              ...(event?.status === 'archived' ? ['archived'] : [])
            ].map((s) => (
              <option key={s} value={s}>
                {adminStatusLabel(s)}
              </option>
            ))}
          </select>
        </AdminField>
        <AdminField label="Foto event">
          <input
            className={adminInputClass}
            name="flyer_image_url"
            type="url"
            onChange={() => setReview(false)}
            defaultValue={event?.flyer_image_url || ''}
          />
        </AdminField>
      </AdminFormSection>
      {!event && (
        <AdminFormSection
          title="Assessment"
          description="Pilihan dari workspace Assessment dibawa otomatis."
        >
          <div className="sm:col-span-2">
            <AssessmentSelector
              options={options}
              selectedId={exam}
              onSelect={(id) => {
                setExam(id)
                setReview(false)
              }}
              name="next_exam_id"
              total={total}
              page={page}
            />
          </div>
        </AdminFormSection>
      )}
      <AdminFormSection
        title="Registration / Access"
        description="Peserta mengikuti registrasi dan aturan akses sesi. Tiket dapat dihubungkan setelah event dibuat."
      >
        {input('registration_start', 'Registrasi mulai', 'datetime-local')}
        {input('registration_end', 'Registrasi selesai', 'datetime-local')}
        {!event && input('capacity', 'Kapasitas', 'number', true)}
      </AdminFormSection>
      <AdminFormSection title="Schedule" description="Seluruh jadwal menggunakan WIB.">
        {input('starts_at', 'Mulai', 'datetime-local', true)}
        {input('ends_at', 'Selesai', 'datetime-local', true)}
      </AdminFormSection>
      <AdminFormSection
        title="Review"
        description="Periksa assessment, akses, dan jadwal sebelum menyimpan."
      >
        <div className="sm:col-span-2">
          {problem && (
            <p id="event-form-error" role="alert" className="mb-3 text-sm text-danger">
              {problem}
            </p>
          )}
          {review && !problem && (
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              {[
                ['Event', values.title],
                ['Status', adminStatusLabel(values.status)],
                ['Assessment', assessment?.title || 'Mengikuti sesi yang tersedia'],
                [
                  'Registrasi',
                  `${values.registration_start || 'Tidak dibatasi'} — ${values.registration_end || 'Tidak dibatasi'}`
                ],
                ['Jadwal', `${values.starts_at} — ${values.ends_at} WIB`],
                ['Kapasitas', event ? 'Mengikuti sesi' : values.capacity],
                ['Access', 'Registrasi dan aturan sesi']
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="mt-1 font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </AdminFormSection>
      <AdminFormActions cancelHref={returnTo}>
        {review && !problem ? (
          <AdminSubmitButton>{event ? 'Simpan perubahan' : 'Buat Event'}</AdminSubmitButton>
        ) : (
          <button
            type="button"
            className={adminSecondaryButtonClass}
            disabled={!!problem}
            onClick={() => setReview(true)}
          >
            Review Event
          </button>
        )}
      </AdminFormActions>
    </form>
  )
}
