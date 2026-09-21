import Link from 'next/link'
import { ScrollText } from 'lucide-react'
import {
    AdminBadge,
    AdminCard,
    AdminEmptyState,
    AdminFeedbackBanner,
    AdminMetric,
    AdminPage,
    AdminPageHeader,
    AdminSectionHeading,
    adminSecondaryButtonClass,
} from '@/components/admin/AdminUi'
import AdminListToolbar from '@/components/admin/AdminListToolbar'
import AdminPagination from '@/components/admin/AdminPagination'
import { adminOffset, adminPageHref, adminPageSummary, adminTotalPages, parseAdminPage } from '@/lib/admin-pagination'
import { adminAuditLabel, formatDateTime } from '@/lib/admin-format'
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

function preview(value: unknown) {
    if (value == null) return ''
    try {
        return JSON.stringify(value, null, 2)
    } catch {
        return String(value)
    }
}

const AUDIT_PAGE_SIZE = 50

export default async function AdminAuditPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
    const params = await searchParams
    const authorization = await authorizationService.requireAuthenticated()
    const permissions = new Set(authorization.permissions)

    if (!permissions.has(PERMISSIONS.AUDIT_READ)) {
        return (
            <AdminPage>
                <AdminPageHeader title="Audit Log" description="Jejak tindakan yang tercatat otomatis oleh trigger dan fungsi workflow. Hanya-baca."/>
                <AdminCard><AdminEmptyState title="Akses tidak tersedia" description="Akun ini tidak memiliki permission audit.read."/></AdminCard>
            </AdminPage>
        )
    }

    const page = parseAdminPage(params.page)
    const offset = adminOffset(page, AUDIT_PAGE_SIZE)

    const [result, facets] = await Promise.all([
        adminDirectoryService.listAuditLogs({
            action: params.action || null,
            entityType: params.entity || null,
            limit: AUDIT_PAGE_SIZE,
            offset,
        }),
        adminDirectoryService.getAuditFacets(),
    ])

    const filterParams = { action: params.action || '', entity: params.entity || '' }
    // Halaman ini memakai 50 baris/halaman; tanpa argumen ke-4 ringkasan jatuh
    // ke default 25, sehingga rentang "Menampilkan 26–50" salah dan totalPages
    // pager menjadi dua kali lipat.
    const summary = adminPageSummary(page, result.logs.length, result.total, AUDIT_PAGE_SIZE)
    const totalPages = adminTotalPages(result.total, AUDIT_PAGE_SIZE)
    const hasFilter = Boolean(params.action || params.entity)

    return (
        <AdminPage>
            <AdminPageHeader
                title="Audit Log"
                description="Jejak tindakan yang tercatat otomatis oleh trigger dan fungsi workflow. Hanya-baca."
                steps={['Filter aksi atau entitas', 'Buka payload bila perlu', 'Lanjut ke halaman lain lewat pager']}
            />

            <AdminFeedbackBanner ok={params.ok} error={params.error}/>

            <section className="grid gap-3 sm:grid-cols-3">
                <AdminMetric label="Total catatan" value={result.total} helper="Seluruh audit log" icon={<ScrollText size={18}/>} tone="blue"/>
                <AdminMetric label="Jenis aksi" value={facets.actions.length} helper="Nilai unik" icon={<ScrollText size={18}/>} tone="violet"/>
                <AdminMetric label="Jenis entitas" value={facets.entityTypes.length} helper="Nilai unik" icon={<ScrollText size={18}/>} tone="neutral"/>
            </section>

            <AdminListToolbar
                pathname="/admin/audit"
                search=""
                resultCount={result.total}
                selects={[
                    {
                        name: 'action',
                        ariaLabel: 'Filter aksi',
                        placeholder: 'Semua aksi',
                        defaultValue: params.action || '',
                        options: facets.actions.map((action) => ({ value: action, label: adminAuditLabel(action) })),
                    },
                    {
                        name: 'entity',
                        ariaLabel: 'Filter entitas',
                        placeholder: 'Semua entitas',
                        defaultValue: params.entity || '',
                        options: facets.entityTypes.map((entity) => ({ value: entity, label: entity })),
                    },
                ]}
            />

            <AdminCard className="overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
                    <AdminSectionHeading
                        step={1}
                        title="Jejak terbaru"
                        description={hasFilter ? `${result.total} catatan sesuai filter.` : `${result.total} catatan, terbaru lebih dulu.`}
                    />
                    <AdminBadge>{result.logs.length} di halaman ini</AdminBadge>
                </div>

                        {result.logs.length === 0 ? (
                            <AdminEmptyState
                                title={hasFilter || page > 1 ? 'Tidak ada catatan' : 'Belum ada catatan audit'}
                                description={page > 1 && result.logs.length === 0 && page > totalPages
                                    ? `Daftar hanya punya ${totalPages} halaman. Nomor halaman di alamat mungkin sudah usang.`
                                    : hasFilter
                                        ? 'Tidak ada audit log yang cocok dengan filter ini. Coba kosongkan filter.'
                                        : 'Audit log muncul otomatis saat ada tindakan administratif yang terekam.'}
                                action={page > totalPages ? <Link className={adminSecondaryButtonClass} href={adminPageHref('/admin/audit', filterParams, totalPages)}>Ke halaman terakhir</Link> : undefined}
                            />
                        ) : (
                    <div className="divide-y divide-slate-100">
                        {result.logs.map((log) => (
                            <div key={log.id} className="p-5 transition hover:bg-slate-50/60">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-xs font-black text-slate-900" title={log.action}>{adminAuditLabel(log.action)}</span>
                                            <AdminBadge variant="blue">{log.entity_type}</AdminBadge>
                                        </div>
                                        <div className="mt-1.5 text-xs font-medium text-slate-500">
                                            {formatDateTime(log.created_at)} · {log.actor_name || 'Sistem'}
                                            {log.entity_id ? <> · <span className="font-mono">{log.entity_id.slice(0, 8)}…</span></> : null}
                                        </div>
                                    </div>
                                    <span className="font-mono text-[11px] font-bold text-slate-500">#{log.id}</span>
                                </div>
                                {(log.old_data != null || log.new_data != null) ? (
                                    <details className="mt-3">
                                        <summary className="cursor-pointer text-[11px] font-extrabold uppercase tracking-wide text-slate-500 hover:text-slate-600">Lihat payload</summary>
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

                {result.logs.length > 0 || page > totalPages ? (
                    <AdminPagination
                        pathname="/admin/audit"
                        params={{ action: params.action, entity: params.entity }}
                        summary={summary}
                        noun="catatan"
                        className="border-t border-slate-200"
                    />
                ) : null}
            </AdminCard>
        </AdminPage>
    )
}
