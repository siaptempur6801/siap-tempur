import Link from 'next/link'
import { Search } from 'lucide-react'
import { adminInputClass, adminPrimaryButtonClass, adminSecondaryButtonClass } from '@/components/admin/AdminUi'
import { cn } from '@/lib/utils'

/**
 * Toolbar daftar admin: pencarian + filter status.
 *
 * Filter hidup di URL (`method="get"`) sehingga bisa di-bookmark, dibagikan, dan
 * bertahan saat admin membuka detail lalu kembali — `docs/ADMIN_UI_UX_STANDARD.md`
 * §6. Nomor halaman sengaja TIDAK ikut dikirim: setiap perubahan filter
 * mengembalikan daftar ke halaman 1, karena halaman 5 dari hasil pencarian lama
 * hampir selalu kosong dan itu membingungkan.
 *
 * `contextHidden` dipakai halaman yang datanya terikat program/track: nilai itu
 * harus ikut terkirim supaya filter tidak diam-diam berpindah konteks.
 */
export default function AdminListToolbar({
    pathname,
    search,
    status,
    statusOptions,
    placeholder,
    resultCount,
    program,
    track,
    contextHidden = true,
}: {
    pathname: string
    search: string
    status: string
    /** Nilai + label yang dibaca admin (mis. `draft` → "Draf"). */
    statusOptions: ReadonlyArray<{ value: string; label: string }>
    placeholder: string
    /** Jumlah hasil dengan filter aktif; dipakai di keterangan filter. */
    resultCount: number
    program?: string
    track?: string
    contextHidden?: boolean
}) {
    const resetHref = (() => {
        if (!contextHidden || !program || !track) return pathname
        return `${pathname}?program=${encodeURIComponent(program)}&track=${encodeURIComponent(track)}`
    })()

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <form className="grid gap-3 md:grid-cols-[minmax(220px,1.6fr)_1fr_auto]" method="get">
                {contextHidden && program && track ? (
                    <>
                        <input type="hidden" name="program" value={program}/>
                        <input type="hidden" name="track" value={track}/>
                    </>
                ) : null}
                <label className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                    <input className={cn(adminInputClass, 'pl-9')} name="q" defaultValue={search} placeholder={placeholder} aria-label={placeholder}/>
                </label>
                <select className={adminInputClass} name="status" defaultValue={status} aria-label="Filter status">
                    <option value="">Semua status</option>
                    {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <div className="flex items-center gap-2">
                    <button className={adminPrimaryButtonClass}>Terapkan</button>
                    <Link className={adminSecondaryButtonClass} href={resetHref}>Reset</Link>
                </div>
            </form>
            {(search || status) ? (
                <p role="status" className="mt-3 text-xs font-bold text-slate-500">
                    Filter aktif{search ? <> · kata kunci “{search}”</> : null}{status ? <> · status <span className="font-mono">{status}</span></> : null} · {resultCount} hasil
                </p>
            ) : null}
        </section>
    )
}
