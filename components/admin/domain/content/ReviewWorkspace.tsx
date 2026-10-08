import {
assignContentReviewerAction,
decideContentReviewAction,
publishContentQuestionAction,
saveContentDraftAction,
submitContentQuestionAction,
} from '@/app/actions/content-review'
import MathRenderer from '@/components/MathRenderer'
import AdminPagination from '@/components/admin/AdminPagination'
import AdminTableToolbar from '@/components/admin/AdminTableToolbar'
import {
AdminBadge,
AdminCard,
AdminFeedbackBanner,
AdminField,
AdminPage,
AdminPageHeader,
AdminSectionHeading,
AdminStatusBadge,
AdminTh,
adminDangerButtonClass,
adminInputClass,
adminPrimaryButtonClass,
adminSecondaryButtonClass,
adminSuccessButtonClass,
adminTableHeadClass,
adminWarningButtonClass
} from '@/components/admin/AdminUi'
import QuestionRichTextEditor from '@/components/admin/QuestionRichTextEditor'
import ReviewBatchPanel from '@/components/admin/ReviewBatchPanel'
import ReviewDraftForm from '@/components/admin/ReviewDraftForm'
import ReviewQuestionFields from '@/components/admin/ReviewQuestionFields'
import { AdminDataTable } from '@/components/admin/data-display/AdminDataTable'
import { AdminFormSection } from '@/components/admin/forms/AdminFormSection'
import { AdminBreadcrumbs } from '@/components/admin/navigation/AdminBreadcrumbs'
import { AdminTabs } from '@/components/admin/navigation/AdminTabs'
import { adminAuditLabel,adminQuestionTypeLabel,adminStatusLabel,adminStatusVariant,formatDateTime } from '@/lib/admin-format'
import { adminPageSummary,parseAdminPage } from '@/lib/admin-pagination'
import { adminReturnUrl } from '@/lib/admin-return-url'
import { serializeOptionRows } from '@/lib/question-options'
import { isLegacyHistoryPlaceholder } from '@/lib/question-source'
import { DEFAULT_REVIEW_BATCH_CODE } from '@/lib/review-batch'
import { cn } from '@/lib/utils'
import { PERMISSIONS } from '@/src/auth/permissions'
import { adminWorkspaceService } from '@/src/services/admin-workspace.service'
import { authorizationService } from '@/src/services/authorization.service'
import { contentReviewService } from '@/src/services/content-review.service'
import {
ArrowLeft,
CheckCircle2,
Clock3,
FilePlus2,
Send,
ShieldCheck,
Sparkles,
UserCheck,
XCircle
} from 'lucide-react'
import Link from '@/components/admin/navigation/AdminLink'
import { redirect } from 'next/navigation'


type Row = Record<string, unknown>

/** Urutan status pada filter — label memakai `adminStatusLabel` agar konsisten. */
const REVIEW_STATUS_OPTIONS = ['draft', 'submitted', 'editorial_review', 'academic_review', 'technical_qa', 'revision_required', 'approved', 'published', 'rejected'] as const

type SearchParams = {
    program?: string
    track?: string
    subject?: string
    status?: string
    view?: string
    stage?: string
    reviewer?: string
    q?: string
    question?: string
    new?: string
    ok?: string
    error?: string
    /** Mode fokus untuk batch review CPNS yang sudah disiapkan. */
    bulk?: string
    /** Nomor halaman antrean (25 baris/halaman). */
    page?: string
    returnTo?: string
}

function s(value: unknown) {
    return value == null ? '' : String(value)
}

function n(value: unknown) {
    const parsed = Number(value ?? 0)
    return Number.isFinite(parsed) ? parsed : 0
}

function lower(value: unknown) {
    return s(value).toLowerCase()
}

function profileName(profile: unknown, fallback = 'Belum ditentukan') {
    if (!profile || typeof profile !== 'object') return fallback
    const row = profile as Row
    return s(row.display_name) || s(row.full_name) || fallback
}

function stageLabel(stage: unknown) {
    switch (s(stage)) {
        case 'editorial': return 'Editorial Review'
        case 'academic': return 'Academic Review'
        case 'technical_qa': return 'Technical QA'
        default: return 'Belum masuk review'
    }
}

function workspaceHref(params: SearchParams, overrides: Partial<SearchParams> = {}) {
    const merged = { ...params, ...overrides }
    const query = new URLSearchParams()
    for (const key of ['program', 'track', 'subject', 'status', 'view', 'stage', 'reviewer', 'q', 'question', 'new', 'page', 'bulk', 'returnTo'] as const) {
        const value = merged[key]
        if (value) query.set(key, value)
    }
    return `/admin/content/review?${query.toString()}`
}

function HiddenContext({ program, track,returnTo,filters }: { program: string; track: string;returnTo?:string;filters:Record<string,string|undefined> }) {
    return <><input type="hidden" name="workspace_return_to" value={workspaceHref({...filters,program,track})}/><input type="hidden" name="program_code" value={program}/><input type="hidden" name="track_code" value={track}/>{returnTo&&<input type="hidden" name="return_context" value={returnTo}/>}</>
}

function OptionPreview({ option }: { option: Row }) {
    const isCorrect = option.is_correct === true
    return (
        <div className={cn('rounded-lg border p-3.5 transition', isCorrect ? 'border-success-border bg-success-muted/70' : 'border-border bg-card')}>
            <div className="flex items-start gap-3">
                <span className={cn('flex h-7 min-w-7 items-center justify-center rounded-lg border text-xs font-semibold', isCorrect ? 'border-success-border bg-success-muted text-success' : 'border-border bg-muted text-muted-foreground')}>{s(option.option_key)}</span>
                <div className="min-w-0 flex-1">
                    {Boolean(option.response_group) ? <div className="mb-1 text-[11px] font-semibold uppercase text-info">{s(option.response_group)}</div> : null}
                    <div className="text-sm font-medium leading-6 text-foreground"><MathRenderer text={s(option.content)}/></div>
                    {Boolean(option.image_url) ? <div className="mt-2 break-all text-[10px] font-medium text-muted-foreground">Gambar: {s(option.image_url)}</div> : null}
                    {isCorrect ? <AdminBadge variant="green" className="mt-2">Jawaban benar</AdminBadge> : null}
                </div>
            </div>
        </div>
    )
}

const REVIEW_FLOW = [
    { key: 'editorial', label: 'Editorial' },
    { key: 'academic', label: 'Academic' },
    { key: 'technical_qa', label: 'Technical QA' },
    { key: 'published', label: 'Terbit' },
] as const

function reviewFlowIndex(question: Row) {
    const stage = s(question.current_stage)
    if (stage === 'editorial') return 0
    if (stage === 'academic') return 1
    if (stage === 'technical_qa') return 2
    if (lower(question.status) === 'approved') return 3
    if (lower(question.status) === 'published') return 4
    return -1
}

function ReviewProgress({ question }: { question: Row }) {
    const activeIndex = reviewFlowIndex(question)
    return (
        <ol aria-label="Progres review" className="mt-4 grid grid-cols-4 gap-2 border-t border-border pt-4">
            {REVIEW_FLOW.map((step, index) => {
                const complete = activeIndex > index
                const active = activeIndex === index
                return <li key={step.key} className="min-w-0">
                    <div className={`h-1.5 rounded-full ${complete ? 'bg-emerald-500' : active ? 'bg-primary' : 'bg-slate-200'}`}/>
                    <p className={`mt-1.5 truncate text-[10px] font-semibold sm:text-xs ${active ? 'text-info' : complete ? 'text-success' : 'text-muted-foreground'}`}>{complete ? '✓ ' : ''}{step.label}</p>
                </li>
            })}
        </ol>
    )
}

function queueTaskLabel(question: Row) {
    if (isLegacyHistoryPlaceholder(question.source_type)) return 'Placeholder riwayat'
    const pending = question.pending_review as Row | null | undefined
    if (question.current_stage && !pending?.reviewer_id) return 'Pilih reviewer'
    if (question.current_stage) return `Review ${stageLabel(question.current_stage)}`
    if (lower(question.status) === 'approved') return 'Siap diterbitkan'
    if (lower(question.status) === 'revision_required') return 'Perlu revisi'
    if (lower(question.status) === 'published') return 'Sudah terbit'
    return 'Lengkapi draf'
}

export default async function ContentReviewWorkspace({ searchParams }: { searchParams: Promise<SearchParams> }) {
    const rawParams = await searchParams
    const params = {...rawParams, status: rawParams.view === 'approved' ? 'approved' : rawParams.view === 'rejected' ? 'rejected' : rawParams.view === 'blocked' ? 'all' : rawParams.status}
    const authorization = await authorizationService.requireAuthenticated()
    const permissions = new Set(authorization.permissions)
    const canEnter = [
        PERMISSIONS.CONTENT_READ,
        PERMISSIONS.CONTENT_CREATE,
        PERMISSIONS.CONTENT_UPDATE,
        PERMISSIONS.CONTENT_REVIEW,
        PERMISSIONS.CONTENT_PUBLISH,
        PERMISSIONS.QUESTION_MANAGE,
    ].some((permission) => permissions.has(permission))
    if (!canEnter) redirect('/cpns/dashboard')

    const context = {
        programCode: (params.program || 'TKA').toUpperCase(),
        trackCode: (params.track || 'SMP').toUpperCase(),
    }

    const blocked = params.view === 'blocked' ? await adminWorkspaceService.listDomainPage('questions',{context,review:'blocked',search:params.q,subject:params.subject,stage:params.stage,reviewer:params.reviewer,page:parseAdminPage(params.page)}) : null
    const workspaceData = await contentReviewService.getWorkspaceData(context, {
        subject: params.subject || null,
        status: params.status || null,
        stage: params.stage || null,
        reviewer: params.reviewer || null,
        q: params.q || null,
        page: blocked ? 1 : parseAdminPage(params.page),
        ids: blocked?.rows.map(row=>s(row.id)),
        assignee: authorization.userId,
    }, params.question || null)

    const data = blocked ? {...workspaceData,total:blocked.total,page:parseAdminPage(params.page),lastPage:blocked.lastPage,clampTo:blocked.clampTo} : workspaceData

    const program = data.catalog.program.code
    const track = data.catalog.track.code
    const selected = data.selectedQuestion as Row | null
    const placeholder = isLegacyHistoryPlaceholder(selected?.source_type)
    const pendingReview = selected?.pending_review && typeof selected.pending_review === 'object' ? selected.pending_review as Row : null
    const author = selected ? data.profileById.get(s(selected.author_id)) : null
    const assignedReviewer = selected?.reviewer_id ? data.profileById.get(s(selected.reviewer_id)) : null
    const currentActorIsAuthor = selected ? s(selected.author_id) === authorization.userId : false
    const canManageQuestions = permissions.has(PERMISSIONS.QUESTION_MANAGE)
    const canCreate = permissions.has(PERMISSIONS.CONTENT_CREATE) || canManageQuestions
    const canEdit = !placeholder && Boolean(selected)
        && ['draft', 'revision_required', 'rejected'].includes(lower(selected?.status))
        && (permissions.has(PERMISSIONS.CONTENT_UPDATE) || canManageQuestions)
        && (currentActorIsAuthor || canManageQuestions)
    const canSubmit = !placeholder && Boolean(selected)
        && ['draft', 'revision_required'].includes(lower(selected?.status))
        && (permissions.has(PERMISSIONS.CONTENT_UPDATE) || permissions.has(PERMISSIONS.CONTENT_CREATE) || canManageQuestions)
        && (currentActorIsAuthor || canManageQuestions)
    // Aturan C: menugaskan ke orang lain = aksi manajerial; reviewer hanya
    // mengklaim untuk dirinya sendiri.
    const canAssignOthers = !placeholder && Boolean(selected?.current_stage)
        && Boolean(pendingReview)
        && (permissions.has(PERMISSIONS.CONTENT_ASSIGN) || canManageQuestions)
    const canClaim = !placeholder && Boolean(selected?.current_stage)
        && Boolean(pendingReview)
        && !pendingReview?.reviewer_id
        && permissions.has(PERMISSIONS.CONTENT_REVIEW)
        && !currentActorIsAuthor
    const canReview = !placeholder && Boolean(selected?.current_stage)
        && permissions.has(PERMISSIONS.CONTENT_REVIEW)
        && s(selected?.reviewer_id) === authorization.userId
        && !currentActorIsAuthor
    const canPublish = !placeholder && lower(selected?.status) === 'approved' && permissions.has(PERMISSIONS.CONTENT_PUBLISH)
    const nextActionCopy = placeholder
        ? 'Placeholder riwayat attempt lama — tidak ada tindakan yang tersedia dan soal ini tidak dapat diedit.'
        : canReview
        ? 'Periksa isi soal di atas, tulis catatan bila perlu, lalu pilih keputusan review.'
        : canAssignOthers
            ? `Pilih reviewer untuk tahap ${stageLabel(selected?.current_stage)}.`
            : canClaim
                ? `Klaim review tahap ${stageLabel(selected?.current_stage)} untuk diri Anda, lalu beri keputusan.`
                : canSubmit
                    ? 'Pastikan draf lengkap, lalu kirim ke Editorial Review.'
                    : canPublish
                        ? 'Seluruh tahap review selesai. Soal siap diterbitkan.'
                        : 'Tidak ada tindakan yang perlu Anda lakukan pada tahap ini.'
    const primaryNode = data.knowledgeMappings.find((row) => lower(row.relation_type) === 'primary') as Row | undefined

    const visibleQuestions = data.questions
    // Angka-angka ini exact (agregat seluruh tabel), bukan hasil menghitung
    // jendela daftar — lihat `countQuestionsByStatus`.


    const createNew = params.new === '1'
    const activeSubjectCode = params.subject || data.catalog.subjects[0]?.code || ''
    // Panel review massal hanya relevan untuk batch CPNS/SKD yang sedang
    // dikerjakan. Konteks lain tidak perlu query tambahan.
    const isBatchContext = program === 'CPNS' && track === 'SKD'
    const canUseBulk = permissions.has(PERMISSIONS.CONTENT_REVIEW) || permissions.has(PERMISSIONS.CONTENT_PUBLISH)
    const bulkMode = isBatchContext && params.bulk === '1' && canUseBulk

    return (
        <AdminPage>
            <AdminBreadcrumbs items={[{label:"Content"},{label:"Review",href:selected?workspaceHref({...params,program,track},{question:undefined}):undefined},...(selected?[{label:s(selected.question_code)}]:[])]}/>
            <AdminPageHeader
                title="Review"
                description={`Antrean tugas review konten ${program} / ${track}.`}
                action={<div className="flex flex-wrap items-center gap-2">{params.returnTo&&<Link href={adminReturnUrl(params.returnTo,'/admin/content/questions')} className={adminSecondaryButtonClass}>Kembali ke Question Bank</Link>}{bulkMode ? <Link href={workspaceHref({ ...params, program, track }, { bulk: undefined })} className={adminSecondaryButtonClass}><ArrowLeft size={16}/>Kembali ke antrean</Link> : canUseBulk ? <Link href={workspaceHref({ program: 'CPNS', track: 'SKD', bulk: '1' })} className={adminSecondaryButtonClass}><Sparkles size={16}/>Buka review massal</Link> : null}{canCreate && !bulkMode && !selected && params.new !== '1' ? <Link href={workspaceHref({ ...params, program, track }, { new: '1', question: undefined })} className={adminPrimaryButtonClass}><FilePlus2 size={16}/>Buat soal</Link> : undefined}</div>}
            />

            <AdminFeedbackBanner ok={params.ok} error={params.error}/>

            {bulkMode ? <div id="review-massal"><ReviewBatchPanel batch={DEFAULT_REVIEW_BATCH_CODE} program={program} track={track} actorId={authorization.userId} canReview={permissions.has(PERMISSIONS.CONTENT_REVIEW)} canPublish={permissions.has(PERMISSIONS.CONTENT_PUBLISH)}/></div> : null}

            {!bulkMode&&!selected&&!createNew&&<AdminTabs active={params.view || 'needs_review'} tabs={[['needs_review','Needs Review'],['blocked','Blocked'],['approved','Approved'],['rejected','Rejected']].map(([id,label])=>({id,label,href:workspaceHref({...params,program,track},{view:id,status:undefined,page:undefined,question:undefined})}))}/>}
            <div className={bulkMode || selected || createNew ? 'hidden' : ''}>
                <AdminTableToolbar
                    pathname="/admin/content/review"
                    program={program}
                    track={track}
                    hiddenFields={{view:params.view,returnTo:params.returnTo}}
                    search={params.q || ''}
                status={params.status || ''}
                statusOptions={[...REVIEW_STATUS_OPTIONS.map((status) => ({ value: status, label: adminStatusLabel(status) })), { value: 'all', label: 'Semua status' }]}
                statusPlaceholder="Perlu tindakan"
                    placeholder="Cari kode atau isi soal..."
                    resultCount={data.total}
                    selects={[
                    {
                        name: 'subject',
                        ariaLabel: 'Filter subject',
                        placeholder: 'Semua subject',
                        defaultValue: params.subject || '',
                        options: data.catalog.subjects.map((subject) => ({ value: subject.code, label: `${subject.code} · ${subject.name}` })),
                    },
                    {
                        name: 'stage',
                        ariaLabel: 'Filter stage',
                        placeholder: 'Semua stage',
                        defaultValue: params.stage || '',
                        options: [
                            { value: 'editorial', label: 'Editorial' },
                            { value: 'academic', label: 'Academic' },
                            { value: 'technical_qa', label: 'Technical QA' },
                        ],
                    },
                    {
                        name: 'reviewer',
                        ariaLabel: 'Filter reviewer',
                        placeholder: 'Semua reviewer',
                        defaultValue: params.reviewer || '',
                        options: [{ value: 'unassigned', label: 'Belum di-assign' }, ...data.reviewers.map((reviewer) => ({ value: reviewer.id, label: reviewer.full_name }))],
                    },
                    ]}
                />
            </div>

            {!bulkMode && createNew && canCreate ? (
                <section className="w-full max-w-[960px]">
                    <div className="flex items-start justify-between gap-4 border-b border-border p-5">
                        <div><h2 className="text-lg font-semibold text-foreground">Buat draf soal</h2><p className="mt-1 text-sm font-medium text-muted-foreground">Isi konten utama terlebih dahulu. Klasifikasi dan opsi disimpan bersama dalam satu transaksi.</p></div>
                        <Link className="text-sm font-semibold text-muted-foreground hover:text-foreground" href={workspaceHref({...params,program,track},{new:undefined,question:undefined})}>Tutup</Link>
                    </div>
                    <ReviewDraftForm action={saveContentDraftAction}><AdminFormSection title="Isi & Klasifikasi">
                        <HiddenContext filters={params} program={program} track={track} returnTo={params.returnTo}/>
                        <AdminField label="Mapel / subtes"><select className={adminInputClass} name="subject_code" required defaultValue={activeSubjectCode}>{data.catalog.subjects.map((subject) => <option key={subject.id} value={subject.code}>{subject.code} · {subject.name}</option>)}</select></AdminField>
                        <ReviewQuestionFields middle={<>
                            <QuestionRichTextEditor name="stem" label="Pertanyaan" className="lg:col-span-2" required placeholder="Tulis pertanyaan dengan jelas..." minHeight="min-h-32"/>
                            <AdminField label="Tingkat kesulitan"><select className={adminInputClass} name="difficulty" defaultValue="medium"><option value="easy">Mudah</option><option value="medium">Sedang</option><option value="hard">Sulit</option></select></AdminField>
                            <AdminField label="Level kognitif"><input className={adminInputClass} name="cognitive_level" placeholder="application / reasoning"/></AdminField>
                            <AdminField label="Estimasi detik"><input className={adminInputClass} type="number" min="1" name="estimated_seconds" placeholder="60"/></AdminField>
                            <AdminField label="Sumber / referensi"><input className={adminInputClass} name="source_reference" placeholder="Sumber atau referensi"/></AdminField>
                        </>}/>
                        <QuestionRichTextEditor name="explanation" label="Pembahasan" className="lg:col-span-2" placeholder="Tulis alasan jawaban dan konsep yang diuji..." minHeight="min-h-32"/>
                        <AdminField label="Alasan / catatan perubahan" className="lg:col-span-2"><input className={adminInputClass} name="change_reason" defaultValue="Draf awal dari Reviewer Workspace"/></AdminField>
                        <div className="flex flex-wrap gap-2 lg:col-span-2"><button className={adminPrimaryButtonClass}><FilePlus2 size={16}/>Simpan draft</button><Link href={workspaceHref({...params,program,track},{new:undefined,question:undefined})} className={adminSecondaryButtonClass}>Batal</Link></div>
                    </AdminFormSection></ReviewDraftForm>
                </section>
            ) : null}

            {!bulkMode ? <div className="flex flex-col gap-6">
                <AdminCard className={cn('overflow-hidden', selected || createNew ? 'hidden' : '')}>
                    <div className="flex items-center justify-between border-b border-border px-4 py-3.5"><div><h2 className="text-sm font-semibold text-foreground">Antrean review</h2><p className="text-xs font-medium text-muted-foreground">{data.total} soal sesuai filter</p></div><AdminBadge>{data.counts.unassigned} belum ditugaskan</AdminBadge></div>
                    <AdminDataTable caption="Antrean Review" className="min-w-[900px]" empty={!visibleQuestions.length?{title:'Queue kosong',description:'Tidak ada soal untuk filter ini. Ubah filter atau ajukan konten untuk review.'}:undefined}><thead className={adminTableHeadClass}><tr>{['Question','Taxonomy','Issue / Next Action','Review State','Updated','Actions'].map(h=><AdminTh key={h}>{h}</AdminTh>)}</tr></thead><tbody>{visibleQuestions.map(question=>{
                        const id=s(question.id),subject=data.subjectById.get(s(question.subject_id)),pending=question.pending_review
                        return <tr key={id}><td className="max-w-md"><p className="font-medium">{s(question.question_code) || 'Tanpa kode'} · v{n(question.version)}</p><p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{s(question.stem).replace(/<[^>]*>/g,' ').slice(0,180)}</p></td><td>{s(subject?.code) || 'Belum ditetapkan'}</td><td className="max-w-xs"><p className="text-xs">{s(pending?.notes) || queueTaskLabel(question)}</p></td><td><AdminStatusBadge status={question.status}/></td><td className="whitespace-nowrap text-xs">{formatDateTime(question.updated_at)}</td><td><Link href={workspaceHref({...params,program,track},{question:id,new:undefined})} className={adminSecondaryButtonClass}>Buka Review</Link></td></tr>
                    })}</tbody></AdminDataTable>
                    {data.total > 0 ? (
                        <AdminPagination
                            pathname="/admin/content/review"
                            params={{ program, track, subject: params.subject || '', status: params.status || '', view:params.view || '', stage: params.stage || '', reviewer: params.reviewer || '', q: params.q || '' }}
                            summary={adminPageSummary(data.page, visibleQuestions.length, data.total)}
                            noun="soal"
                        />
                    ) : null}
                </AdminCard>

                <section className="min-w-0 space-y-5">
                    {selected ? <Link href={workspaceHref({ ...params, program, track }, { question: undefined })} className={adminSecondaryButtonClass}><ArrowLeft size={16}/>Kembali ke antrean</Link> : null}
                    {selected ? (
                        <>
                            <AdminCard className="p-5">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-semibold uppercase tracking-wide text-info">{s(data.subjectById.get(s(selected.subject_id))?.code)}</span><span className="text-xs font-medium text-muted-foreground">{adminQuestionTypeLabel(selected.question_type)} · v{n(selected.version)}</span></div><h2 className="mt-1 text-xl font-semibold text-foreground">{s(selected.question_code) || 'Soal tanpa kode'}</h2><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-muted-foreground"><span>Penulis: <b className="text-foreground">{profileName(author)}</b></span><span>Reviewer: <b className="text-foreground">{profileName(assignedReviewer)}</b></span><span>Diperbarui: {formatDateTime(selected.updated_at)}</span></div></div>
                                    {placeholder ? <AdminBadge variant="orange">Placeholder riwayat</AdminBadge> : <AdminBadge variant={adminStatusVariant(selected.status)}>{adminStatusLabel(selected.status)}</AdminBadge>}
                                </div>
                                <ReviewProgress question={selected}/>
                            </AdminCard>
                            {placeholder ? <div role="note" className="rounded-lg border border-warning-border bg-warning-muted p-4 text-sm font-semibold leading-6 text-amber-900">Soal ini <b>placeholder riwayat</b> dari cutover Schema V2: penampung riwayat pengerjaan peserta lama, tanpa opsi jawaban, dan tidak dapat diedit. <b>Jangan dihapus</b> — ratusan baris attempt lama merujuk ke sini.</div> : null}

                            <AdminCard className="p-5">
                                <AdminSectionHeading title="Periksa isi soal" description="Baca pertanyaan, jawaban, dan pembahasan sebelum mengambil tindakan."/>
                                {data.stimulus ? <div className="mt-4 rounded-lg border border-warning-border bg-warning-muted p-4">{Boolean(data.stimulus.title) ? <h4 className="mb-2 font-semibold text-foreground">{s(data.stimulus.title)}</h4> : null}<div className="whitespace-pre-wrap text-sm font-medium leading-6 text-foreground"><MathRenderer text={s(data.stimulus.content)}/></div>{Boolean(data.stimulus.source_reference) ? <div className="mt-2 text-xs font-semibold text-muted-foreground">Sumber: {s(data.stimulus.source_reference)}</div> : null}</div> : null}
                                <div className="mt-4 rounded-lg border border-border bg-muted p-4 text-base font-bold leading-7 text-foreground"><MathRenderer text={s(selected.stem)}/></div>
                                <div className="mt-4 space-y-2.5">{data.options.map((option) => <OptionPreview key={s(option.id)} option={option}/>)}</div>
                                <div className="mt-5 border-t border-border pt-4"><div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Pembahasan</div><div className="mt-2 whitespace-pre-wrap text-sm font-medium leading-6 text-foreground">{data.explanation?.content ? <MathRenderer text={s(data.explanation.content)}/> : <span className="font-bold text-warning">Pembahasan belum tersedia.</span>}</div></div>
                                <div className="mt-4 border-t border-border pt-4"><div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Pemetaan materi</div><div className="mt-2 flex flex-wrap gap-2">{data.knowledgeNodes.length ? data.knowledgeNodes.map((node) => <AdminBadge key={s(node.id)} variant="blue">{s(node.name)}</AdminBadge>) : <span className="text-sm font-medium text-warning">Belum dipetakan.</span>}</div></div>
                            </AdminCard>

                            <AdminCard className="p-5">
                                <AdminSectionHeading title="Tindakan berikutnya" description={Boolean(selected.current_stage) ? `Tahap aktif: ${stageLabel(selected.current_stage)}. Keputusan hanya memakai versi yang tampil di atas.` : `Status saat ini: ${adminStatusLabel(selected.status)}`}/>
                                <div className="mt-4 space-y-4">
                                    <p className="rounded-lg border border-info-border bg-info-muted px-4 py-3 text-sm font-medium leading-6 text-blue-900">{nextActionCopy}</p>
                                    {canSubmit ? <form action={submitContentQuestionAction}><HiddenContext filters={params} program={program} track={track} returnTo={params.returnTo}/><input type="hidden" name="question_id" value={s(selected.id)}/><button className={adminPrimaryButtonClass}><Send size={16}/>Kirim ke Editorial Review</button></form> : null}

                                    {canAssignOthers ? <form action={assignContentReviewerAction} className="rounded-lg border border-border bg-muted p-4"><HiddenContext filters={params} program={program} track={track} returnTo={params.returnTo}/><input type="hidden" name="question_id" value={s(selected.id)}/><label htmlFor="assign-reviewer-select" className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pilih reviewer</label><div className="mt-2 flex flex-col gap-2 sm:flex-row"><select id="assign-reviewer-select" className={adminInputClass} name="reviewer_id" required defaultValue={s(pendingReview?.reviewer_id)}><option value="">Pilih reviewer</option>{data.reviewers.filter((reviewer) => s(reviewer.id) !== s(selected.author_id)).map((reviewer) => <option key={reviewer.id} value={reviewer.id}>{reviewer.full_name}</option>)}</select><button className={adminSecondaryButtonClass}><UserCheck size={16}/>Tugaskan</button></div></form> : null}

                                    {canClaim && !canAssignOthers ? <form action={assignContentReviewerAction} className="rounded-lg border border-info-border bg-info-muted/60 p-4"><HiddenContext filters={params} program={program} track={track} returnTo={params.returnTo}/><input type="hidden" name="question_id" value={s(selected.id)}/><input type="hidden" name="reviewer_id" value={authorization.userId}/><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-medium leading-6 text-muted-foreground">Belum ada reviewer untuk tahap ini. Klaim untuk mulai memeriksa.</p><button className={adminSecondaryButtonClass}><UserCheck size={16}/>Klaim untuk saya</button></div></form> : null}

                                    {Boolean(selected.current_stage) && !pendingReview ? <p className="rounded-lg border border-warning-border bg-warning-muted p-3 text-sm font-medium text-warning">Tahap aktif tidak memiliki review yang menunggu. Periksa riwayat alur.</p> : null}

                                    {canReview ? <form action={decideContentReviewAction} className="rounded-lg border border-info-border bg-info-muted/50 p-4"><HiddenContext filters={params} program={program} track={track} returnTo={params.returnTo}/><input type="hidden" name="question_id" value={s(selected.id)}/><AdminField label="Catatan reviewer"><textarea className={`${adminInputClass} min-h-24 resize-y`} name="notes" placeholder="Tuliskan alasan keputusan agar penulis atau reviewer berikutnya memahami konteks..."/></AdminField><div className="mt-3 flex flex-wrap gap-2"><button className={adminSuccessButtonClass} name="decision" value="approve"><CheckCircle2 size={16}/>Setujui</button><button className={adminWarningButtonClass} name="decision" value="revision_required"><Clock3 size={16}/>Minta revisi</button><button className={adminDangerButtonClass} name="decision" value="reject"><XCircle size={16}/>Tolak</button></div></form> : null}

                                    {Boolean(selected.current_stage) && !canReview && Boolean(selected.reviewer_id) ? <p className="text-sm font-medium leading-6 text-muted-foreground">Tahap ini ditugaskan ke <b className="text-foreground">{profileName(assignedReviewer)}</b>. Hanya reviewer tersebut yang dapat memberikan keputusan.</p> : null}
                                    {currentActorIsAuthor && Boolean(selected.current_stage) ? <div className="rounded-lg border border-danger-border bg-danger-muted p-3 text-sm font-medium text-danger">Self-review diblok. Author tidak dapat mereview soal sendiri.</div> : null}
                                    {canPublish ? <form action={publishContentQuestionAction}><HiddenContext filters={params} program={program} track={track} returnTo={params.returnTo}/><input type="hidden" name="question_id" value={s(selected.id)}/><button className={adminPrimaryButtonClass}><ShieldCheck size={16}/>Terbitkan soal</button></form> : null}
                                </div>
                            </AdminCard>

                            {canEdit ? (
                                <section className="rounded-lg border border-warning-border bg-card ">
                                    <details open>
                                        <summary className="cursor-pointer list-none border-b border-border p-5"><div><h3 className="text-base font-semibold text-foreground">Ubah draf / revisi</h3><p className="mt-1 text-sm font-medium text-muted-foreground">Ubah konten dan klasifikasi. Simpan sebelum mengirim kembali ke review.</p></div></summary>
                                        <ReviewDraftForm action={saveContentDraftAction}><AdminFormSection title="Isi & Klasifikasi">
                                            <HiddenContext filters={params} program={program} track={track} returnTo={params.returnTo}/><input type="hidden" name="id" value={s(selected.id)}/>
                                            <input type="hidden" name="expected_version" value={s(selected.version)}/>
                                            <input type="hidden" name="expected_updated_at" value={s(selected.updated_at)}/>
                                            <AdminField label="Mapel / subtes"><select className={adminInputClass} name="subject_code" required defaultValue={s(data.subjectById.get(s(selected.subject_id))?.code)}>{data.catalog.subjects.map((subject) => <option key={subject.id} value={subject.code}>{subject.code} · {subject.name}</option>)}</select></AdminField>
                                            <ReviewQuestionFields defaultType={s(selected.question_type)} optionsDefaultValue={serializeOptionRows(data.options)} middle={<>
                                                <QuestionRichTextEditor name="stem" label="Pertanyaan" className="lg:col-span-2" required defaultValue={s(selected.stem)} minHeight="min-h-32"/>
                                                <AdminField label="Tingkat kesulitan"><select className={adminInputClass} name="difficulty" defaultValue={s(selected.difficulty)}><option value="easy">Mudah</option><option value="medium">Sedang</option><option value="hard">Sulit</option></select></AdminField>
                                                <AdminField label="Level kognitif"><input className={adminInputClass} name="cognitive_level" defaultValue={s(selected.cognitive_level)}/></AdminField>
                                                <AdminField label="Estimasi detik"><input className={adminInputClass} type="number" min="1" name="estimated_seconds" defaultValue={s(selected.estimated_seconds)}/></AdminField>
                                                <AdminField label="Sumber / referensi"><input className={adminInputClass} name="source_reference" defaultValue={s(selected.source_reference)}/></AdminField>
                                                <AdminField label="Stimulus"><select className={adminInputClass} name="stimulus_id" defaultValue={s(selected.stimulus_id)}><option value="">Tanpa stimulus</option>{data.stimulusCandidates.map((stimulus) => <option key={s(stimulus.id)} value={s(stimulus.id)}>{s(stimulus.stimulus_code)} · {s(stimulus.title) || s(stimulus.content).slice(0, 60)}</option>)}</select></AdminField>
                                                <AdminField label="Materi utama"><select className={adminInputClass} name="knowledge_node_id" defaultValue={primaryNode ? s(primaryNode.knowledge_node_id) : ''}><option value="">Belum dipetakan</option>{data.subjectKnowledgeNodes.map((node) => <option key={s(node.id)} value={s(node.id)}>{'—'.repeat(Math.min(n(node.depth), 4))} {s(node.name)}</option>)}</select></AdminField>
                                            </>}/>
                                            <QuestionRichTextEditor name="explanation" label="Pembahasan" className="lg:col-span-2" defaultValue={s(data.explanation?.content)} minHeight="min-h-32"/>
                                            <AdminField label="Alasan perubahan" className="lg:col-span-2"><input className={adminInputClass} name="change_reason" defaultValue="Pembaruan dari Reviewer Workspace"/></AdminField>
                                            <div className="lg:col-span-2"><button className={adminSecondaryButtonClass}>Simpan perubahan</button></div>
                                        </AdminFormSection></ReviewDraftForm>
                                    </details>
                                </section>
                            ) : null}

                            <section className="grid gap-5 lg:grid-cols-2">
                                <AdminCard className="min-w-0 p-5">
                                    <AdminSectionHeading title="Riwayat review" description="Keputusan reviewer per tahap dan versi soal."/>
                                    <div className="mt-4 space-y-3">{data.currentReviews.length === 0 ? <p className="text-sm font-medium text-muted-foreground">Belum ada riwayat review.</p> : data.currentReviews.map((review) => <div key={s(review.id)} className="rounded-lg border border-border bg-muted p-3.5"><div className="flex flex-wrap items-center justify-between gap-2"><b className="text-sm text-foreground">Putaran {n(review.review_round)} · {stageLabel(review.review_stage)}</b><AdminBadge variant={adminStatusVariant(review.status)}>{adminStatusLabel(review.status)}</AdminBadge></div><div className="mt-1 text-xs font-medium text-muted-foreground">Reviewer: {profileName(data.profileById.get(s(review.reviewer_id)))} · Versi {s(review.question_version) || '—'} · {formatDateTime(review.completed_at || review.updated_at)}</div>{Boolean(review.notes) ? <div className="mt-2 rounded-lg bg-card p-2.5 text-sm font-medium leading-6 text-foreground ring-1 ring-border">{s(review.notes)}</div> : null}</div>)}</div>
                                </AdminCard>

                                <AdminCard className="min-w-0 p-5">
                                    <AdminSectionHeading title="Jejak audit" description="Riwayat aksi pada soal ini."/>
                                    <div className="mt-4 max-h-80 space-y-2 overflow-y-auto">{data.auditLogs.length === 0 ? <p className="text-sm font-medium text-muted-foreground">Belum ada aksi audit untuk soal ini.</p> : data.auditLogs.map((log) => <div key={s(log.id)} className="rounded-lg border border-border p-3"><div className="text-sm font-semibold text-foreground" title={s(log.action)}>{adminAuditLabel(log.action)}</div><div className="mt-1 text-xs font-medium text-muted-foreground">{formatDateTime(log.created_at)} · {profileName(data.profileById.get(s(log.actor_user_id)), 'Sistem')}</div></div>)}</div>
                                </AdminCard>
                            </section>

                            <AdminCard className="min-w-0 p-5">
                                <AdminSectionHeading title="Riwayat versi soal" description="Salinan perubahan disimpan untuk audit dan pemulihan konten."/>
                                <div className="mt-4 max-h-96 space-y-2 overflow-y-auto">{data.versions.length === 0 ? <p className="text-sm font-medium text-muted-foreground">Salinan versi belum tersedia.</p> : data.versions.map((version) => <details key={s(version.id)} className="rounded-lg border border-border bg-muted p-3"><summary className="cursor-pointer text-sm font-semibold text-foreground">v{n(version.version)} · {formatDateTime(version.created_at)} · {s(version.change_reason) || 'Tanpa catatan'}</summary><pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-950 p-3 text-[11px] text-slate-200">{JSON.stringify(version.snapshot, null, 2)}</pre></details>)}</div>
                            </AdminCard>
                        </>
                    ) : null}
                </section>
            </div> : null}
        </AdminPage>
    )
}
