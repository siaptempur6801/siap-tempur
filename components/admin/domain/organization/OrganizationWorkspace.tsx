import {
deleteOrganizationAction,
removeParticipantAction,
rotateBatchInviteAction,
setParticipantStatusAction
} from '@/app/actions/admin-organization'
import AdminPagination from '@/components/admin/AdminPagination'
import AdminTableToolbar from '@/components/admin/AdminTableToolbar'
import {
AdminBadge,
AdminCard,
AdminEmptyState,
AdminFeedbackBanner,
AdminPage,
AdminPageHeader,
AdminSectionHeading,
AdminStatusBadge,
AdminTh,
adminInputClass,
adminPrimaryButtonClass,
adminSecondaryButtonClass,
adminTableHeadClass
} from '@/components/admin/AdminUi'
import BatchExamPanel from '@/components/admin/BatchExamPanel'
import ConfirmSubmit from '@/components/admin/ConfirmSubmit'
import { AdminDataTable } from '@/components/admin/data-display/AdminDataTable'
import { BatchForm } from '@/components/admin/domain/organization/BatchForm'
import { OrganizationForm } from '@/components/admin/domain/organization/OrganizationForm'
import { AdminBreadcrumbs } from '@/components/admin/navigation/AdminBreadcrumbs'
import { AdminTabs } from '@/components/admin/navigation/AdminTabs'
import ParticipantImportPanel from '@/components/admin/ParticipantImportPanel'
import { formatDateTime } from '@/lib/admin-format'
import {
ADMIN_PAGE_SIZE,
adminPageSummary,
adminPageSummaryLabel,
parseAdminPage,
} from '@/lib/admin-pagination'
import { adminReturnUrl } from '@/lib/admin-return-url'
import { cn } from '@/lib/utils'
import { createAdminClient } from '@/lib/utils/supabase/server'
import { PERMISSIONS } from '@/src/auth/permissions'
import { adminResourceCounts } from '@/src/services/admin-resource-counts.service'
import { assessmentOptions } from '@/src/services/admin-assessment-ux.service'
import { authorizationService } from '@/src/services/authorization.service'
import { organizationExamService } from '@/src/services/organization-exam.service'
import {
batchInviteUrl,
batchStatusLabel,
organizationService,
organizationStatusLabel,
organizationTypeLabel,
participantStatusLabel,
} from '@/src/services/organization.service'
import { Link2,Plus,RefreshCcw } from 'lucide-react'
import Link from '@/components/admin/navigation/AdminLink'
import { redirect } from 'next/navigation'


/**
 * Instansi — MVP CPNS Instansi Managed Service §6.1 & §6.2.
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
    returnTo?: string
    tab?: string
    participant_search?: string
    participant_page?: string
    selector_search?: string
    selector_domain?: string
    selector_type?: string
    selector_level?: string
    selector_page?: string
    q?: string
    status?: string
    org?: string
    batch?: string
    new?: string
    page?: string
    exam?: string
    ok?: string
    error?: string
}

const PARTICIPANT_STATUSES = ['registered', 'active', 'completed', 'withdrawn'] as const


export default async function AdminOrganizationsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
    const params = await searchParams
    const authorization = await authorizationService.requireAuthenticated()
    if (!authorization.permissions.includes(PERMISSIONS.ORGANIZATION_MANAGE)) {
        redirect('/cpns/dashboard?admin=no-access')
    }

    const tab = params.tab || (params.batch && params.batch !== 'new' ? (params.exam ? 'assignments' : 'participants') : 'overview')
    const orgPage = parseAdminPage(params.page)
    const [list, detail] = await Promise.all([params.org || params.new === '1' ? Promise.resolve({organizations:[],total:0}) : organizationService.listOrganizations({ search: params.q || null, status: params.status || null, limit: ADMIN_PAGE_SIZE, offset: (orgPage - 1) * ADMIN_PAGE_SIZE }), params.org ? organizationService.getOrganization(params.org) : Promise.resolve(null)])
    const db=await createAdminClient()
    const [detailParticipantSummary, assignmentCounts] = await Promise.all([
        detail && tab === 'overview' ? db.from('organization_participants').select('id',{count:'exact',head:true}).eq('organization_id',detail.organization.id) : Promise.resolve({count:0,error:null}),
        adminResourceCounts('organization_assignments', list.organizations.map(org => org.id)),
    ])
    if(detailParticipantSummary.error) throw detailParticipantSummary.error

    // Peserta hanya diambil bila ada batch yang dipilih — menghindari query
    // seluruh peserta instansi hanya untuk menampilkan satu batch.
    const selectedBatch = detail && params.batch && params.batch !== 'new'
        ? detail.batches.find((batch) => batch.id === params.batch) ?? null
        : null
    const [participants, selector, assignments] = await Promise.all([
        selectedBatch && tab === 'participants'
            ? organizationService.listParticipants({batchId:selectedBatch.id,search:params.participant_search,limit:25,offset:(parseAdminPage(params.participant_page)-1)*25}) : null,
        selectedBatch && tab === 'assignments'
            ? assessmentOptions({search:params.selector_search,domain:params.selector_domain==='all'?undefined:params.selector_domain,type:params.selector_type,level:params.selector_level,page:params.selector_page,selectedId:params.exam}) : {options:[],total:0,page:1},
        selectedBatch && tab === 'assignments' ? organizationExamService.listAssignments(selectedBatch.id) : [],
    ])
    const assessments = selector.options
    const selectedAssessment = assessments.find(assessment => assessment.id === params.exam) ?? null

    const creatingOrg = params.new === '1'
    const editingOrg = detail?.organization ?? null
    const showOrgForm = creatingOrg || Boolean(editingOrg)
    const creatingBatch = params.batch === 'new'
    const showBatchForm = (creatingBatch || (selectedBatch && tab === 'settings')) && Boolean(editingOrg)

    const baseParams = new URLSearchParams()
    if (params.q) baseParams.set('q', params.q)
    if (params.status) baseParams.set('status', params.status)

    /** Preserve list filters and the selected organization/batch in admin links. */
    const CONTEXT_KEYS = ['returnTo', 'q', 'status', 'org', 'batch', 'new', 'page', 'exam', 'tab', 'participant_search', 'participant_page', 'selector_search', 'selector_domain', 'selector_type', 'selector_level', 'selector_page'] as const

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
        <AdminPage>
            <AdminBreadcrumbs items={[{label:'Instansi',href:detail?orgHref({org:undefined,batch:undefined,tab:undefined,new:undefined}):undefined},...(detail?[{label:detail.organization.name}]:[]),...(selectedBatch?[{label:selectedBatch.name}]:[])]}/>
            <AdminPageHeader
                title={detail?.organization.name || "Instansi"}
                description={detail ? `${organizationTypeLabel(detail.organization.type)} · ${selectedBatch?.name || detail.organization.city || 'Workspace instansi'}` : 'Kelola instansi mitra dan distribusikan assessment ke batch peserta.'}
                action={params.new === '1' || params.batch === 'new' || tab === 'settings' ? undefined : detail ? <Link className={selectedBatch && tab === 'assignments' ? adminSecondaryButtonClass : adminPrimaryButtonClass} href={orgHref(selectedBatch ? {tab:'assignments'} : detail.batches.length ? {tab:'batches'} : {tab:'batches',batch:'new'})}>{selectedBatch ? 'Tugaskan Assessment' : detail.batches.length ? 'Pilih Batch' : 'Batch baru'}</Link> : <Link className={adminPrimaryButtonClass} href={orgHref({ new: '1', org: undefined, batch: undefined })}><Plus size={16}/>Instansi baru</Link>}
            />

            {detail && <><div className="flex flex-wrap items-center gap-3"><AdminStatusBadge status={detail.organization.status}/><Link className={adminSecondaryButtonClass} href={orgHref({org:undefined,batch:undefined,tab:undefined})}>Kembali ke Instansi</Link></div><AdminTabs active={tab} tabs={[['overview','Overview'],['participants','Peserta'],['batches','Batch'],['assignments','Penugasan'],['monitoring','Monitoring'],['settings','Pengaturan']].map(([id,label])=>({id,label,href:id === 'monitoring' && selectedBatch ? `/admin/monitoring?${new URLSearchParams({org:detail.organization.id,batch:selectedBatch.id,returnTo:orgHref({tab:'assignments'})})}` : orgHref({tab:id})}))}/>{tab === 'overview' && <AdminCard className="space-y-4 p-6"><h2 className="font-bold">Ringkasan Instansi</h2><p className="text-sm">{detailParticipantSummary.count || 0} peserta · {detail.batches.length} batch</p><p className="text-sm text-muted-foreground">Pilih batch untuk menugaskan assessment, membagikan undangan, dan memantau hasil.</p><Link className={adminSecondaryButtonClass} href={orgHref({tab:'batches'})}>Lihat Batch</Link></AdminCard>}</>}
            {params.returnTo && <Link className={adminSecondaryButtonClass} href={adminReturnUrl(params.returnTo,'/admin/assessments')}>Kembali ke Assessment</Link>}
            <AdminFeedbackBanner ok={params.ok} error={params.error}/>
            {params.exam ? (
                <div className="rounded-lg border border-info-border bg-info-muted px-4 py-3 text-sm font-medium text-blue-950" role="status">
                    {selectedAssessment
                        ? <>Assessment <strong>{selectedAssessment.title}</strong> sudah dipilih. Simpan assignment pada batch ini atau pilih instansi dan batch lain.</>
                        : <>Assessment sudah dipilih dari katalog. Buka instansi dan batch tujuan; pilihan ini akan dibawa ke form assignment.</>}
                </div>
            ) : null}

            {!detail && <>
            <AdminTableToolbar
                pathname="/admin/organizations"
                search={params.q || ''}
                status={params.status || ''}
                statusOptions={[
                    { value: 'active', label: 'Aktif' },
                    { value: 'inactive', label: 'Nonaktif' },
                ]}
                placeholder="Cari nama, kode, kota, atau PIC..."
                resultCount={list.total}
            />

            {/* ------------------------------------------------- daftar instansi */}
            <AdminCard className="overflow-hidden">
                <div className="border-b border-border p-5">
                    <AdminSectionHeading title="Daftar instansi" description={adminPageSummaryLabel(adminPageSummary(orgPage, list.organizations.length, list.total), 'instansi')}/>
                </div>
                {list.organizations.length === 0 ? (
                    <AdminEmptyState
                        title="Belum ada instansi"
                        action={<Link className={adminPrimaryButtonClass} href={orgHref({new:'1'})}>Instansi baru</Link>}
                        description={params.q || params.status ? 'Tidak ada instansi yang cocok dengan filter ini.' : 'Tambahkan instansi pertama untuk mulai mengelola batch peserta.'}
                    />
                ) : (

                        <AdminDataTable className="w-full min-w-[900px] text-left text-sm">
                            <thead className={adminTableHeadClass}>
                                <tr>
                                    <AdminTh>Instansi</AdminTh>
                                    <AdminTh>Jenis</AdminTh>
                                    <AdminTh align="right">Penugasan</AdminTh>
                                    <AdminTh align="right">Batch</AdminTh>
                                    <AdminTh align="right">Peserta</AdminTh>
                                    <AdminTh>Status</AdminTh>
                                    <AdminTh align="right">Aksi</AdminTh>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {list.organizations.map((org) => (
                                    <tr key={org.id} className={cn('transition hover:bg-muted/70', org.id === params.org && 'bg-info-muted/60')}>
                                        <td className="px-5 py-4">
                                            <div className="font-semibold text-foreground">{org.name}</div>
                                            <div className="mt-0.5 font-mono text-[11px] font-semibold text-muted-foreground">{org.code}</div>
                                        </td>
                                        <td className="px-4 py-4 font-semibold text-muted-foreground">{organizationTypeLabel(org.type)}</td>
                                        <td className="px-4 py-4 text-right font-bold">{(assignmentCounts.get(org.id) || 0)}</td>
                                        <td className="px-4 py-4 text-right font-bold text-foreground">
                                            {org.batch_count}
                                            {org.active_batch_count > 0 ? <span className="ml-1 text-[11px] font-bold text-success">({org.active_batch_count} aktif)</span> : null}
                                        </td>
                                        <td className="px-4 py-4 text-right font-bold text-foreground">{org.participant_count}</td>
                                        <td className="px-4 py-4"><AdminStatusBadge status={org.status} label={organizationStatusLabel(org.status)}/></td>
                                        <td className="px-5 py-4 text-right">
                                            <Link className="text-xs font-semibold text-info hover:text-info" href={orgHref({ org: org.id, batch: undefined, new: undefined })}>Kelola</Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </AdminDataTable>

                )}

                {list.organizations.length > 0 ? (
                    <AdminPagination
                        pathname="/admin/organizations"
                        params={{ q: params.q, status: params.status }}
                        summary={adminPageSummary(orgPage, list.organizations.length, list.total)}
                        noun="instansi"
                    />
                ) : null}
            </AdminCard>

            {/* ------------------------------------------------- form instansi */}
            </>}

            {showOrgForm ? (
                <section className="flex flex-col gap-6">
                    {(creatingOrg || tab === 'settings') && <>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                        <AdminSectionHeading
                            title={editingOrg ? `Ubah ${editingOrg.name}` : 'Instansi baru'}
                            description={editingOrg ? 'Perubahan langsung berlaku untuk batch dan peserta di bawahnya.' : 'Isi identitas instansi dan kontak PIC-nya.'}
                        />
                        <Link className="text-sm font-semibold text-muted-foreground hover:text-foreground" href={orgHref({ new: undefined, org: undefined, batch: undefined })}>Tutup</Link>
                    </div>
                    <OrganizationForm editingOrg={editingOrg} params={params} tab={tab} cancelHref={orgHref({new:undefined,org:editingOrg?.id,batch:undefined,tab:editingOrg?'overview':undefined})}/>

                    {editingOrg ? (
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4">
                            <p className="text-xs font-semibold text-muted-foreground">
                                Hapus hanya bisa bila instansinya belum punya peserta. Bila sudah ada, nonaktifkan saja supaya riwayat dan export tetap utuh.
                            </p>
                            <form action={deleteOrganizationAction}>
                                <input type="hidden" name="id" value={editingOrg.id}/>
                                <input type="hidden" name="name" value={editingOrg.name}/>
                                <input type="hidden" name="q" value={params.q || ''}/>
                                <input type="hidden" name="status" value={params.status || ''}/>
                                <input type="hidden" name="returnTo" value={params.returnTo || ''}/><input type="hidden" name="return_exam_id" value={params.exam || ''}/><input type="hidden" name="tab" value={tab}/><input type="hidden" name="page" value={params.page || ''}/>
                                <ConfirmSubmit message={`Hapus instansi ${editingOrg.name}?`} detail="Instansi hanya dapat dihapus setelah seluruh peserta dikeluarkan." confirmLabel="Hapus instansi" trigger={<button type="button" className={adminSecondaryButtonClass}>Hapus instansi</button>}/>
                            </form>
                        </div>
                    ) : null}


                    </>}

                    {editingOrg && (tab !== 'overview' || creatingBatch) ? (
                        <div className="flex flex-col gap-4">
                            <AdminSectionHeading
                                title="Batch"
                                description="Satu batch = satu gelombang peserta dengan tautan undangannya sendiri."
                                action={<Link className={adminSecondaryButtonClass} href={orgHref({ org: editingOrg.id, batch: 'new' })}><Plus size={16}/>Batch baru</Link>}
                            />

                            {showBatchForm ? (
                                <BatchForm editingOrg={editingOrg} selectedBatch={selectedBatch} params={params} tab={tab} cancelHref={orgHref({batch:undefined,tab:'batches'})}/>
                            ) : null}

                            {detail && detail.batches.length === 0 ? (
                                <p className="mt-4 text-sm font-semibold text-muted-foreground">Belum ada batch. Buat batch pertama untuk membagikan tautan undangan ke peserta.</p>
                            ) : (
                                <div className="mt-4 space-y-3">
                                    {(!selectedBatch || tab === 'batches') && <AdminDataTable caption="Batch Instansi" className="min-w-[650px]"><thead className={adminTableHeadClass}><tr>{['Batch','Participants','Schedule','Status','Actions'].map(h=><AdminTh key={h}>{h}</AdminTh>)}</tr></thead><tbody>{detail?.batches.map(batch=><tr key={batch.id}><td className="font-medium">{batch.name}<p className="text-xs text-muted-foreground">{batch.code}</p></td><td>{batch.participant_count}</td><td className="text-xs">{formatDateTime(batch.starts_at)} — {formatDateTime(batch.ends_at)}</td><td><AdminStatusBadge status={batch.status}/></td><td><Link className={adminSecondaryButtonClass} href={orgHref({org:editingOrg.id,batch:batch.id,tab:params.exam?'assignments':'participants'})}>Lihat peserta</Link></td></tr>)}</tbody></AdminDataTable>}
                                    {detail?.batches.filter(batch => selectedBatch && tab !== 'batches' && batch.id === selectedBatch.id).map((batch) => {
                                        const inviteUrl = batchInviteUrl(batch.invite_token, siteUrl)
                                        const isSelected = batch.id === params.batch
                                        return (
                                            <div key={batch.id} className={'flex flex-col gap-4'}>
                                                <div className="flex flex-wrap items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="text-sm font-semibold text-foreground">{batch.name}</span>
                                                            <AdminStatusBadge status={batch.status} label={batchStatusLabel(batch.status)}/>
                                                            <span className="font-mono text-[11px] font-semibold text-muted-foreground">{batch.code}</span>
                                                        </div>
                                                        <div className="mt-1 text-xs font-semibold text-muted-foreground">
                                                            {formatDateTime(batch.starts_at)} — {formatDateTime(batch.ends_at)}
                                                        </div>
                                                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-muted-foreground">
                                                            <span>{batch.participant_count} peserta</span>
                                                            <span>{batch.linked_count} sudah punya akun</span>
                                                            <span>{batch.participant_count - batch.linked_count} belum menautkan akun</span>
                                                        </div>
                                                    </div>
                                                    <Link className="text-xs font-semibold text-info hover:text-info" href={orgHref({ org: editingOrg.id, batch: batch.id, tab: params.exam ? 'assignments' : ['assignments','monitoring'].includes(tab) ? tab : 'participants' })}>
                                                        Lihat peserta
                                                    </Link>
                                                </div>

                                                <div className="mt-3 flex flex-wrap items-end gap-2">
                                                    <label className="min-w-0 flex-1 space-y-1.5">
                                                        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"><Link2 size={12}/>Tautan undangan peserta</span>
                                                        <input className={`${adminInputClass} font-mono text-xs`} readOnly value={inviteUrl} aria-label={`Tautan undangan ${batch.name}`}/>
                                                    </label>
                                                    <form action={rotateBatchInviteAction}>
                                                        <input type="hidden" name="batch_id" value={batch.id}/>
                                                        <input type="hidden" name="org" value={editingOrg.id}/>
                                                        <input type="hidden" name="q" value={params.q || ''}/>
                                                        <input type="hidden" name="status" value={params.status || ''}/>
                                                        <input type="hidden" name="returnTo" value={params.returnTo || ''}/><input type="hidden" name="return_exam_id" value={params.exam || ''}/><input type="hidden" name="tab" value={tab}/><input type="hidden" name="page" value={params.page || ''}/>
                                                        <ConfirmSubmit
                                                            message={`Buat tautan undangan baru untuk batch “${batch.name}”?`}
                                                            detail="Tautan lama langsung tidak berlaku. Peserta yang belum bergabung dengan tautan lama harus memakai tautan baru."
                                                            confirmLabel="Rotasi tautan"
                                                        trigger={<button type="button" className={adminSecondaryButtonClass}><RefreshCcw size={15}/>Rotasi tautan</button>}
                                                        />
                                                    </form>
                                                </div>

                                                {isSelected ? (
                                                    <div className="mt-4 border-t border-border pt-4">
                                                        {tab === 'participants' && participants && <><AdminTableToolbar pathname="/admin/organizations" searchName="participant_search" search={params.participant_search || ''} placeholder="Cari peserta..." hiddenFields={{org:editingOrg.id,batch:batch.id,tab:'participants',exam:params.exam,q:params.q,status:params.status,page:params.page}} resultCount={participants.total}/>
                                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                                            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Peserta ({participants.total})</div>
                                                            {batch.participant_count > participants.participants.length ? (
                                                                <span className="text-[11px] font-bold text-muted-foreground">{participants.participants.length} ditampilkan</span>
                                                            ) : null}
                                                        </div>
                                                        {participants.participants.length === 0 ? (
                                                            <p className="mt-2 text-sm font-semibold text-muted-foreground">
                                                                Belum ada peserta. Bagikan tautan undangan di atas, atau impor daftar peserta sebagai cadangan.
                                                            </p>
                                                        ) : (

                                                                <AdminDataTable className="w-full min-w-[720px] text-left text-sm">
                                                                    <thead className={adminTableHeadClass}>
                                                                        <tr>
                                                                            <AdminTh className="px-3 py-2">Kode</AdminTh>
                                                                            <AdminTh className="px-3 py-2">Nama</AdminTh>
                                                                            <AdminTh className="px-3 py-2">Kontak</AdminTh>
                                                                            <AdminTh className="px-3 py-2">Akun</AdminTh>
                                                                            <AdminTh className="px-3 py-2">Status</AdminTh>
                                                                            <AdminTh align="right" className="px-3 py-2">Aksi</AdminTh>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-border">
                                                                        {participants.participants.map((participant) => (
                                                                            <tr key={participant.id}>
                                                                                <td className="px-3 py-2.5 font-mono text-xs font-medium text-muted-foreground">{participant.participant_code}</td>
                                                                                <td className="px-3 py-2.5">
                                                                                    <div className="font-semibold text-foreground">{participant.full_name_snapshot}</div>
                                                                                    {participant.unit ? <div className="text-[11px] font-medium text-muted-foreground">{participant.unit}</div> : null}
                                                                                </td>
                                                                                <td className="px-3 py-2.5 text-xs font-medium text-muted-foreground">
                                                                                    {participant.email_snapshot || '—'}
                                                                                    {participant.phone_snapshot ? <div className="text-[11px] text-muted-foreground">{participant.phone_snapshot}</div> : null}
                                                                                </td>
                                                                                <td className="px-3 py-2.5">
                                                                                    {participant.user_id
                                                                                        ? <AdminBadge variant="green">Tertaut</AdminBadge>
                                                                                        : <AdminBadge variant="orange">Belum</AdminBadge>}
                                                                                </td>
                                                                                <td className="px-3 py-2.5"><AdminStatusBadge status={participant.status} label={participantStatusLabel(participant.status)}/></td>
                                                                                <td className="px-3 py-2.5">
                                                                                    <div className="flex items-center justify-end gap-1.5">
                                                                                        <form action={setParticipantStatusAction} className="flex items-center gap-1.5">
                                                                                            <input type="hidden" name="participant_id" value={participant.id}/>
                                                                                            <input type="hidden" name="org" value={editingOrg.id}/>
                                                                                            <input type="hidden" name="batch" value={batch.id}/>
                                                                                            <input type="hidden" name="q" value={params.q || ''}/>
                                                                                            <input type="hidden" name="status" value={params.status || ''}/>
                                                                                            <input type="hidden" name="returnTo" value={params.returnTo || ''}/><input type="hidden" name="return_exam_id" value={params.exam || ''}/><input type="hidden" name="tab" value={tab}/><input type="hidden" name="page" value={params.page || ''}/>
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
                                                                                            <input type="hidden" name="returnTo" value={params.returnTo || ''}/><input type="hidden" name="return_exam_id" value={params.exam || ''}/><input type="hidden" name="tab" value={tab}/><input type="hidden" name="page" value={params.page || ''}/>
                                                                                            <ConfirmSubmit
                                                                                                message={`Keluarkan peserta ${participant.participant_code} dari batch ini?`}
                                                                                                detail="Peserta yang sudah mengerjakan ujian tidak dapat dikeluarkan — hasilnya adalah dasar export instansi. Untuk kasus itu, ubah statusnya menjadi nonaktif."
                                                                                                confirmLabel="Keluarkan peserta"
                                                                                                title="Konfirmasi keluarkan peserta"
                                                                                            trigger={<button type="button" aria-label={`Keluarkan peserta ${participant.participant_code}`} className="text-[11px] font-semibold text-danger hover:text-danger" title="Keluarkan peserta">Keluarkan</button>}
                                                                                            />
                                                                                        </form>
                                                                                    </div>
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </AdminDataTable>

                                                        )}

                                                        <ParticipantImportPanel batchId={batch.id} batchCode={batch.code}/>

                                                        <AdminPagination pageKey="participant_page" pathname="/admin/organizations" params={Object.fromEntries(new URL(orgHref({}), 'http://local').searchParams)} summary={adminPageSummary(parseAdminPage(params.participant_page),participants.participants.length,participants.total)} noun="peserta"/>
                                                        </>}
                                                        {isSelected && tab === 'assignments' ? (
                                                            <BatchExamPanel
                                                                batchId={batch.id}
                                                                organizationId={editingOrg.id}
                                                                assessments={assessments}
                                                                assignments={assignments}
                                                                selectedExamId={params.exam || ''}
                                                                organizationName={editingOrg.name}
                                                                batchName={batch.name}
                                                                returnTo={orgHref({tab:'assignments'})}
                                                                total={selector.total}
                                                                page={selector.page}
                                                            />
                                                        ) : null}

                                                        {tab === 'monitoring' && <Link className={adminPrimaryButtonClass} href={`/admin/monitoring?${new URLSearchParams({org:editingOrg.id,batch:batch.id,returnTo:orgHref({tab:'assignments'})})}`}>Pantau Peserta</Link>}
                                                    </div>
                                                ) : null}
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    ) : null}
                </section>
            ) : null}

            <details className="rounded-lg border border-border bg-card px-4 py-3 text-xs font-semibold text-muted-foreground">
                <summary className="cursor-pointer select-none">Catatan teknis</summary>
                <p className="mt-2 leading-6">
                    Pengelolaan instansi mengikuti hak akses akun Anda.
                    Tautan undangan adalah kunci masuk peserta — merotasinya membuat tautan lama langsung tidak berlaku.
                    Batch hanya bisa diaktifkan bila instansinya aktif, dan instansi tidak bisa dinonaktifkan selama masih punya batch aktif.
                </p>
            </details>
        </AdminPage>
    )
}
