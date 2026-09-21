import Link from 'next/link'
import { Search } from 'lucide-react'
import { adminInputClass, adminPrimaryButtonClass, adminSecondaryButtonClass } from '@/components/admin/AdminUi'
import { cn } from '@/lib/utils'

/**
 * Select filter opsional di luar `status` — mis. peran, aksi, tipe dompet.
 * Nilainya ikut ke URL seperti filter lain; kosong berarti "semua".
 */
export type AdminToolbarSelect = {
    name: string
    ariaLabel: string
    placeholder: string
    defaultValue: string
    options: ReadonlyArray<{ value: string; label: string }>
}

/** Layout grid enumerasi statis — Tailwind memerlukan class yang bisa dilihat. */
const LAYOUTS: Record<string, string> = {
    s0: 'md:grid-cols-[minmax(220px,1.6fr)_auto]',
    s1: 'md:grid-cols-[minmax(220px,1.6fr)_1fr_auto]',
    s2: 'md:grid-cols-[minmax(180px,1.3fr)_1fr_1fr_auto]',
    s3: 'md:grid-cols-[minmax(160px,1.3fr)_1fr_1fr_1fr_auto]',
    t0: 'md:grid-cols-[auto]',
    t1: 'md:grid-cols-[1fr_auto]',
    t2: 'md:grid-cols-[1fr_1fr_auto]',
}

export default function AdminListToolbar({
    pathname,
    search,
    status,
    statusOptions = [],
    placeholder,
    resultCount,
    program,
    track,
    contextHidden = true,
    selects = [],
    hiddenFields,
}: {
    pathname: string
    search: string
    /** Tidak diberikan atau tanpa opsi → select status disembunyikan. */
    status?: string
    statusOptions?: ReadonlyArray<{ value: string; label: string }>
    /** Tanpa `placeholder`, input pencarian disembunyikan (daftar select-only). */
    placeholder?: string
    /** Jumlah hasil dengan filter aktif; dipakai di keterangan filter. */
    resultCount: number
    program?: string
    track?: string
    contextHidden?: boolean
    selects?: ReadonlyArray<AdminToolbarSelect>
    /** Filter halaman lain yang harus tetap terkirim (mis. `q` di halaman multi-section). */
    hiddenFields?: Record<string, string | undefined>
}) {
    const filterCount = selects.length + (statusOptions.length ? 1 : 0)
    const key = `${placeholder ? 's' : 't'}${filterCount}`
    const layout = LAYOUTS[key] ?? LAYOUTS[`s${filterCount}`] ?? LAYOUTS.s3

    const resetHref = (() => {
        if (!contextHidden || !program || !track) return pathname
        return `${pathname}?program=${encodeURIComponent(program)}&track=${encodeURIComponent(track)}`
    })()

    const hasStatus = statusOptions.length > 0
    const anyFilter = Boolean(search || (status && hasStatus) || selects.some((select) => select.defaultValue))

    /** Label manusiawi untuk nilai filter aktif, bukan kode kolomnya. */
    const activeFilterChips = selects
        .filter((select) => select.defaultValue)
        .map((select) => ({
            label: select.ariaLabel.replace(/^Filter /, ''),
            valueLabel: select.options.find((option) => option.value === select.defaultValue)?.label ?? select.defaultValue,
        }))

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <form className={cn('grid gap-3', layout)} method="get">
                {contextHidden && program && track ? (
                    <>
                        <input type="hidden" name="program" value={program}/>
                        <input type="hidden" name="track" value={track}/>
                    </>
                ) : null}
                {Object.entries(hiddenFields ?? {}).map(([name, value]) => value ? <input key={name} type="hidden" name={name} value={value}/> : null)}
                {placeholder ? (
                    <label className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} aria-hidden="true"/>
                        <input className={cn(adminInputClass, 'pl-9')} name="q" defaultValue={search} placeholder={placeholder} aria-label={placeholder}/>
                    </label>
                ) : null}
                {selects.map((select) => (
                    <select key={select.name} className={adminInputClass} name={select.name} defaultValue={select.defaultValue} aria-label={select.ariaLabel}>
                        <option value="">{select.placeholder}</option>
                        {select.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                ))}
                {hasStatus ? (
                    <select className={adminInputClass} name="status" defaultValue={status ?? ''} aria-label="Filter status">
                        <option value="">Semua status</option>
                        {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                ) : null}
                <div className="flex items-center gap-2">
                    <button className={adminPrimaryButtonClass}>Terapkan</button>
                    <Link className={adminSecondaryButtonClass} href={resetHref}>Reset</Link>
                </div>
            </form>
            {anyFilter ? (
                <p role="status" className="mt-3 text-xs font-bold text-slate-500">
                    Filter aktif{search ? <> · kata kunci “{search}”</> : null}
                    {activeFilterChips.map((chip) => <> · {chip.label}: {chip.valueLabel}</>)}
                    {hasStatus && status ? <> · status {statusOptions.find((option) => option.value === status)?.label ?? status}</> : null} · {resultCount} hasil
                </p>
            ) : null}
        </section>
    )
}
