import { adminStatusLabel, adminStatusVariant } from '@/lib/admin-format'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import { AlertTriangle, CheckCircle2, Inbox, Info } from 'lucide-react'
import { cloneElement, isValidElement, type ReactElement, type ReactNode, useId } from 'react'

/** Shared native-control styles keep server actions and URL forms unchanged. */
export const adminInputClass =
  'admin-input w-full rounded-md border border-input bg-card px-3 text-sm font-normal text-foreground transition-colors placeholder:text-muted-foreground focus:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground'
export const adminLabelClass = 'text-sm font-medium text-foreground'

/** Editor controls stay compact on desktop and provide full touch targets on mobile. */
export const adminEditorButtonClass =
  'inline-flex h-11 min-w-11 shrink-0 items-center justify-center rounded-md border border-input bg-card text-muted-foreground transition-colors hover:border-primary hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground md:h-8 md:min-w-8 [&>svg]:size-4'

const adminActionClass =
  'admin-action inline-flex min-h-8 items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm leading-5 font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:bg-disabled disabled:text-disabled-foreground disabled:opacity-100 [&>svg]:size-4 [&>svg]:shrink-0'
export const adminPrimaryButtonClass = `${adminActionClass} bg-primary text-primary-foreground hover:bg-primary-hover`
export const adminSecondaryButtonClass = `${adminActionClass} border border-input bg-card text-foreground hover:bg-muted`
export const adminDangerButtonClass = `${adminActionClass} border border-danger-border bg-danger-muted text-danger hover:bg-danger-muted/80`
export const adminSuccessButtonClass = `${adminActionClass} border border-success-border bg-success-muted text-success hover:bg-success-muted/80`
export const adminWarningButtonClass = `${adminActionClass} border border-warning-border bg-warning-muted text-warning hover:bg-warning-muted/80`

/** Compact, consistent action link/button for an admin table row. */
export const adminTableActionClass = `${adminActionClass} h-7 min-h-7 border border-input bg-card px-2.5 py-1 text-xs text-foreground hover:bg-muted max-md:h-9 max-md:min-h-9`
/** Square, compact overflow action for dense admin table rows. */
export const adminTableIconActionClass =
  'admin-action admin-table-icon-action inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-input bg-card !p-0 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-md:h-9 max-md:w-9'

/** Shared alignment and spacing for every table row's actions. */
export function AdminRowActions({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'admin-table-row-actions flex min-h-7 items-center justify-start gap-2 max-md:min-h-9',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function AdminCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-lg border border-input bg-card ', className)}>
      {children}
    </section>
  )
}

/**
 * Field form admin: label + kontrol + helper/error opsional.
 *
 * Digunakan oleh form workspace dan form domain.
 * `error` otomatis mengikat `aria-describedby` + `aria-invalid`
 * bila `fieldId` diberikan, sehingga pesan validasi benar-benar terumumkan ke
 * screen reader — sebelumnya error hanya teks merah tanpa asosiasi.
 */
export function AdminField({
  label,
  children,
  hint,
  error,
  fieldId,
  as = 'label',
  className,
}: {
  label: string
  children: ReactNode
  hint?: string
  error?: string
  /** Id kontrol; wajib bila `error` dipakai agar aria-describedby terhubung. */
  fieldId?: string
  /**
   * `label` membungkus satu kontrol; pakai `as="div"` bila "field" berisi
   * lebih dari satu kontrol agar klik label tidak memicu kontrol yang salah.
   */
  as?: 'label' | 'div'
  className?: string
}) {
  const generatedId = useId()
  const controlElement = isValidElement<{
    id?: string
    'aria-describedby'?: string
    'aria-invalid'?: boolean
  }>(children)
    ? (children as ReactElement<{
        id?: string
        'aria-describedby'?: string
        'aria-invalid'?: boolean
      }>)
    : null
  const controlId = fieldId || controlElement?.props.id || generatedId
  const hintId = hint ? `${controlId}-hint` : undefined
  const errorId = error ? `${controlId}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined
  const controlDescribedBy =
    [controlElement?.props['aria-describedby'], describedBy].filter(Boolean).join(' ') || undefined
  const control = controlElement
    ? cloneElement(controlElement, {
        ...(!controlElement.props.id ? { id: controlId } : {}),
        ...(controlDescribedBy ? { 'aria-describedby': controlDescribedBy } : {}),
        ...(error ? { 'aria-invalid': true } : {}),
      })
    : children
  return (
    <div className={cn('block space-y-1.5', className)}>
      {as === 'label' ? (
        <label htmlFor={controlId} className={adminLabelClass}>
          {label}
        </label>
      ) : (
        <span className={adminLabelClass}>{label}</span>
      )}
      {hint ? (
        <span id={hintId} className="block text-xs font-medium leading-5 text-muted-foreground">
          {hint}
        </span>
      ) : null}
      {control}
      {error ? (
        <span id={errorId} role="alert" className="block text-xs font-medium text-danger">
          {error}
        </span>
      ) : null}
    </div>
  )
}

/**
 * Wadah halaman admin: ritme spasi antar-section yang seragam untuk seluruh
 * `/admin/**`. Halaman tidak lagi menulis `space-y-5/6 pb-10` sendiri-sendiri.
 */
export function AdminPage({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex flex-col gap-6 pb-10', className)}>{children}</div>
}

export function AdminPageHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <header className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          {description ? (
            <p className="mt-1 max-w-2xl text-sm font-normal leading-5 text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </header>
  )
}

export function AdminSectionHeading({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-2.5">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-sm font-medium text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

/** Domain adapter: consistent Badge geometry plus existing status vocabulary. */
export function AdminBadge({
  children,
  variant = 'neutral',
  className,
}: {
  children: ReactNode
  variant?: 'neutral' | 'blue' | 'green' | 'yellow' | 'orange' | 'red' | 'violet'
  className?: string
}) {
  return (
    <Badge appearance="admin" variant={variant} className={className}>
      {children}
    </Badge>
  )
}

export function AdminStatusBadge({
  status,
  label,
  className,
}: {
  /** Nilai status machine-readable dari database. */
  status: unknown
  /** Label manusia; jatuh ke `adminStatusLabel` bila tidak diberikan. */
  label?: string
  className?: string
}) {
  return (
    <AdminBadge variant={adminStatusVariant(status)} className={className}>
      {label ?? adminStatusLabel(status)}
    </AdminBadge>
  )
}

export function AdminFeedbackBanner({ ok, error }: { ok?: string; error?: string }) {
  if (!ok && !error) return null
  const isError = Boolean(error)
  const Icon = isError ? AlertTriangle : CheckCircle2
  return (
    <div
      // Error harus diumumkan segera (alert); sukses cukup live region halus (status).
      role={isError ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-3 rounded-lg border px-4 py-3 text-sm font-medium ',
        isError
          ? 'border-danger-border bg-danger-muted text-danger'
          : 'border-success-border bg-success-muted text-success',
      )}
    >
      <Icon className="mt-0.5 shrink-0" size={16} />
      <span className={isError ? 'text-danger' : 'text-muted-foreground'}>{error || ok}</span>
    </div>
  )
}

export function AdminHint({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'amber'
}) {
  const tones = {
    neutral: 'border-border bg-card text-muted-foreground',
    amber: 'border-warning-border bg-warning-muted text-warning',
  }
  const Icon = tone === 'amber' ? Info : null
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border px-4 py-3 text-xs font-semibold leading-6 ',
        tones[tone],
      )}
    >
      {Icon ? <Icon className="mt-0.5 shrink-0" size={16} /> : null}
      <span>{children}</span>
    </div>
  )
}

export function AdminMetric({
  label,
  value,
  helper,
  icon,
  tone = 'neutral',
}: {
  label: string
  value: number | string
  helper?: string
  icon?: ReactNode
  tone?: 'neutral' | 'blue' | 'green' | 'yellow' | 'orange' | 'red' | 'violet'
}) {
  const tones = {
    neutral: 'bg-muted text-foreground',
    blue: 'bg-info-muted text-info',
    green: 'bg-success-muted text-success',
    yellow: 'bg-warning-muted text-warning',
    orange: 'bg-warning-muted text-warning',
    red: 'bg-danger-muted text-danger',
    violet: 'bg-info-muted text-info',
  }
  return (
    <div className="rounded-lg border border-border bg-card p-4 ">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
          {helper ? (
            <p className="mt-1 text-xs font-normal text-muted-foreground">{helper}</p>
          ) : null}
        </div>
        {icon ? (
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', tones[tone])}>
            {icon}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function AdminEmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center px-4 py-8 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Inbox size={20} />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-md text-sm font-normal leading-5 text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

/** Wadah `<thead>` tabel admin: satu sumber untuk latar + tipografi header. */
export const adminTableHeadClass = 'bg-muted text-xs font-medium text-muted-foreground'

/**
 * Sel header tabel admin dengan `scope="col"`.
 *
 * Tidak ada satu pun `<th>` di `/admin/**` yang membawa `scope` sebelumnya —
 * screen reader tidak bisa mengasosiasikan sel data dengan kolomnya. Pakai
 * komponen ini untuk semua header kolom; `align="right"` untuk kolom numerik.
 */
export function AdminTh({
  children,
  align = 'left',
  className,
}: {
  children?: ReactNode
  align?: 'left' | 'right'
  className?: string
}) {
  return (
    <th
      scope="col"
      className={cn('px-4 py-3 text-left', align === 'right' && 'text-right', className)}
    >
      {children}
    </th>
  )
}
