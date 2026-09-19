import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Building2, CalendarDays, Link2, Plus, RefreshCcw, Search, Users } from 'lucide-react'
import {
    AdminBadge,
    AdminCard,
    AdminEmptyState,
    AdminMetric,
    AdminPageHeader,
    AdminSectionHeading,
    adminButtonClass,
    adminInputClass,
    adminPrimaryButtonClass,
    adminSecondaryButtonClass,
} from '@/components/admin/AdminUi'
import { cn } from '@/lib/utils'
import ParticipantImportPanel from '@/components/admin/ParticipantImportPanel'
import BatchExamPanel from '@/components/admin/BatchExamPanel'
import { PERMISSIONS } from '@/src/auth/permissions'
import { authorizationService } from '@/src/services/authorization.service'
import {
    batchInviteUrl,
    batchStatusLabel,
    organizationService,
    organizationStatusLabel,
    organizationTypeLabel,
    participantStatusLabel,
} from '@/src/services/organization.service'
import { organizationExamService } from '@/src/services/organization-exam.service'
import { saveOrgTemplateAction } from '@/app/actions/admin-organization-exam'
import {
    durationMinutes,
    explanationLabel,
    rankingLabel,
    templateComposition,
    templateShortages,
    templateStatusLabel,
} from '@/lib/organization-exam'
import {
    deleteOrganizationAction,
    removeParticipantAction,
    rotateBatchInviteAction,
    saveBatchAction,
    saveOrganizationAction,
    setParticipantStatusAction,
} from '@/app/actions/admin-organization'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Instansi & Batch — MVP CPNS Instansi Managed Service §6.1 & §6.2.
 *
 * PRD §10A menyarankan rute `/cpns/dashboard/admin/instansi`. Pohon itu sudah
 * TIDAK ADA sejak modul admin dipindahkan ke namespace kanonik `/admin/**` pada
 * 2026-09-18, jadi halaman ini memakai `/admin/organizations` — konsisten dengan
 * `docs/ADMIN_UI_UX_STANDARD.md` §4: "Route canonical harus berada di `/admin/*`".
 *
 * Otorisasi rincinya ada di database. Halaman ini menyembunyikan aksi yang pasti
 * ditolak, tetapi tidak menjadi pengaman.
 */

type SearchParams = {
    q?: string
    status?: string
    org?: string
    batch?: string
    new?: string
    template?: string
    ok?: string
    error?: string
}

const ORG_TYPES = ['instansi', 'sekolah', 'komunitas', 'lainnya'] as const
const BATCH_STATUSES = ['draft', 'active', 'closed', 'archived'] as const
const PARTICIPANT_STATUSES = ['registered', 'active', 'completed', 'withdrawn'] as const

const ORG_STATUS_VARIANT: Record<string, 'green' | 'neutral'> = { active: 'green', inactive: 'neutral' }
const BATCH_STATUS_VARIANT: Record<string, 'green' | 'neutral' | 'blue' | 'orange'> = {
    draft: 'neutral',
    active: 'green',
    closed: 'blue',
    archived: 'orange',
}
const PARTICIPANT_STATUS_VARIANT: Record<string, 'green' | 'neutral' | 'blue' | 'orange'> = {
    registered: 'blue',
    active: 'green',
    completed: 'neutral',
    withdrawn: 'orange',
}

function fmt(value: string | null) {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '—'
    return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(date)
}

/** Nilai untuk `<input type="datetime-local">` dalam WIB. */
function localDateTime(value: string | null) {
    if (!value) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    return new Date(date.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 16)
}

function Field({ label, children, hint, className }: { label: string; children: React.ReactNode; hint?: string; className?: string }) {
    return (
        <label className={cn('space-y-1.5', className)}>
            <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400">{label}</span>
            {children}
            {hint ? <span className="block text-[11px] font-medium text-slate-400">{hint}</span> : null}
        </label>
    )
}

export default async function AdminOrganizationsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
    const params = await searchParams
    const authorization = await authorizationService.requireAuthenticated()
    if (!authorization.permissions.includes(PERMISSIONS.ORGANIZATION_MANAGE)) {
        redirect('/cpns/dashboard?admin=no-access')
    }

    const list = await organizationService.listOrganizations({ search: params.q || null, status: params.status || null, limit: 100 })
    const detail = params.org ? await organizationService.getOrganization(params.org) : null

    // Peserta hanya diambil bila ada batch yang dipilih — menghindari query
    // seluruh peserta instansi hanya untuk menampilkan satu batch.
    const selectedBatch = detail && params.batch && params.batch !== 'new'
        ? detail.batches.find((batch) => batch.id === params.batch) ?? null
        : null
    const participants = selectedBatch
        ? await organizationService.listParticipants({ batchId: selectedBatch.id, limit: 100 })
        : null

    // Template milik INSTANSI, jadi diambil begitu ada instansi yang dibuka —
    // bukan hanya ketika ada batch terpilih. Versi pertama menggantungkan keduanya
    // pada batch terpilih, sehingga daftar template tidak pernah terlihat sampai
    // admin membuka salah satu batch. Ketahuan oleh E2E, bukan oleh typecheck.
    const templateData = params.org ? await organizationExamService.listTemplates(params.org) : null
    // Assignment melekat pada batch, jadi hanya diambil bila ada batch terpilih.
    const assignments = selectedBatch ? await organizationExamService.listAssignments(selectedBatch.id) : []

    const activeOrganizations = list.organizations.filter((org) => org.status === 'active').length
    const totalBatches = list.organizations.reduce((sum, org) => sum + org.batch_count, 0)
    const totalParticipants = list.organizations.reduce((sum, org) => sum + org.participant_count, 0)

    const creatingOrg = params.new === '1'
    const editingOrg = detail?.organization ?? null
    const showOrgForm = creatingOrg || Boolean(editingOrg)
    const editingTemplate = params.template && params.template !== 'new'
        ? templateData?.templates.find((template) => template.id === params.template) ?? null
        : null
    const creatingBatch = params.batch === 'new'
    const showBatchForm = (creatingBatch || selectedBatch) && Boolean(editingOrg)

    const baseParams = new URLSearchParams()
    if (params.q) baseParams.set('q', params.q)
    if (params.status) baseParams.set('status', params.status)

    /**
     * Bangun tautan dengan konteks halaman yang dipertahankan.
     *
     * Daftar key-nya ditulis SEKALI dan diteruskan otomatis. Versi sebelumnya
     * menyebut key satu per satu (`org`, `batch`, `new`) dan lupa menambahkan
     * `template` ketika fitur template ditambahkan — akibatnya tombol "Template
     * baru" dan "Ubah" membuka halaman yang sama tanpa form apa pun, tanpa galat.
     * Ketahuan oleh E2E, bukan oleh typecheck.
     */
    const CONTEXT_KEYS = ['q', 'status', 'org', 'batch', 'new', 'template'] as const

    function orgHref(overrides: Partial<SearchParams>) {
        const merged = { ...params, ...overrides }
        const query = new URLSearchParams()
        for (const key of CONTEXT_KEYS) {
            const value = merged[key]
            if (value) query.set(key, value)
        }
        const value = query.toString()
        return value ? `/admin/organizations?${value}` : '/admin/organizations'
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || ''

    return (
        <div className="space-y-5 pb-10">
            <AdminPageHeader
                title="Instansi & Batch"
                description="Kelola instansi mitra dan batch pesertanya. Peserta masuk sendiri lewat tautan undangan batch, atau diimpor sebagai cadangan."
                action={<Link className={adminPrimaryButtonClass} href={orgHref({ new: '1', org: undefined, batch: undefined })}><Plus size={16}/>Instansi baru</Link>}
            />

            {(params.ok || params.error) ? (
                <div role="status" className={cn('rounded-xl border px-4 py-3 text-sm font-bold shadow-sm', params.error ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800')}>
                    {params.error || params.ok}
                </div>
            ) : null}

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <AdminMetric label="Instansi" value={list.total} helper={`${activeOrganizations} aktif`} icon={<Building2 size={18}/>} tone="blue"/>
                <AdminMetric label="Batch" value={totalBatches} helper="Seluruh instansi" icon={<CalendarDays size={18}/>} tone="violet"/>
                <AdminMetric label="Peserta" value={totalParticipants} helper="Terdaftar di semua batch" icon={<Users size={18}/>} tone="green"/>
                <AdminMetric label="Batch aktif" value={list.organizations.reduce((sum, org) => sum + org.active_batch_count, 0)} helper="Sedang berjalan" icon={<CalendarDays size={18}/>} tone="green"/>
            </section>

            <AdminCard className="p-4">
                <form className="grid gap-3 md:grid-cols-[minmax(220px,1.6fr)_1fr_auto]" method="get">
                    <label className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                        <input className={`${adminInputClass} pl-9`} name="q" defaultValue={params.q || ''} placeholder="Cari nama, kode, kota, atau PIC..." aria-label="Cari instansi"/>
                    </label>
                    <select className={adminInputClass} name="status" defaultValue={params.status || ''} aria-label="Filter status">
                        <option value="">Semua status</option>
                        <option value="active">Aktif</option>
                        <option value="inactive">Nonaktif</option>
                    </select>
                    <div className="flex gap-2">
                        <button className={adminButtonClass}>Cari</button>
                        <Link className={adminSecondaryButtonClass} href="/admin/organizations">Reset</Link>
                    </div>
                </form>
            </AdminCard>

            {/* ------------------------------------------------- daftar instansi */}
            <AdminCard className="overflow-hidden">
                <div className="border-b border-slate-200 p-5">
                    <AdminSectionHeading title="Daftar instansi" description={`${list.organizations.length} dari ${list.total} instansi ditampilkan.`}/>
                </div>
                {list.organizations.length === 0 ? (
                    <AdminEmptyState
                        title="Belum ada instansi"
                        description={params.q || params.status ? 'Tidak ada instansi yang cocok dengan filter ini.' : 'Tambahkan instansi pertama untuk mulai mengelola batch peserta.'}
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px] text-left text-sm">
                            <thead className="bg-slate-50 text-[11px] font-extrabold uppercase tracking-wide text-slate-400">
                                <tr>
                                    <th className="px-5 py-3">Instansi</th>
                                    <th className="px-4 py-3">Jenis</th>
                                    <th className="px-4 py-3">PIC</th>
                                    <th className="px-4 py-3 text-right">Batch</th>
                                    <th className="px-4 py-3 text-right">Peserta</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-5 py-3 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {list.organizations.map((org) => (
                                    <tr key={org.id} className={cn('transition hover:bg-slate-50/70', org.id === params.org && 'bg-blue-50/60')}>
                                        <td className="px-5 py-4">
                                            <div className="font-extrabold text-slate-900">{org.name}</div>
                                            <div className="mt-0.5 font-mono text-[11px] font-semibold text-slate-400">{org.code}</div>
                                        </td>
                                        <td className="px-4 py-4 font-semibold text-slate-600">{organizationTypeLabel(org.type)}</td>
                                        <td className="px-4 py-4">
                                            {org.contact_name ? (
                                                <>
                                                    <div className="font-semibold text-slate-700">{org.contact_name}</div>
                                                    <div className="mt-0.5 text-xs font-medium text-slate-400">{org.contact_phone || org.contact_email || '—'}</div>
                                                </>
                                            ) : <span className="text-xs font-bold text-slate-400">Belum diisi</span>}
                                        </td>
                                        <td className="px-4 py-4 text-right font-bold text-slate-700">
                                            {org.batch_count}
                                            {org.active_batch_count > 0 ? <span className="ml-1 text-[11px] font-bold text-emerald-600">({org.active_batch_count} aktif)</span> : null}
                                        </td>
                                        <td className="px-4 py-4 text-right font-bold text-slate-700">{org.participant_count}</td>
                                        <td className="px-4 py-4"><AdminBadge variant={ORG_STATUS_VARIANT[org.status] || 'neutral'}>{organizationStatusLabel(org.status)}</AdminBadge></td>
                                        <td className="px-5 py-4 text-right">
                                            <Link className="text-xs font-extrabold text-blue-600 hover:text-blue-700" href={orgHref({ org: org.id, batch: undefined, new: undefined })}>Kelola</Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </AdminCard>

            {/* ------------------------------------------------- form instansi */}
            {showOrgForm ? (
                <AdminCard className="overflow-hidden ring-4 ring-blue-50">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-gradient-to-r from-blue-50/80 to-white p-5">
                        <AdminSectionHeading
                            title={editingOrg ? `Ubah ${editingOrg.name}` : 'Instansi baru'}
                            description={editingOrg ? 'Perubahan langsung berlaku untuk batch dan peserta di bawahnya.' : 'Isi identitas instansi dan kontak PIC-nya.'}
                        />
                        <Link className="text-sm font-extrabold text-slate-500 hover:text-slate-800" href={orgHref({ new: undefined, org: undefined, batch: undefined })}>Tutup</Link>
                    </div>
                    <form action={saveOrganizationAction} className="grid gap-4 p-5 lg:grid-cols-3">
                        <input type="hidden" name="id" value={editingOrg?.id ?? ''}/>
                        <Field label="Nama instansi" className="lg:col-span-2">
                            <input className={adminInputClass} name="name" required minLength={2} defaultValue={editingOrg?.name ?? ''} placeholder="Dinas Pendidikan Kota Medan"/>
                        </Field>
                        <Field label="Kode" hint="2–24 karakter: A–Z, 0–9, atau -">
                            <input className={adminInputClass} name="code" required defaultValue={editingOrg?.code ?? ''} placeholder="DINAS-MEDAN"/>
                        </Field>
                        <Field label="Jenis">
                            <select className={adminInputClass} name="type" defaultValue={editingOrg?.type ?? 'instansi'}>
                                {ORG_TYPES.map((type) => <option key={type} value={type}>{organizationTypeLabel(type)}</option>)}
                            </select>
                        </Field>
                        <Field label="Status">
                            <select className={adminInputClass} name="status" aria-label="Status instansi" defaultValue={editingOrg?.status ?? 'active'}>
                                <option value="active">Aktif</option>
                                <option value="inactive">Nonaktif</option>
                            </select>
                        </Field>
                        <Field label="Kota">
                            <input className={adminInputClass} name="city" defaultValue={editingOrg?.city ?? ''} placeholder="Medan"/>
                        </Field>
                        <Field label="Provinsi">
                            <input className={adminInputClass} name="province" defaultValue={editingOrg?.province ?? ''} placeholder="Sumatera Utara"/>
                        </Field>
                        <Field label="Alamat" className="lg:col-span-2">
                            <input className={adminInputClass} name="address" defaultValue={editingOrg?.address ?? ''} placeholder="Jl. ..."/>
                        </Field>
                        <Field label="Nama PIC" hint="PIC bukan akun sistem pada MVP (§15)">
                            <input className={adminInputClass} name="contact_name" defaultValue={editingOrg?.contact_name ?? ''} placeholder="Budi Santoso"/>
                        </Field>
                        <Field label="Telepon PIC">
                            <input className={adminInputClass} name="contact_phone" defaultValue={editingOrg?.contact_phone ?? ''} placeholder="0812..."/>
                        </Field>
                        <Field label="Email PIC">
                            <input className={adminInputClass} name="contact_email" type="email" defaultValue={editingOrg?.contact_email ?? ''} placeholder="pic@instansi.go.id"/>
                        </Field>
                        <Field label="Catatan" className="lg:col-span-3">
                            <textarea className={`${adminInputClass} min-h-20 resize-y`} name="notes" defaultValue={editingOrg?.notes ?? ''} placeholder="Catatan internal..."/>
                        </Field>
                        <div className="flex flex-wrap gap-2 lg:col-span-3">
                            <button className={adminPrimaryButtonClass}>{editingOrg ? 'Simpan perubahan' : 'Buat instansi'}</button>
                            <Link className={adminSecondaryButtonClass} href={orgHref({ new: undefined, org: undefined, batch: undefined })}>Batal</Link>
                        </div>
                    </form>

                    {editingOrg ? (
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4">
                            <p className="text-xs font-semibold text-slate-500">
                                Hapus hanya bisa bila instansinya belum punya peserta. Bila sudah ada, nonaktifkan saja supaya riwayat dan export tetap utuh.
                            </p>
                            <form action={deleteOrganizationAction}>
                                <input type="hidden" name="id" value={editingOrg.id}/>
                                <input type="hidden" name="name" value={editingOrg.name}/>
                                <input type="hidden" name="q" value={params.q || ''}/>
                                <input type="hidden" name="status" value={params.status || ''}/>
                                <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-100">Hapus instansi</button>
                            </form>
                        </div>
                    ) : null}

                    {editingOrg ? (
                        <div className="border-t border-slate-200 p-5">
                            <AdminSectionHeading
                                title="Template ujian"
                                description="Cetak biru komposisi ujian. Template dipakai untuk membentuk exam pada batch mana pun."
                                action={<Link className={adminPrimaryButtonClass} href={orgHref({ org: editingOrg.id, template: 'new', batch: undefined })}><Plus size={16}/>Template baru</Link>}
                            />

                            {templateData ? (
                                <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold">
                                    <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-600">Soal terbit tersedia</span>
                                    <span className={cn('rounded-md px-2 py-1 ring-1', (templateData.available.TWK ?? 0) >= 30 ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-red-50 text-red-700 ring-red-200')}>TWK {templateData.available.TWK ?? 0}</span>
                                    <span className={cn('rounded-md px-2 py-1 ring-1', (templateData.available.TIU ?? 0) >= 35 ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-red-50 text-red-700 ring-red-200')}>TIU {templateData.available.TIU ?? 0}</span>
                                    <span className={cn('rounded-md px-2 py-1 ring-1', (templateData.available.TKP ?? 0) >= 45 ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-red-50 text-red-700 ring-red-200')}>TKP {templateData.available.TKP ?? 0}</span>
                                </div>
                            ) : null}

                            {editingTemplate || params.template === 'new' ? (
                                <form action={saveOrgTemplateAction} className="mt-4 grid gap-4 rounded-xl border border-blue-200 bg-blue-50/40 p-4 lg:grid-cols-4">
                                    <input type="hidden" name="template_id" value={editingTemplate?.id ?? ''}/>
                                    <input type="hidden" name="org" value={editingOrg.id}/>
                                    <input type="hidden" name="batch" value={selectedBatch?.id ?? ''}/>
                                    <Field label="Nama template" className="lg:col-span-2">
                                        <input className={adminInputClass} name="name" required minLength={2} defaultValue={editingTemplate?.name ?? ''} placeholder="Full Tryout SKD Standar"/>
                                    </Field>
                                    <Field label="Berlaku untuk">
                                        <select className={adminInputClass} name="template_organization_id" defaultValue={editingTemplate?.organization_id ?? ''} aria-label="Cakupan template">
                                            <option value="">Semua instansi</option>
                                            <option value={editingOrg.id}>Hanya {editingOrg.name}</option>
                                        </select>
                                    </Field>
                                    <Field label="Status">
                                        <select className={adminInputClass} name="template_status" defaultValue={editingTemplate?.status ?? 'active'} aria-label="Status template">
                                            <option value="draft">Draft</option>
                                            <option value="active">Aktif</option>
                                            <option value="archived">Diarsipkan</option>
                                        </select>
                                    </Field>
                                    <Field label="Jumlah TWK">
                                        <input className={adminInputClass} name="twk_count" type="number" min="0" max="200" defaultValue={editingTemplate?.twk_count ?? 30}/>
                                    </Field>
                                    <Field label="Jumlah TIU">
                                        <input className={adminInputClass} name="tiu_count" type="number" min="0" max="200" defaultValue={editingTemplate?.tiu_count ?? 35}/>
                                    </Field>
                                    <Field label="Jumlah TKP">
                                        <input className={adminInputClass} name="tkp_count" type="number" min="0" max="200" defaultValue={editingTemplate?.tkp_count ?? 45}/>
                                    </Field>
                                    <Field label="Durasi (menit)">
                                        <input className={adminInputClass} name="duration_minutes" type="number" min="1" defaultValue={editingTemplate ? durationMinutes(editingTemplate.duration_seconds) : 100}/>
                                    </Field>
                                    <Field label="Batas attempt">
                                        <input className={adminInputClass} name="max_attempts" type="number" min="1" defaultValue={editingTemplate?.max_attempts ?? 1}/>
                                    </Field>
                                    <Field label="Pembahasan">
                                        <select className={adminInputClass} name="show_explanation" defaultValue={editingTemplate?.show_explanation ?? 'after_exam'} aria-label="Pengaturan pembahasan">
                                            <option value="after_exam">{explanationLabel('after_exam')}</option>
                                            <option value="after_close">{explanationLabel('after_close')}</option>
                                            <option value="never">{explanationLabel('never')}</option>
                                        </select>
                                    </Field>
                                    <Field label="Visibilitas ranking">
                                        <select className={adminInputClass} name="ranking_visibility" defaultValue={editingTemplate?.ranking_visibility ?? 'internal'} aria-label="Visibilitas ranking">
                                            <option value="internal">{rankingLabel('internal')}</option>
                                            <option value="hidden">{rankingLabel('hidden')}</option>
                                            <option value="public">{rankingLabel('public')}</option>
                                        </select>
                                    </Field>
                                    <div className="flex flex-wrap items-center gap-4 lg:col-span-4">
                                        <label className="flex items-center gap-2">
                                            <input type="checkbox" name="randomize_questions" defaultChecked={editingTemplate ? editingTemplate.randomize_questions : true} className="h-4 w-4 rounded border-slate-300"/>
                                            <span className="text-sm font-bold text-slate-700">Acak urutan soal</span>
                                        </label>
                                        <label className="flex items-center gap-2" title="Belum diterapkan oleh mesin ujian">
                                            <input type="checkbox" name="randomize_options" defaultChecked={editingTemplate?.randomize_options ?? false} className="h-4 w-4 rounded border-slate-300"/>
                                            <span className="text-sm font-bold text-slate-400">Acak urutan opsi</span>
                                            <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-amber-700">Belum diterapkan</span>
                                        </label>
                                    </div>
                                    <div className="flex flex-wrap gap-2 lg:col-span-4">
                                        <button className={adminPrimaryButtonClass}>{editingTemplate ? 'Simpan template' : 'Buat template'}</button>
                                        <Link className={adminSecondaryButtonClass} href={orgHref({ org: editingOrg.id, template: undefined, batch: undefined })}>Batal</Link>
                                    </div>
                                </form>
                            ) : null}

                            {templateData && templateData.templates.length === 0 ? (
                                <p className="mt-4 text-sm font-semibold text-slate-500">
                                    Belum ada template. Buat template pertama, mis. 30 TWK + 35 TIU + 45 TKP sesuai komposisi SKD.
                                </p>
                            ) : (
                                <div className="mt-4 space-y-2">
                                    {templateData?.templates.map((template) => {
                                        const shortages = templateShortages(template, templateData.available)
                                        const isEditing = template.id === params.template
                                        return (
                                            <div key={template.id} className={cn('rounded-xl border bg-white p-4', isEditing ? 'border-blue-300 ring-2 ring-blue-100' : 'border-slate-200')}>
                                                <div className="flex flex-wrap items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="text-sm font-black text-slate-900">{template.name}</span>
                                                            <AdminBadge variant={template.status === 'active' ? 'green' : 'neutral'}>{templateStatusLabel(template.status)}</AdminBadge>
                                                            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">{template.organization_id ? 'Khusus instansi ini' : 'Semua instansi'}</span>
                                                            {shortages.length === 0 ? (
                                                                <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200">Soal cukup</span>
                                                            ) : (
                                                                <span className="rounded-md bg-red-50 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-red-700 ring-1 ring-red-200">Kurang {shortages.map((row) => `${row.subject} ${row.missing}`).join(', ')}</span>
                                                            )}
                                                        </div>
                                                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold text-slate-500">
                                                            <span>{templateComposition(template)}</span>
                                                            <span>{durationMinutes(template.duration_seconds)} menit</span>
                                                            <span>{template.max_attempts} attempt</span>
                                                            <span>{template.randomize_questions ? 'soal diacak' : 'soal berurutan'}</span>
                                                            <span>pembahasan: {explanationLabel(template.show_explanation)}</span>
                                                        </div>
                                                    </div>
                                                    <Link className="text-xs font-extrabold text-blue-600 hover:text-blue-700" href={orgHref({ org: editingOrg.id, template: template.id, batch: undefined })}>Ubah</Link>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    ) : null}

                    {editingOrg ? (
                        <div className="border-t border-slate-200 bg-slate-50/70 p-5">
                            <AdminSectionHeading
                                title="Batch"
                                description="Satu batch = satu gelombang peserta dengan tautan undangannya sendiri."
                                action={<Link className={adminPrimaryButtonClass} href={orgHref({ org: editingOrg.id, batch: 'new' })}><Plus size={16}/>Batch baru</Link>}
                            />

                            {showBatchForm ? (
                                <form action={saveBatchAction} className="mt-4 grid gap-4 rounded-xl border border-blue-200 bg-blue-50/40 p-4 lg:grid-cols-3">
                                    <input type="hidden" name="batch_id" value={selectedBatch?.id ?? ''}/>
                                    <input type="hidden" name="organization_id" value={editingOrg.id}/>
                                    {/* Konteks filter dibawa supaya menyimpan batch tidak
                                        mengembalikan admin ke daftar tanpa filternya. */}
                                    <input type="hidden" name="q" value={params.q || ''}/>
                                    <input type="hidden" name="status" value={params.status || ''}/>
                                    <Field label="Nama batch" className="lg:col-span-2">
                                        <input className={adminInputClass} name="name" required minLength={2} defaultValue={selectedBatch?.name ?? ''} placeholder="CPNS 2026 Batch A"/>
                                    </Field>
                                    <Field label="Kode" hint="Unik di dalam instansi ini">
                                        <input className={adminInputClass} name="code" required defaultValue={selectedBatch?.code ?? ''} placeholder="CPNS-2026-A"/>
                                    </Field>
                                    <Field label="Mulai (WIB)">
                                        <input className={adminInputClass} name="starts_at" type="datetime-local" defaultValue={localDateTime(selectedBatch?.starts_at ?? null)}/>
                                    </Field>
                                    <Field label="Selesai (WIB)">
                                        <input className={adminInputClass} name="ends_at" type="datetime-local" defaultValue={localDateTime(selectedBatch?.ends_at ?? null)}/>
                                    </Field>
                                    <Field label="Status">
                                        <select className={adminInputClass} name="batch_status" aria-label="Status batch" defaultValue={selectedBatch?.status ?? 'draft'}>
                                            {BATCH_STATUSES.map((status) => <option key={status} value={status}>{batchStatusLabel(status)}</option>)}
                                        </select>
                                    </Field>
                                    <Field label="Catatan" className="lg:col-span-2">
                                        <input className={adminInputClass} name="notes" defaultValue={selectedBatch?.notes ?? ''} placeholder="Catatan batch..."/>
                                    </Field>
                                    <div className="flex flex-wrap items-end gap-2">
                                        <button className={adminPrimaryButtonClass}>{selectedBatch ? 'Simpan batch' : 'Buat batch'}</button>
                                        <Link className={adminSecondaryButtonClass} href={orgHref({ org: editingOrg.id, batch: undefined })}>Batal</Link>
                                    </div>
                                </form>
                            ) : null}

                            {detail && detail.batches.length === 0 ? (
                                <p className="mt-4 text-sm font-semibold text-slate-500">Belum ada batch. Buat batch pertama untuk membagikan tautan undangan ke peserta.</p>
                            ) : (
                                <div className="mt-4 space-y-3">
                                    {detail?.batches.map((batch) => {
                                        const inviteUrl = batchInviteUrl(batch.invite_token, siteUrl)
                                        const isSelected = batch.id === params.batch
                                        return (
                                            <div key={batch.id} className={cn('rounded-xl border bg-white p-4', isSelected ? 'border-blue-300 ring-2 ring-blue-100' : 'border-slate-200')}>
                                                <div className="flex flex-wrap items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="text-sm font-black text-slate-900">{batch.name}</span>
                                                            <AdminBadge variant={BATCH_STATUS_VARIANT[batch.status] || 'neutral'}>{batchStatusLabel(batch.status)}</AdminBadge>
                                                            <span className="font-mono text-[11px] font-semibold text-slate-400">{batch.code}</span>
                                                        </div>
                                                        <div className="mt-1 text-xs font-semibold text-slate-500">
                                                            {fmt(batch.starts_at)} — {fmt(batch.ends_at)}
                                                        </div>
                                                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-slate-500">
                                                            <span>{batch.participant_count} peserta</span>
                                                            <span>{batch.linked_count} sudah punya akun</span>
                                                            <span>{batch.participant_count - batch.linked_count} belum menautkan akun</span>
                                                        </div>
                                                    </div>
                                                    <Link className="text-xs font-extrabold text-blue-600 hover:text-blue-700" href={orgHref({ org: editingOrg.id, batch: batch.id })}>
                                                        {isSelected ? 'Tutup peserta' : 'Lihat peserta'}
                                                    </Link>
                                                </div>

                                                <div className="mt-3 flex flex-wrap items-end gap-2">
                                                    <label className="min-w-0 flex-1 space-y-1.5">
                                                        <span className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-slate-400"><Link2 size={12}/>Tautan undangan peserta</span>
                                                        <input className={`${adminInputClass} font-mono text-xs`} readOnly value={inviteUrl} aria-label={`Tautan undangan ${batch.name}`}/>
                                                    </label>
                                                    <form action={rotateBatchInviteAction}>
                                                        <input type="hidden" name="batch_id" value={batch.id}/>
                                                        <input type="hidden" name="org" value={editingOrg.id}/>
                                                        <input type="hidden" name="q" value={params.q || ''}/>
                                                        <input type="hidden" name="status" value={params.status || ''}/>
                                                        <button className={adminSecondaryButtonClass}><RefreshCcw size={15}/>Rotasi tautan</button>
                                                    </form>
                                                </div>

                                                {isSelected && participants ? (
                                                    <div className="mt-4 border-t border-slate-200 pt-4">
                                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                                            <div className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400">Peserta ({participants.total})</div>
                                                            {batch.participant_count > participants.participants.length ? (
                                                                <span className="text-[11px] font-bold text-slate-400">{participants.participants.length} ditampilkan</span>
                                                            ) : null}
                                                        </div>
                                                        {participants.participants.length === 0 ? (
                                                            <p className="mt-2 text-sm font-semibold text-slate-500">
                                                                Belum ada peserta. Bagikan tautan undangan di atas, atau impor daftar peserta sebagai cadangan.
                                                            </p>
                                                        ) : (
                                                            <div className="mt-2 overflow-x-auto">
                                                                <table className="w-full min-w-[720px] text-left text-sm">
                                                                    <thead className="bg-slate-50 text-[11px] font-extrabold uppercase tracking-wide text-slate-400">
                                                                        <tr>
                                                                            <th className="px-3 py-2">Kode</th>
                                                                            <th className="px-3 py-2">Nama</th>
                                                                            <th className="px-3 py-2">Kontak</th>
                                                                            <th className="px-3 py-2">Akun</th>
                                                                            <th className="px-3 py-2">Status</th>
                                                                            <th className="px-3 py-2 text-right">Aksi</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-slate-100">
                                                                        {participants.participants.map((participant) => (
                                                                            <tr key={participant.id}>
                                                                                <td className="px-3 py-2.5 font-mono text-xs font-bold text-slate-600">{participant.participant_code}</td>
                                                                                <td className="px-3 py-2.5">
                                                                                    <div className="font-semibold text-slate-800">{participant.full_name_snapshot}</div>
                                                                                    {participant.unit ? <div className="text-[11px] font-medium text-slate-400">{participant.unit}</div> : null}
                                                                                </td>
                                                                                <td className="px-3 py-2.5 text-xs font-medium text-slate-500">
                                                                                    {participant.email_snapshot || '—'}
                                                                                    {participant.phone_snapshot ? <div className="text-[11px] text-slate-400">{participant.phone_snapshot}</div> : null}
                                                                                </td>
                                                                                <td className="px-3 py-2.5">
                                                                                    {participant.user_id
                                                                                        ? <AdminBadge variant="green">Tertaut</AdminBadge>
                                                                                        : <AdminBadge variant="orange">Belum</AdminBadge>}
                                                                                </td>
                                                                                <td className="px-3 py-2.5"><AdminBadge variant={PARTICIPANT_STATUS_VARIANT[participant.status] || 'neutral'}>{participantStatusLabel(participant.status)}</AdminBadge></td>
                                                                                <td className="px-3 py-2.5">
                                                                                    <div className="flex items-center justify-end gap-1.5">
                                                                                        <form action={setParticipantStatusAction} className="flex items-center gap-1.5">
                                                                                            <input type="hidden" name="participant_id" value={participant.id}/>
                                                                                            <input type="hidden" name="org" value={editingOrg.id}/>
                                                                                            <input type="hidden" name="batch" value={batch.id}/>
                                                                                            <input type="hidden" name="q" value={params.q || ''}/>
                                                                                            <input type="hidden" name="status" value={params.status || ''}/>
                                                                                            <select className={`${adminInputClass} h-8 py-0 text-[11px]`} name="participant_status" defaultValue={participant.status} aria-label={`Status ${participant.participant_code}`}>
                                                                                                {PARTICIPANT_STATUSES.map((status) => <option key={status} value={status}>{participantStatusLabel(status)}</option>)}
                                                                                            </select>
                                                                                            <button className={`${adminSecondaryButtonClass} h-8 min-h-0 px-2 text-[11px]`}>Ubah</button>
                                                                                        </form>
                                                                                        <form action={removeParticipantAction}>
                                                                                            <input type="hidden" name="participant_id" value={participant.id}/>
                                                                                            <input type="hidden" name="participant_code" value={participant.participant_code}/>
                                                                                            <input type="hidden" name="org" value={editingOrg.id}/>
                                                                                            <input type="hidden" name="batch" value={batch.id}/>
                                                                                            <input type="hidden" name="q" value={params.q || ''}/>
                                                                                            <input type="hidden" name="status" value={params.status || ''}/>
                                                                                            <button className="text-[11px] font-extrabold text-red-600 hover:text-red-700" title="Keluarkan peserta">Keluarkan</button>
                                                                                        </form>
                                                                                    </div>
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        )}

                                                        <ParticipantImportPanel batchId={batch.id} batchCode={batch.code}/>

                                                        {templateData && batch.id === selectedBatch?.id ? (
                                                            <BatchExamPanel
                                                                batchId={batch.id}
                                                                organizationId={editingOrg.id}
                                                                templates={templateData.templates.filter((template) => template.status !== 'archived')}
                                                                available={templateData.available}
                                                                assignments={assignments}
                                                            />
                                                        ) : null}
                                                    </div>
                                                ) : null}
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    ) : null}
                </AdminCard>
            ) : null}

            <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold leading-6 text-slate-500">
                Halaman ini memerlukan permission <code className="font-mono">organization.manage</code>.
                Tautan undangan adalah kunci masuk peserta — merotasinya membuat tautan lama langsung tidak berlaku.
                Batch hanya bisa diaktifkan bila instansinya aktif, dan instansi tidak bisa dinonaktifkan selama masih punya batch aktif.
            </p>
        </div>
    )
}
