import { cloneElement, type ReactElement, type ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, ChevronRight, Inbox, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { adminStatusLabel, adminStatusVariant } from '@/lib/admin-format'

export const adminInputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500'

/**
 * Label microcopy bersama (label form, overline section, header tabel).
 *
 * Sebelumnya string ini disalin ~40x dengan `text-slate-400`; pada palet brand
 * (`--brand-ink-400`) warna itu hanya ~3.1:1 di atas putih dan gagal WCAG AA
 * untuk teks 11px. `text-slate-500` (~5.4:1) lolos AA tanpa mengubah hierarki.
 */
export const adminLabelClass = 'text-[11px] font-extrabold uppercase tracking-wide text-slate-500'

export const adminButtonClass = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-900/15 disabled:cursor-not-allowed disabled:opacity-50'

export const adminPrimaryButtonClass = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50'

export const adminSecondaryButtonClass = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-900/5 disabled:cursor-not-allowed disabled:opacity-50'

export const adminDangerButtonClass = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-100 focus:outline-none focus:ring-4 focus:ring-red-500/10 disabled:cursor-not-allowed disabled:opacity-50'

/** Aksi review positif (Approve/Terbitkan) — emerald; sebelumnya kelas inline disalin di 2 tempat. */
export const adminSuccessButtonClass = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-50'

/** Aksi intermediet (Minta revisi) — amber; sebelumnya kelas inline disalin di 2 tempat. */
export const adminWarningButtonClass = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-800 transition hover:bg-amber-100 focus:outline-none focus:ring-4 focus:ring-amber-500/10 disabled:cursor-not-allowed disabled:opacity-50'

export function AdminCard({ children, className }: { children: ReactNode; className?: string }) {
    return <section className={cn('rounded-2xl border border-slate-200 bg-white shadow-sm', className)}>{children}</section>
}

/**
 * Field form admin: label + kontrol + helper/error opsional.
 *
 * Menggantikan komponen `Field` lokal yang terduplikasi byte-per-byte di
 * AdminOperationsWorkspace, AdminExamsWorkspace, AdminExamFormModal, dan
 * organizations. `error` otomatis mengikat `aria-describedby` + `aria-invalid`
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
    const hintId = fieldId && hint ? `${fieldId}-hint` : undefined
    const errorId = fieldId && error ? `${fieldId}-error` : undefined
    const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined
    const Wrapper = as
    return (
        <Wrapper className={cn('block space-y-1.5', className)}>
            <span className={adminLabelClass}>{label}</span>
            {hint ? <span id={hintId} className="block text-xs font-medium leading-5 text-slate-500">{hint}</span> : null}
            {describedBy ? cloneElement(children as ReactElement<{ 'aria-describedby'?: string; 'aria-invalid'?: boolean }>, {
                'aria-describedby': describedBy,
                'aria-invalid': error ? true : undefined,
            }) : children}
            {error ? <span id={errorId} role="alert" className="block text-xs font-bold text-red-700">{error}</span> : null}
        </Wrapper>
    )
}

/**
 * Panduan alur kerja halaman: langkah bernomor yang menjawab "mulai dari mana?".
 * Ditampilkan langsung di bawah judul halaman — sebelum metrik dan daftar, agar
 * admin membacanya dulu sebelum kebanjiran data.
 */
export function AdminFlowGuide({ steps }: { steps: string[] }) {
    if (steps.length === 0) return null
    return (
        <div className="rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3" role="note">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-blue-700">Alur kerja</p>
            <ol className="mt-2 flex flex-col gap-2 text-sm font-semibold text-slate-700 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2">
                {steps.map((step, index) => (
                    <li key={step} className="flex items-center gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-black text-white" aria-hidden="true">{index + 1}</span>
                        <span>{step}</span>
                        {index < steps.length - 1 ? <ChevronRight className="hidden shrink-0 text-blue-300 sm:block" size={14}/> : null}
                    </li>
                ))}
            </ol>
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
    steps,
}: {
    title: string
    description?: string
    action?: ReactNode
    /** Langkah kerja halaman; bila diisi dirender strip "Alur kerja" di bawah judul. */
    steps?: string[]
}) {
    return (
        <header className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{title}</h1>
                    {description ? <p className="mt-1 max-w-3xl text-sm font-medium leading-6 text-slate-500">{description}</p> : null}
                </div>
                {action ? <div className="shrink-0">{action}</div> : null}
            </div>
            {steps ? <div className="max-w-3xl"><AdminFlowGuide steps={steps}/></div> : null}
        </header>
    )
}

export function AdminSectionHeading({
    title,
    description,
    action,
    step,
}: {
    title: string
    description?: string
    action?: ReactNode
    /** Nomor langkah dalam alur halaman; bila diisi dirender chip "Langkah N". */
    step?: number
}) {
    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2.5">
                {step ? (
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-black text-white" aria-label={`Langkah ${step}`}>{step}</span>
                ) : null}
                <div>
                    <h2 className="text-base font-black text-slate-950">{title}</h2>
                    {description ? <p className="mt-0.5 text-sm font-medium text-slate-500">{description}</p> : null}
                </div>
            </div>
            {action ? <div className="shrink-0">{action}</div> : null}
        </div>
    )
}

const badgeVariants = {
    neutral: 'border-slate-200 bg-slate-50 text-slate-600',
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    yellow: 'border-amber-200 bg-amber-50 text-amber-700',
    orange: 'border-orange-200 bg-orange-50 text-orange-700',
    red: 'border-red-200 bg-red-50 text-red-700',
    // Dulu violet dirender pakai kelas biru, sehingga badge "Academic Review"
    // dan "Technical QA" tampak identik padahal statusnya berbeda.
    violet: 'border-violet-200 bg-violet-50 text-violet-700',
} as const

export function AdminBadge({
    children,
    variant = 'neutral',
    className,
}: {
    children: ReactNode
    variant?: keyof typeof badgeVariants
    className?: string
}) {
    return (
        <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-extrabold leading-none', badgeVariants[variant], className)}>
            {children}
        </span>
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
                'flex items-start gap-3 rounded-xl border px-4 py-3 text-sm font-bold shadow-sm',
                isError ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800',
            )}
        >
            <Icon className="mt-0.5 shrink-0" size={17}/>
            <span className={isError ? 'text-red-700' : 'text-slate-600'}>{error || ok}</span>
        </div>
    )
}

export function AdminHint({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'amber' }) {
    const tones = {
        neutral: 'border-slate-200 bg-white text-slate-500',
        amber: 'border-amber-200 bg-amber-50 text-amber-800',
    }
    const Icon = tone === 'amber' ? Info : null
    return (
        <div className={cn('flex items-start gap-3 rounded-xl border px-4 py-3 text-xs font-semibold leading-6 shadow-sm', tones[tone])}>
            {Icon ? <Icon className="mt-0.5 shrink-0" size={15}/> : null}
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
        neutral: 'bg-slate-50 text-slate-700',
        blue: 'bg-blue-50 text-blue-700',
        green: 'bg-emerald-50 text-emerald-700',
        yellow: 'bg-amber-50 text-amber-700',
        orange: 'bg-orange-50 text-orange-700',
        red: 'bg-red-50 text-red-700',
        violet: 'bg-violet-50 text-violet-700',
    }
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
                    <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">{value}</p>
                    {helper ? <p className="mt-1 text-xs font-medium text-slate-500">{helper}</p> : null}
                </div>
                {icon ? <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', tones[tone])}>{icon}</div> : null}
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
        <div className="flex min-h-52 flex-col items-center justify-center px-6 py-10 text-center">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"><Inbox size={20}/></div>
            <h3 className="text-base font-black text-slate-900">{title}</h3>
            {description ? <p className="mt-1 max-w-md text-sm font-medium leading-6 text-slate-500">{description}</p> : null}
            {action ? <div className="mt-4">{action}</div> : null}
        </div>
    )
}

/** Wadah `<thead>` tabel admin: satu sumber untuk latar + tipografi header. */
export const adminTableHeadClass = 'bg-slate-50 text-[11px] font-extrabold uppercase tracking-wide text-slate-500'

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
        <th scope="col" className={cn('px-4 py-3 text-left first:px-5 last:px-5', align === 'right' && 'text-right', className)}>
            {children}
        </th>
    )
}
