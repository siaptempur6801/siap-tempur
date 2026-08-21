import type { ReactNode } from 'react'
import { Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'

export const adminInputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500'

export const adminButtonClass = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-900/15 disabled:cursor-not-allowed disabled:opacity-50'

export const adminPrimaryButtonClass = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50'

export const adminSecondaryButtonClass = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-900/5 disabled:cursor-not-allowed disabled:opacity-50'

export const adminDangerButtonClass = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-100 focus:outline-none focus:ring-4 focus:ring-red-500/10 disabled:cursor-not-allowed disabled:opacity-50'

export function AdminCard({ children, className }: { children: ReactNode; className?: string }) {
    return <section className={cn('rounded-2xl border border-slate-200 bg-white shadow-sm', className)}>{children}</section>
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
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{title}</h1>
                {description ? <p className="mt-1 max-w-3xl text-sm font-medium leading-6 text-slate-500">{description}</p> : null}
            </div>
            {action ? <div className="shrink-0">{action}</div> : null}
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
            <div>
                <h2 className="text-base font-black text-slate-950">{title}</h2>
                {description ? <p className="mt-0.5 text-sm font-medium text-slate-500">{description}</p> : null}
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
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
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
