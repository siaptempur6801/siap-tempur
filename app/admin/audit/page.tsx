import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ScrollText, Search } from 'lucide-react'
import {
    AdminBadge,
    AdminCard,
    AdminEmptyState,
    AdminMetric,
    AdminPageHeader,
    AdminSectionHeading,
    adminButtonClass,
    adminInputClass,
    adminSecondaryButtonClass,
} from '@/components/admin/AdminUi'
import { cn } from '@/lib/utils'
import { PERMISSIONS } from '@/src/auth/permissions'
import { authorizationService } from '@/src/services/authorization.service'
import { adminDirectoryService } from '@/src/services/admin-directory.service'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Audit Log.
 *
 * Sebelumnya `audit.read` hanya dimiliki SUPER_ADMIN dan ADMIN tanpa halaman
 * apa pun — jejak audit menumpuk (923 baris di staging) tanpa cara membacanya
 * selain SQL langsung.
 *
 * `old_data`/`new_data` dapat memuat isi soal, jadi jumlah baris dibatasi di
 * database (maksimal 200 per permintaan) dan payload ditampilkan dalam blok
 * yang bisa dibuka-tutup, bukan langsung terhampar.
 */

type SearchParams = {
    action?: string
    entity?: string
    page?: string
    ok?: string
    error?: string
}

const PAGE_SIZE = 50

function fmt(value: string | null) {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '—'
    return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(date)
}

function preview(value: unknown) {
    if (value == null) return ''
    try {
        return JSON.stringify(value, null, 2)
    } catch {
        return String(value)
    }
}

export default async function AdminAuditPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
    const params = await searchParams
    const authorization = await authorizationService.requireAuthenticated()
    const permissions = new Set(authorization.permissions)

    if (!permissions.has(PERMISSIONS.AUDIT_READ)) {
        redirect('/cpns/dashboard?admin=no-access')
    }

    const page = Math.max(Number(params.page ?? '1') || 1, 1)
    const offset = (page - 1) * PAGE_SIZE

    const [result, facets] = await Promise.all([
        adminDirectoryService.listAuditLogs({
            action: params.action || null,
            entityType: params.entity || null,
            limit: PAGE_SIZE,
            offset,
        }),
        adminDirectoryService.getAuditFacets(),
    ])

    const totalPages = Math.max(Math.ceil(result.total / PAGE_SIZE), 1)
    const hasFilter = Boolean(params.action || params.entity)

    function pageHref(target: number) {
        const query = new URLSearchParams()
        if (params.action) query.set('action', params.action)
        if (params.entity) query.set('entity', params.entity)
        if (target > 1) query.set('page', String(target))
        const suffix = query.toString()
        return suffix ? `/admin/audit?${suffix}` : '/admin/audit'
    }

    return (
        <div className="space-y-5 pb-10">
            <AdminPageHeader
                title="Audit Log"
                description="Jejak tindakan yang tercatat otomatis oleh trigger dan fungsi workflow. Hanya-baca."
            />

            {(params.ok || params.error) ? (
                <div role="status" className={cn('rounded-xl border px-4 py-3 text-sm font-bold shadow-sm', params.error ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800')}>
                    {params.error || params.ok}
                </div>
            ) : null}

            <section className="grid gap-3 sm:grid-cols-3">
                <AdminMetric label="Total catatan" value={result.total} helper="Seluruh audit log" icon={<ScrollText size={18}/>} tone="blue"/>
                <AdminMetric label="Jenis aksi" value={facets.actions.length} helper="Nilai unik" icon={<ScrollText size={18}/>} tone="violet"/>
                <AdminMetric label="Jenis entitas" value={facets.entityTypes.length} helper="Nilai unik" icon={<ScrollText size={18}/>} tone="neutral"/>
            </section>

            <AdminCard className="p-4">
                <form className="grid gap-3 md:grid-cols-[1fr_1fr_auto]" method="get">
                    <label className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                        <select className={`${adminInputClass} pl-9`} name="action" defaultValue={params.action || ''} aria-label="Filter aksi">
                            <option value="">Semua aksi</option>
                            {facets.actions.map((action) => <option key={action} value={action}>{action}</option>)}
                        </select>
                    </label>
                    <select className={adminInputClass} name="entity" defaultValue={params.entity || ''} aria-label="Filter entitas">
                        <option value="">Semua entitas</option>
                        {facets.entityTypes.map((entity) => <option key={entity} value={entity}>{entity}</option>)}
                    </select>
                    <div className="flex gap-2">
                        <button className={adminButtonClass}>Terapkan</button>
                        <Link className={adminSecondaryButtonClass} href="/admin/audit">Reset</Link>
                    </div>
                </form>
            </AdminCard>

            <AdminCard className="overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
                    <AdminSectionHeading
                        title="Jejak terbaru"
                        description={hasFilter ? `${result.total} catatan sesuai filter.` : `${result.total} catatan, terbaru lebih dulu.`}
                    />
                    <AdminBadge>{result.logs.length} di halaman ini</AdminBadge>
                </div>

                {result.logs.length === 0 ? (
                    <AdminEmptyState title="Tidak ada catatan" description="Tidak ada audit log yang cocok dengan filter ini. Coba kosongkan filter."/>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {result.logs.map((log) => (
                            <div key={log.id} className="p-5 transition hover:bg-slate-50/60">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-mono text-xs font-black text-slate-900">{log.action}</span>
                                            <AdminBadge variant="blue">{log.entity_type}</AdminBadge>
                                        </div>
                                        <div className="mt-1.5 text-xs font-medium text-slate-500">
                                            {fmt(log.created_at)} · {log.actor_name || 'Sistem'}
                                            {log.entity_id ? <> · <span className="font-mono">{log.entity_id.slice(0, 8)}…</span></> : null}
                                        </div>
                                    </div>
                                    <span className="font-mono text-[11px] font-bold text-slate-300">#{log.id}</span>
                                </div>
                                {(log.old_data != null || log.new_data != null) ? (
                                    <details className="mt-3">
                                        <summary className="cursor-pointer text-[11px] font-extrabold uppercase tracking-wide text-slate-400 hover:text-slate-600">Lihat payload</summary>
                                        <div className="mt-2 grid gap-2 lg:grid-cols-2">
                                            {log.old_data != null ? (
                                                <div>
                                                    <div className="mb-1 text-[10px] font-extrabold uppercase tracking-wide text-red-500">Sebelum</div>
                                                    <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-950 p-3 text-[11px] leading-5 text-slate-200">{preview(log.old_data)}</pre>
                                                </div>
                                            ) : null}
                                            {log.new_data != null ? (
                                                <div>
                                                    <div className="mb-1 text-[10px] font-extrabold uppercase tracking-wide text-emerald-600">Sesudah</div>
                                                    <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-950 p-3 text-[11px] leading-5 text-slate-200">{preview(log.new_data)}</pre>
                                                </div>
                                            ) : null}
                                        </div>
                                    </details>
                                ) : null}
                            </div>
                        ))}
                    </div>
                )}

                {totalPages > 1 ? (
                    <div className="flex items-center justify-between gap-3 border-t border-slate-200 p-4">
                        {page > 1 ? <Link className={adminSecondaryButtonClass} href={pageHref(page - 1)}>Sebelumnya</Link> : <span/>}
                        <span className="text-xs font-bold text-slate-500">Halaman {page} dari {totalPages}</span>
                        {page < totalPages ? <Link className={adminSecondaryButtonClass} href={pageHref(page + 1)}>Berikutnya</Link> : <span/>}
                    </div>
                ) : null}
            </AdminCard>
        </div>
    )
}
