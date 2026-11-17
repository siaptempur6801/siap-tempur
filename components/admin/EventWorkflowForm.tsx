'use client'

import { saveEventAction } from '@/app/actions/admin-v2'
import { formatLocalDateTimeInput } from '@/lib/admin-format'
import { adminEventStatusLabel } from '@/lib/admin-event-format'
import { useState } from 'react'
import AdminSubmitButton from './AdminSubmitButton'
import { AdminField, adminInputClass, adminSecondaryButtonClass } from './AdminUi'
import AssessmentSelector, { type AssessmentOption } from './AssessmentSelector'
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

const EVENT_STATUS_OPTIONS: { value: string; label: string; aliases: string[] }[] = [
  { value: 'draft', label: 'Draft', aliases: ['draft'] },
  { value: 'scheduled', label: 'Dijadwalkan', aliases: ['scheduled'] },
  { value: 'live', label: 'Berlangsung', aliases: ['live', 'active'] },
  { value: 'closed', label: 'Selesai', aliases: ['closed', 'ended'] },
  { value: 'archived', label: 'Diarsipkan', aliases: ['archived'] },
]

function eventStatusOptions(currentStatus?: string) {
  const normalized = currentStatus?.toLowerCase()
  const currentOption = EVENT_STATUS_OPTIONS.find((option) =>
    option.aliases.includes(normalized || ''),
  )
  const options = EVENT_STATUS_OPTIONS.filter(
    (option) => option.value !== 'archived' || currentStatus?.toLowerCase() === 'archived',
  ).map((option) => ({
    value: currentOption?.value === option.value && currentStatus ? currentStatus : option.value,
    label: option.label,
  }))

  if (currentStatus && !currentOption) {
    options.push({ value: currentStatus, label: adminEventStatusLabel(currentStatus) })
  }

  return options
}

export default function EventWorkflowForm({
  event,
  assessmentSummary,
  options,
  selectedId,
  program,
  track,
  returnTo,
  total,
  page,
  showInformationHeading = true,
}: {
  event?: EventFormValue
  assessmentSummary?: string
  options: AssessmentOption[]
  selectedId?: string
  program: string
  track: string
  returnTo: string
  total: number
  page: number
  showInformationHeading?: boolean
}) {
  const [exam, setExam] = useState(selectedId || '')
  const [values, setValues] = useState<Record<string, string>>({
    title: event?.title || '',
    code: event?.code || '',
    registration_start: formatLocalDateTimeInput(event?.registration_start),
    registration_end: formatLocalDateTimeInput(event?.registration_end),
    starts_at: formatLocalDateTimeInput(event?.starts_at),
    ends_at: formatLocalDateTimeInput(event?.ends_at),
    capacity: '100',
    status: event?.status || 'draft',
  })
  const [activeStep, setActiveStep] = useState(0)
  const [stepError, setStepError] = useState('')
  const assessment = options.find((option) => option.id === exam)
  const statusOptions = eventStatusOptions(event?.status)
  const steps = [
    { title: 'Informasi', description: 'Identitas event' },
    { title: 'Assessment & akses', description: 'Assessment dan peserta' },
    { title: 'Jadwal', description: 'Waktu pelaksanaan' },
    { title: 'Tinjau', description: 'Periksa sebelum simpan' },
  ]

  function updateValue(name: string, value: string) {
    setValues((current) => ({ ...current, [name]: value }))
    setStepError('')
  }

  function issueForStep(step: number) {
    if (step === 0 && (!values.title.trim() || !values.code.trim())) {
      return 'Nama dan kode event wajib diisi.'
    }
    if (step === 1) {
      if (!event && !assessment?.eligible) return 'Pilih assessment yang siap digunakan.'
      if (!event && Number(values.capacity) < 1) return 'Kapasitas harus lebih dari 0.'
      if (
        values.registration_start &&
        values.registration_end &&
        values.registration_start >= values.registration_end
      ) {
        return 'Waktu selesai registrasi harus setelah waktu mulai.'
      }
    }
    if (step === 2) {
      if (!values.starts_at || !values.ends_at) return 'Waktu mulai dan selesai wajib diisi.'
      if (values.starts_at >= values.ends_at) return 'Waktu selesai harus setelah waktu mulai.'
      if (values.registration_end && values.registration_end > values.ends_at) {
        return 'Pendaftaran harus ditutup sebelum event berakhir.'
      }
    }
    return ''
  }

  function goToStep(step: number) {
    if (step > activeStep) {
      for (let index = activeStep; index < step; index += 1) {
        const issue = issueForStep(index)
        if (issue) {
          setStepError(issue)
          setActiveStep(index)
          return
        }
      }
    }
    setStepError('')
    setActiveStep(step)
  }

  function input(name: string, label: string, type = 'text', required = false, hint?: string) {
    return (
      <AdminField label={label} fieldId={`event-${name}`} hint={hint} className="min-w-0">
        <input
          id={`event-${name}`}
          className={adminInputClass}
          name={name}
          type={type}
          min={type === 'number' ? 1 : undefined}
          required={required}
          aria-invalid={Boolean(stepError) || undefined}
          aria-describedby={stepError ? 'event-form-error' : undefined}
          value={values[name]}
          onChange={(event) => updateValue(name, event.target.value)}
        />
      </AdminField>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[960px]">
      {!event && (
        <nav
          aria-label="Tahapan pembuatan event"
          className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4"
        >
          {steps.map((step, index) => {
            const isCurrent = activeStep === index
            const isComplete = activeStep > index
            return (
              <button
                key={step.title}
                type="button"
                aria-current={isCurrent ? 'step' : undefined}
                onClick={() => goToStep(index)}
                className={`flex min-h-14 items-center gap-2 rounded-md border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${isCurrent ? 'border-primary bg-primary/5 text-foreground' : 'border-border bg-card text-muted-foreground hover:bg-muted'}`}
              >
                <span
                  className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${isCurrent || isComplete ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                >
                  {index + 1}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{step.title}</span>
                  <span className="hidden text-xs text-muted-foreground md:block">
                    {step.description}
                  </span>
                </span>
              </button>
            )
          })}
        </nav>
      )}

      <form data-admin-form noValidate action={saveEventAction} className="flex flex-col gap-6">
        <input type="hidden" name="workflow" value="1" />
        <input type="hidden" name="return_to" value={returnTo} />
        <input type="hidden" name="program_code" value={assessment?.domain || program} />
        <input type="hidden" name="track_code" value={assessment?.level || track} />
        {event?.id && <input type="hidden" name="id" value={event.id} />}

        <div hidden={!event && activeStep !== 0}>
          <AdminFormSection
            title="Informasi event"
            description="Tentukan nama dan identitas yang akan dikenali peserta."
            showHeading={showInformationHeading}
          >
            {input('title', 'Nama event', 'text', true, 'Nama yang akan dilihat peserta.')}
            {input(
              'code',
              'Kode event',
              'text',
              true,
              'Gunakan kode singkat agar admin mudah menemukan event.',
            )}
            <AdminField
              label="Deskripsi event"
              fieldId="event-description"
              className="min-w-0 sm:col-span-2"
            >
              <textarea
                id="event-description"
                className={`${adminInputClass} min-h-24 py-2`}
                name="description"
                defaultValue={event?.description || ''}
                onChange={() => setStepError('')}
              />
            </AdminField>
            <AdminField
              label="URL gambar event"
              fieldId="event-flyer"
              hint="Opsional. Tautan gambar harus dapat diakses."
              className="min-w-0"
            >
              <input
                id="event-flyer"
                className={adminInputClass}
                name="flyer_image_url"
                type="url"
                defaultValue={event?.flyer_image_url || ''}
                onChange={() => setStepError('')}
              />
            </AdminField>
            <AdminField
              label="Status event"
              fieldId="event-status"
              hint="Status mengatur tampilan event; jadwal menentukan waktunya."
            >
              <select
                id="event-status"
                className={adminInputClass}
                name="status"
                value={values.status}
                onChange={(event) => updateValue('status', event.target.value)}
              >
                {statusOptions.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </AdminField>
          </AdminFormSection>
        </div>

        <div hidden={!event && activeStep !== 1}>
          {!event && (
            <AdminFormSection
              title="Assessment & akses"
              description="Assessment dari halaman sebelumnya dipilih otomatis. Pilih assessment yang siap digunakan."
            >
              <div className="sm:col-span-2">
                <AssessmentSelector
                  options={options}
                  selectedId={exam}
                  onSelect={(id) => {
                    setExam(id)
                    setStepError('')
                  }}
                  name="next_exam_id"
                  total={total}
                  page={page}
                />
              </div>
            </AdminFormSection>
          )}
          <AdminFormSection
            title="Pendaftaran"
            description={
              event
                ? 'Atur periode pendaftaran. Ubah batas peserta pada tiap sesi di tab Sesi & assessment.'
                : 'Tentukan periode pendaftaran dan batas peserta sesi assessment pertama.'
            }
          >
            {input(
              'registration_start',
              'Pendaftaran dibuka',
              'datetime-local',
              false,
              'Kosongkan agar pendaftaran dibuka segera.',
            )}
            {input(
              'registration_end',
              'Pendaftaran ditutup',
              'datetime-local',
              false,
              'Pilih waktu sebelum event berakhir.',
            )}
            {!event &&
              input(
                'capacity',
                'Batas peserta sesi pertama',
                'number',
                true,
                'Jumlah maksimal peserta pada sesi assessment pertama.',
              )}
          </AdminFormSection>
        </div>

        <div hidden={!event && activeStep !== 2}>
          <AdminFormSection
            title="Jadwal event"
            description="Atur waktu mulai dan berakhir dalam WIB. Waktu berakhir harus setelah waktu mulai."
          >
            {input('starts_at', 'Waktu mulai', 'datetime-local', true)}
            {input('ends_at', 'Waktu berakhir', 'datetime-local', true)}
          </AdminFormSection>
        </div>

        <div hidden={Boolean(event) || activeStep !== 3}>
          <AdminFormSection
            title="Tinjau event"
            description="Pastikan identitas, assessment, akses, dan jadwal sudah benar sebelum menyimpan."
          >
            <dl className="grid gap-x-8 gap-y-4 rounded-md border border-border bg-card p-4 text-sm sm:grid-cols-2">
              {[
                ['Nama event', values.title || 'Belum diisi'],
                ['Kode event', values.code || 'Belum diisi'],
                ['Status', adminEventStatusLabel(values.status)],
                [
                  'Assessment',
                  assessment?.title ||
                    assessmentSummary ||
                    (event ? 'Assessment diatur melalui sesi' : 'Belum dipilih'),
                ],
                [
                  'Pendaftaran',
                  `${values.registration_start || 'Dibuka segera'} — ${values.registration_end || 'Sampai event berakhir'}`,
                ],
                [
                  'Jadwal',
                  `${values.starts_at || 'Belum diatur'} — ${values.ends_at || 'Belum diatur'} WIB`,
                ],
                [
                  'Kapasitas',
                  event
                    ? 'Mengikuti kapasitas sesi'
                    : `${values.capacity || 'Belum diatur'} peserta`,
                ],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
                  <dd className="mt-1 break-words font-medium text-foreground">{value}</dd>
                </div>
              ))}
            </dl>
            {stepError && (
              <p
                id="event-form-error"
                role="alert"
                className="mt-4 text-sm font-medium text-danger"
              >
                {stepError}
              </p>
            )}
          </AdminFormSection>
        </div>

        {stepError && !event && activeStep !== 3 && (
          <p id="event-form-error" role="alert" className="-mt-3 text-sm font-medium text-danger">
            {stepError}
          </p>
        )}

        {event ? (
          <AdminFormActions cancelHref={returnTo}>
            <AdminSubmitButton>Simpan perubahan</AdminSubmitButton>
          </AdminFormActions>
        ) : (
          <AdminFormActions cancelHref={returnTo}>
            {activeStep > 0 && (
              <button
                type="button"
                className={adminSecondaryButtonClass}
                onClick={() => {
                  setStepError('')
                  setActiveStep((step) => step - 1)
                }}
              >
                Kembali
              </button>
            )}
            {activeStep < steps.length - 1 ? (
              <button
                type="button"
                className="admin-action inline-flex min-h-8 items-center justify-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                onClick={() => goToStep(activeStep + 1)}
              >
                Lanjut
              </button>
            ) : (
              <AdminSubmitButton>Buat Event</AdminSubmitButton>
            )}
          </AdminFormActions>
        )}
      </form>
    </div>
  )
}
