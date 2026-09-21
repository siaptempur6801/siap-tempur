import { Skeleton } from '@/components/ui/LoadingState'

/**
 * Skeleton loading untuk halaman admin.
 *
 * Bentuknya mengikuti siluet halaman admin asli — header + kartu + tabel —
 * bukan skeleton produk peserta. Setiap area admin memakai `loading.tsx`
 * yang memanggil mode sesuai kontennya (§9 standar admin):
 *   - `dashboard`: metrik + dua kolom (dipakai /admin dan /admin/reports);
 *   - `table`: toolbar filter + baris daftar (users, audit, articles);
 *   - `workspace`: kartu panel besar (organizations, commerce, questions).
 */

function HeaderArea() {
    return (
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
                <Skeleton className="h-8 w-56"/>
                <Skeleton className="h-4 w-full max-w-xl"/>
            </div>
            <Skeleton className="h-10 w-40"/>
        </header>
    )
}

function TableArea({ rows = 5 }: { rows?: number }) {
    return (
        <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[minmax(220px,1.6fr)_1fr_auto]">
                <Skeleton className="h-11 w-full"/>
                <Skeleton className="h-11 w-full"/>
                <Skeleton className="h-11 w-40"/>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 p-5"><Skeleton className="h-5 w-44"/></div>
                <div className="divide-y divide-slate-100">
                    {Array.from({ length: rows }, (_, row) => (
                        <div key={row} className="flex items-center justify-between gap-4 px-5 py-4">
                            <div className="min-w-0 flex-1 space-y-2">
                                <Skeleton className="h-4 w-1/3"/>
                                <Skeleton className="h-3 w-1/2"/>
                            </div>
                            <Skeleton className="h-6 w-20 rounded-full"/>
                            <Skeleton className="h-8 w-24"/>
                        </div>
                    ))}
                </div>
                <div className="border-t border-slate-200 p-4"><Skeleton className="h-4 w-52"/></div>
            </div>
        </div>
    )
}

function DashboardArea({ metricsCount = 5 }: { metricsCount?: number }) {
    return (
        <div className="space-y-6">
            <section className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
                {Array.from({ length: metricsCount }, (_, item) => <Skeleton key={item} className="h-28 rounded-2xl"/>)}
            </section>
            <section className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.7fr)]">
                <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <Skeleton className="h-5 w-48"/>
                    {Array.from({ length: 5 }, (_, item) => <Skeleton key={item} className="h-12 w-full"/>)}
                </div>
                <div className="space-y-4">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><Skeleton className="h-24 w-full"/></div>
                    <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        {Array.from({ length: 4 }, (_, item) => <Skeleton key={item} className="h-10 w-full"/>)}
                    </div>
                </div>
            </section>
        </div>
    )
}

function WorkspaceArea({ metricsCount = 4 }: { metricsCount?: number }) {
    return (
        <div className="space-y-5">
            {metricsCount > 0 ? (
                <section className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                    {Array.from({ length: metricsCount }, (_, item) => <Skeleton key={item} className="h-28 rounded-2xl"/>)}
                </section>
            ) : null}
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="space-y-2"><Skeleton className="h-5 w-56"/><Skeleton className="h-4 w-80 max-w-full"/></div>
                    <Skeleton className="h-10 w-32"/>
                </div>
                <div className="space-y-3 border-t border-slate-200 pt-4">
                    {Array.from({ length: 4 }, (_, item) => (
                        <div key={item} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4">
                            <div className="min-w-0 flex-1 space-y-2"><Skeleton className="h-4 w-1/3"/><Skeleton className="h-3 w-1/2"/></div>
                            <div className="flex gap-2"><Skeleton className="h-9 w-20"/><Skeleton className="h-9 w-24"/></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export function AdminLoadingSkeleton({
    mode = 'table',
    label = 'Memuat halaman admin',
    metricsCount,
}: {
    mode?: 'dashboard' | 'table' | 'workspace'
    label?: string
    /** Jumlah kartu metrik pada mode dashboard/workspace; `0` menyembunyikan baris metrik. */
    metricsCount?: number
}) {
    return (
        // Ritme vertikal mengikuti `AdminPage` (`flex flex-col gap-6 pb-10`) agar
        // tidak ada lompatan spasi saat halaman selesai dimuat.
        <div className="flex w-full flex-col gap-6 pb-10" role="status" aria-busy="true" aria-label={label}>
            <span className="sr-only">{label}</span>
            <HeaderArea/>
            {mode === 'table' ? <TableArea/> : null}
            {mode === 'dashboard' ? <DashboardArea metricsCount={metricsCount ?? 5}/> : null}
            {mode === 'workspace' ? <WorkspaceArea metricsCount={metricsCount ?? 4}/> : null}
        </div>
    )
}
