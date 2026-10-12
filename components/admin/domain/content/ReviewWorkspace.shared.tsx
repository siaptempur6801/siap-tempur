import MathRenderer from '@/components/MathRenderer'
import { AdminBadge } from '@/components/admin/AdminUi'
import { cn } from '@/lib/utils'

export type ReviewWorkspaceRow = Record<string, unknown>

export type ReviewWorkspaceSearchParams = {
  program?: string
  track?: string
  subject?: string
  status?: string
  view?: string
  stage?: string
  reviewer?: string
  q?: string
  question?: string
  new?: string
  ok?: string
  error?: string
  /** Mode fokus untuk batch review CPNS yang sudah disiapkan. */
  bulk?: string
  /** Nomor halaman antrean (25 baris/halaman). */
  page?: string
  returnTo?: string
}

export function s(value: unknown) {
  return value == null ? '' : String(value)
}

export function n(value: unknown) {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

export function lower(value: unknown) {
  return s(value).toLowerCase()
}

export function profileName(profile: unknown, fallback = 'Belum ditentukan') {
  if (!profile || typeof profile !== 'object') return fallback
  const row = profile as ReviewWorkspaceRow
  return s(row.display_name) || s(row.full_name) || fallback
}

export function stageLabel(stage: unknown) {
  switch (s(stage)) {
    case 'editorial':
      return 'Editorial Review'
    case 'academic':
      return 'Academic Review'
    case 'technical_qa':
      return 'Technical QA'
    default:
      return 'Belum masuk review'
  }
}

export function workspaceHref(
  params: ReviewWorkspaceSearchParams,
  overrides: Partial<ReviewWorkspaceSearchParams> = {},
) {
  const merged = { ...params, ...overrides }
  const query = new URLSearchParams()
  for (const key of [
    'program',
    'track',
    'subject',
    'status',
    'view',
    'stage',
    'reviewer',
    'q',
    'question',
    'new',
    'page',
    'bulk',
    'returnTo',
  ] as const) {
    const value = merged[key]
    if (value) query.set(key, value)
  }
  return `/admin/content/review?${query.toString()}`
}

export function HiddenContext({
  program,
  track,
  returnTo,
  filters,
}: {
  program: string
  track: string
  returnTo?: string
  filters: ReviewWorkspaceSearchParams
}) {
  return (
    <>
      <input
        type="hidden"
        name="workspace_return_to"
        value={workspaceHref({ ...filters, program, track })}
      />
      <input type="hidden" name="program_code" value={program} />
      <input type="hidden" name="track_code" value={track} />
      {returnTo && <input type="hidden" name="return_context" value={returnTo} />}
    </>
  )
}

function OptionPreview({ option }: { option: ReviewWorkspaceRow }) {
  const isCorrect = option.is_correct === true
  return (
    <div
      className={cn(
        'rounded-lg border p-3.5 transition',
        isCorrect ? 'border-success-border bg-success-muted/70' : 'border-border bg-card',
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'flex h-7 min-w-7 items-center justify-center rounded-lg border text-xs font-semibold',
            isCorrect
              ? 'border-success-border bg-success-muted text-success'
              : 'border-border bg-muted text-muted-foreground',
          )}
        >
          {s(option.option_key)}
        </span>
        <div className="min-w-0 flex-1">
          {Boolean(option.response_group) ? (
            <div className="mb-1 text-[11px] font-semibold uppercase text-info">
              {s(option.response_group)}
            </div>
          ) : null}
          <div className="text-sm font-medium leading-6 text-foreground">
            <MathRenderer text={s(option.content)} />
          </div>
          {Boolean(option.image_url) ? (
            <div className="mt-2 break-all text-[10px] font-medium text-muted-foreground">
              Gambar: {s(option.image_url)}
            </div>
          ) : null}
          {isCorrect ? (
            <AdminBadge variant="green" className="mt-2">
              Jawaban benar
            </AdminBadge>
          ) : null}
        </div>
      </div>
    </div>
  )
}

const REVIEW_FLOW = [
  { key: 'editorial', label: 'Editorial' },
  { key: 'academic', label: 'Academic' },
  { key: 'technical_qa', label: 'Technical QA' },
  { key: 'published', label: 'Terbit' },
] as const

function reviewFlowIndex(question: ReviewWorkspaceRow) {
  const stage = s(question.current_stage)
  if (stage === 'editorial') return 0
  if (stage === 'academic') return 1
  if (stage === 'technical_qa') return 2
  if (lower(question.status) === 'approved') return 3
  if (lower(question.status) === 'published') return 4
  return -1
}

export function ReviewProgress({ question }: { question: ReviewWorkspaceRow }) {
  const activeIndex = reviewFlowIndex(question)
  return (
    <ol
      aria-label="Progres review"
      className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 sm:grid-cols-4"
    >
      {REVIEW_FLOW.map((step, index) => {
        const complete = activeIndex > index
        const active = activeIndex === index
        return (
          <li key={step.key} className="min-w-0">
            <div
              className={`h-1.5 rounded-full ${complete ? 'bg-success' : active ? 'bg-primary' : 'bg-input'}`}
            />
            <p
              className={`mt-1.5 text-xs font-semibold leading-5 ${active ? 'text-info' : complete ? 'text-success' : 'text-muted-foreground'}`}
            >
              {complete ? '✓ ' : ''}
              {step.label}
            </p>
          </li>
        )
      })}
    </ol>
  )
}

export { OptionPreview }
