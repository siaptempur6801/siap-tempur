import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
    ArrowLeft,
    CheckCircle2,
    ClipboardCheck,
    Clock3,
    FilePlus2,
    History,
    Send,
    ShieldCheck,
    Sparkles,
    UserCheck,
    XCircle,
} from 'lucide-react'
import MathRenderer from '@/components/MathRenderer'
import ReviewBatchPanel from '@/components/admin/ReviewBatchPanel'
import ReviewDraftForm from '@/components/admin/ReviewDraftForm'
import ReviewQuestionFields from '@/components/admin/ReviewQuestionFields'
import { DEFAULT_REVIEW_BATCH_CODE } from '@/lib/review-batch'
import {
    AdminBadge,
    AdminCard,
    AdminEmptyState,
    AdminField,
    AdminFeedbackBanner,
    AdminMetric,
    AdminPage,
    AdminPageHeader,
    AdminSectionHeading,
    adminDangerButtonClass,
    adminInputClass,
    adminPrimaryButtonClass,
    adminSecondaryButtonClass,
    adminSuccessButtonClass,
    adminWarningButtonClass,
} from '@/components/admin/AdminUi'
import AdminListToolbar from '@/components/admin/AdminListToolbar'
import AdminPagination from '@/components/admin/AdminPagination'
import { adminPageHref, adminPageSummary, parseAdminPage } from '@/lib/admin-pagination'
import { adminAuditLabel, adminStatusLabel, adminStatusVariant, formatDateTime } from '@/lib/admin-format'
import { cn } from '@/lib/utils'
import { PERMISSIONS } from '@/src/auth/permissions'
import { authorizationService } from '@/src/services/authorization.service'
import { contentReviewService } from '@/src/services/content-review.service'
import {
    assignContentReviewerAction,
    decideContentReviewAction,
    publishContentQuestionAction,
    saveContentDraftAction,
    submitContentQuestionAction,
} from '@/app/actions/content-review'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type Row = Record<string, unknown>

/** Urutan status pada filter — label memakai `adminStatusLabel` agar konsisten. */
const REVIEW_STATUS_OPTIONS = ['draft', 'submitted', 'editorial_review', 'academic_review', 'technical_qa', 'revision_required', 'approved', 'published', 'rejected'] as const

type SearchParams = {
    program?: string
    track?: string
    subject?: string
    status?: string
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
    for (const key of ['program', 'track', 'subject', 'status', 'stage', 'reviewer', 'q', 'question', 'new', 'page', 'bulk'] as const) {
        const value = merged[key]
        if (value) query.set(key, value)
    }
    return `/admin/content/review?${query.toString()}`
}

function HiddenContext({ program, track }: { program: string; track: string }) {
    return <><input type="hidden" name="program_code" value={program}/><input type="hidden" name="track_code" value={track}/></>
}

function OptionPreview({ option }: { option: Row }) {
    const isCorrect = option.is_correct === true
    return (
        <div className={cn('rounded-xl border p-3.5 transition', isCorrect ? 'border-emerald-200 bg-emerald-50/70' : 'border-slate-200 bg-white')}>
            <div className="flex items-start gap-3">
                <span className={cn('flex h-7 min-w-7 items-center justify-center rounded-lg border text-xs font-black', isCorrect ? 'border-emerald-300 bg-emerald-100 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-600')}>{s(option.option_key)}</span>
                <div className="min-w-0 flex-1">
                    {Boolean(option.response_group) ? <div className="mb-1 text-[11px] font-extrabold uppercase text-blue-600">{s(option.response_group)}</div> : null}
                    <div className="text-sm font-medium leading-6 text-slate-800"><MathRenderer text={s(option.content)}/></div>
                    {Boolean(option.image_url) ? <div className="mt-2 break-all text-[10px] font-medium text-slate-500">Gambar: {s(option.image_url)}</div> : null}
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
        <ol aria-label="Progres review" className="mt-4 grid grid-cols-4 gap-2 border-t border-slate-100 pt-4">
            {REVIEW_FLOW.map((step, index) => {
                const complete = activeIndex > index
                const active = activeIndex === index
                return <li key={step.key} className="min-w-0">
                    <div className={`h-1.5 rounded-full ${complete ? 'bg-emerald-500' : active ? 'bg-blue-600' : 'bg-slate-200'}`}/>
                    <p className={`mt-1.5 truncate text-[10px] font-extrabold sm:text-xs ${active ? 'text-blue-700' : complete ? 'text-emerald-700' : 'text-slate-400'}`}>{complete ? '✓ ' : ''}{step.label}</p>
                </li>
            })}
        </ol>
    )
}

function queueTaskLabel(question: Row) {
    const pending = question.pending_review as Row | null | undefined
    if (question.current_stage && !pending?.reviewer_id) return 'Pilih reviewer'
    if (question.current_stage) return `Review ${stageLabel(question.current_stage)}`
    if (lower(question.status) === 'approved') return 'Siap diterbitkan'
    if (lower(question.status) === 'revision_required') return 'Perlu revisi'
    if (lower(question.status) === 'published') return 'Sudah terbit'
    return 'Lengkapi draf'
}

export default async function ContentReviewWorkspace({ searchParams }: { searchParams: Promise<SearchParams> }) {
    const params = await searchParams
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

    const data = await contentReviewService.getWorkspaceData(context, {
        subject: params.subject || null,
        status: params.status || null,
        stage: params.stage || null,
        reviewer: params.reviewer || null,
        q: params.q || null,
        page: parseAdminPage(params.page),
        assignee: authorization.userId,
    }, params.question || null)

    const program = data.catalog.program.code
    const track = data.catalog.track.code
    const selected = data.selectedQuestion as Row | null
    const pendingReview = selected?.pending_review && typeof selected.pending_review === 'object' ? selected.pending_review as Row : null
    const author = selected ? data.profileById.get(s(selected.author_id)) : null
    const assignedReviewer = selected?.reviewer_id ? data.profileById.get(s(selected.reviewer_id)) : null
    const currentActorIsAuthor = selected ? s(selected.author_id) === authorization.userId : false
    const canManageQuestions = permissions.has(PERMISSIONS.QUESTION_MANAGE)
    const canCreate = permissions.has(PERMISSIONS.CONTENT_CREATE) || canManageQuestions
    const canEdit = Boolean(selected)
        && ['draft', 'revision_required', 'rejected'].includes(lower(selected?.status))
        && (permissions.has(PERMISSIONS.CONTENT_UPDATE) || canManageQuestions)
        && (currentActorIsAuthor || canManageQuestions)
    const canSubmit = Boolean(selected)
        && ['draft', 'revision_required'].includes(lower(selected?.status))
        && (permissions.has(PERMISSIONS.CONTENT_UPDATE) || permissions.has(PERMISSIONS.CONTENT_CREATE) || canManageQuestions)
        && (currentActorIsAuthor || canManageQuestions)
    const canAssign = Boolean(selected?.current_stage)
        && Boolean(pendingReview)
        && (permissions.has(PERMISSIONS.CONTENT_REVIEW) || canManageQuestions)
    const canReview = Boolean(selected?.current_stage)
        && permissions.has(PERMISSIONS.CONTENT_REVIEW)
        && s(selected?.reviewer_id) === authorization.userId
        && !currentActorIsAuthor
    const canPublish = lower(selected?.status) === 'approved' && permissions.has(PERMISSIONS.CONTENT_PUBLISH)
    const nextActionCopy = canReview
        ? 'Periksa isi soal di atas, tulis catatan bila perlu, lalu pilih keputusan review.'
        : canAssign
            ? `Pilih reviewer untuk tahap ${stageLabel(selected?.current_stage)}.`
            : canSubmit
                ? 'Pastikan draf lengkap, lalu kirim ke Editorial Review.'
                : canPublish
                    ? 'Seluruh tahap review selesai. Soal siap diterbitkan.'
                    : 'Tidak ada tindakan yang perlu Anda lakukan pada tahap ini.'
    const primaryNode = data.knowledgeMappings.find((row) => lower(row.relation_type) === 'primary') as Row | undefined

    const visibleQuestions = data.questions
    // Angka-angka ini exact (agregat seluruh tabel), bukan hasil menghitung
    // jendela daftar — lihat `countQuestionsByStatus`.
    const assignedToMe = data.counts.assignedToMe
    const editorialCount = data.counts.editorial
    const academicCount = data.counts.academic
    const technicalCount = data.counts.technical

    const createNew = params.new === '1'
    const activeSubjectCode = params.subject || data.catalog.subjects[0]?.code || ''
    // Panel review massal hanya relevan untuk batch CPNS/SKD yang sedang
    // dikerjakan. Konteks lain tidak perlu query tambahan.
    const isBatchContext = program === 'CPNS' && track === 'SKD'
    const bulkMode = isBatchContext && params.bulk === '1'

    return (
        <AdminPage>
            <AdminPageHeader
                title="Reviewer Workspace"
                description={`Kelola soal ${program} / ${track} dari draft sampai published dalam satu antrian kerja. Context dapat diganti dari header admin.`}
                steps={bulkMode ? ['Siapkan soal', 'Review 3 tahap', 'Terbitkan'] : ['Pilih soal', 'Periksa isi', 'Ambil tindakan']}
                action={<div className="flex flex-wrap items-center gap-2">{bulkMode ? <Link href={workspaceHref({ ...params, program, track }, { bulk: undefined })} className={adminSecondaryButtonClass}><ArrowLeft size={16}/>Kembali ke antrean</Link> : <Link href={workspaceHref({ program: 'CPNS', track: 'SKD', bulk: '1' })} className={adminSecondaryButtonClass}><Sparkles size={16}/>Buka review massal</Link>}{canCreate && !bulkMode ? <Link href={workspaceHref({ ...params, program, track }, { new: '1', question: undefined })} className={adminPrimaryButtonClass}><FilePlus2 size={16}/>Buat soal</Link> : undefined}</div>}
            />

            <AdminFeedbackBanner ok={params.ok} error={params.error}/>

            {bulkMode ? <div id="review-massal"><ReviewBatchPanel batch={DEFAULT_REVIEW_BATCH_CODE} program={program} track={track} actorId={authorization.userId} canReview={permissions.has(PERMISSIONS.CONTENT_REVIEW)} canPublish={permissions.has(PERMISSIONS.CONTENT_PUBLISH)}/></div> : null}

            <section className={cn('grid gap-3 sm:grid-cols-2 xl:grid-cols-5', bulkMode ? 'hidden' : selected ? 'hidden xl:grid' : '')}>
                <AdminMetric label="Editorial" value={editorialCount} helper="Menunggu editorial" icon={<Clock3 size={18}/>} tone="yellow"/>
                <AdminMetric label="Academic" value={academicCount} helper="Menunggu akademik" icon={<ClipboardCheck size={18}/>} tone="violet"/>
                <AdminMetric label="Technical QA" value={technicalCount} helper="Menunggu QA" icon={<ShieldCheck size={18}/>} tone="blue"/>
                <AdminMetric label="Ditugaskan ke saya" value={assignedToMe} helper="Tugas reviewer aktif" icon={<UserCheck size={18}/>} tone="green"/>
                <AdminMetric label="Perlu revisi" value={data.counts.revisionRequired} helper="Kembali ke author" icon={<History size={18}/>} tone="orange"/>
            </section>

            <div className={bulkMode ? 'hidden' : selected ? 'hidden xl:block' : ''}>
                <AdminListToolbar
                    pathname="/admin/content/review"
                    program={program}
                    track={track}
                    search={params.q || ''}
                    status={params.status || ''}
                    statusOptions={REVIEW_STATUS_OPTIONS.map((status) => ({ value: status, label: adminStatusLabel(status) }))}
                    placeholder="Cari kode atau isi soal..."
                    resultCount={visibleQuestions.length}
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
                <section className="rounded-2xl border border-blue-200 bg-white shadow-sm ring-4 ring-blue-50">
                    <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
                        <div><h2 className="text-lg font-black text-slate-950">Buat draft soal</h2><p className="mt-1 text-sm font-medium text-slate-500">Isi content utama dulu. Klasifikasi dan opsi disimpan sebagai satu draft transactional.</p></div>
                        <Link className="text-sm font-extrabold text-slate-500 hover:text-slate-800" href={workspaceHref({ program, track })}>Tutup</Link>
                    </div>
                    <ReviewDraftForm action={saveContentDraftAction} className="grid gap-4 p-5 lg:grid-cols-2">
                        <HiddenContext program={program} track={track}/>
                        <AdminField label="Subject"><select className={adminInputClass} name="subject_code" required defaultValue={activeSubjectCode}>{data.catalog.subjects.map((subject) => <option key={subject.id} value={subject.code}>{subject.code} · {subject.name}</option>)}</select></AdminField>
                        <ReviewQuestionFields middle={<>
                            <AdminField label="Pertanyaan" className="lg:col-span-2"><textarea className={`${adminInputClass} min-h-32 resize-y`} name="stem" required placeholder="Tulis pertanyaan dengan jelas..."/></AdminField>
                            <AdminField label="Difficulty"><select className={adminInputClass} name="difficulty" defaultValue="medium"><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></AdminField>
                            <AdminField label="Cognitive level"><input className={adminInputClass} name="cognitive_level" placeholder="application / reasoning"/></AdminField>
                            <AdminField label="Estimasi detik"><input className={adminInputClass} type="number" min="1" name="estimated_seconds" placeholder="60"/></AdminField>
                            <AdminField label="Source reference"><input className={adminInputClass} name="source_reference" placeholder="Sumber atau referensi"/></AdminField>
                        </>}/>
                        <AdminField label="Pembahasan" className="lg:col-span-2"><textarea className={`${adminInputClass} min-h-32 resize-y`} name="explanation" placeholder="Tulis alasan jawaban dan konsep yang diuji..."/></AdminField>
                        <AdminField label="Alasan / catatan perubahan" className="lg:col-span-2"><input className={adminInputClass} name="change_reason" defaultValue="Initial draft from Content Workspace"/></AdminField>
                        <div className="flex flex-wrap gap-2 lg:col-span-2"><button className={adminPrimaryButtonClass}><FilePlus2 size={16}/>Simpan draft</button><Link href={workspaceHref({ program, track })} className={adminSecondaryButtonClass}>Batal</Link></div>
                    </ReviewDraftForm>
                </section>
            ) : null}

            {!bulkMode ? <div className="grid items-start gap-5 xl:grid-cols-[minmax(360px,0.72fr)_minmax(0,1.28fr)]">
                <AdminCard className={cn('overflow-hidden xl:sticky xl:top-[88px]', selected ? 'hidden xl:block' : '')}>
                    <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3.5"><div><h2 className="text-sm font-black text-slate-950">Review Queue</h2><p className="text-xs font-medium text-slate-500">{data.total} soal sesuai filter</p></div><AdminBadge>{data.counts.unassigned} belum ditugaskan</AdminBadge></div>
                    <div className="max-h-[calc(100vh-270px)] overflow-y-auto">
                        {visibleQuestions.length === 0 ? (data.clampTo ? (
                            <AdminEmptyState
                                title="Tidak ada soal di halaman ini"
                                description={`Daftar hanya punya ${data.lastPage} halaman. Nomor halaman di alamat mungkin sudah usang.`}
                                action={<Link className={adminSecondaryButtonClass} href={adminPageHref('/admin/content/review', { ...params, program, track, question: undefined }, data.lastPage)}>Ke halaman {data.lastPage}</Link>}
                            />
                        ) : <AdminEmptyState title="Queue kosong" description="Tidak ada soal untuk filter ini. Coba ubah subject, status, reviewer, atau kata kunci."/>) : visibleQuestions.map((question) => {
                            const id = s(question.id)
                            const active = id === data.selectedId
                            const subject = data.subjectById.get(s(question.subject_id))
                            const pending = question.pending_review
                            return (
                                <Link key={id} href={workspaceHref({ ...params, program, track }, { question: id, new: undefined })} aria-current={active ? 'true' : undefined} className={cn('block border-b border-slate-100 px-4 py-3.5 transition last:border-b-0', active ? 'bg-blue-50/80 shadow-[inset_3px_0_0_#2563eb]' : 'bg-white hover:bg-slate-50')}>
                                    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-black text-slate-900">{s(question.question_code) || 'Tanpa kode'}</span><span className="text-[10px] font-bold text-slate-500">{s(subject?.code)} · v{n(question.version)}</span></div><p className="mt-1.5 line-clamp-2 text-sm font-semibold leading-5 text-slate-700">{s(question.stem)}</p></div><AdminBadge variant={adminStatusVariant(question.status)}>{adminStatusLabel(question.status)}</AdminBadge></div>
                                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold text-slate-500"><span>{Boolean(question.current_stage) ? stageLabel(question.current_stage) : adminStatusLabel(question.status)}{Boolean(pending) ? ` · ${pending?.reviewer_id ? profileName(data.profileById.get(s(pending.reviewer_id)), 'Assigned') : 'Belum ada reviewer'}` : ''}</span><span className="rounded-full bg-slate-100 px-2 py-1 font-extrabold text-slate-700">{queueTaskLabel(question)}</span></div>
                                </Link>
                            )
                        })}
                    </div>
                    {data.total > 0 ? (
                        <AdminPagination
                            pathname="/admin/content/review"
                            params={{ program, track, subject: params.subject || '', status: params.status || '', stage: params.stage || '', reviewer: params.reviewer || '', q: params.q || '' }}
                            summary={adminPageSummary(data.page, visibleQuestions.length, data.total)}
                            noun="soal"
                        />
                    ) : null}
                </AdminCard>

                <main className="min-w-0 space-y-5">
                    {selected ? <Link href={workspaceHref({ ...params, program, track }, { question: undefined })} className={`${adminSecondaryButtonClass} xl:hidden`}><ArrowLeft size={16}/>Kembali ke antrean</Link> : null}
                    {!selected ? <AdminCard><AdminEmptyState title="Pilih soal dari queue" description="Detail soal, workflow, reviewer, history, dan tindakan akan tampil di panel ini."/></AdminCard> : null}
                    {selected ? (
                        <>
                            <AdminCard className="p-5">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-black uppercase tracking-wide text-blue-600">{s(data.subjectById.get(s(selected.subject_id))?.code)}</span><span className="text-xs font-bold text-slate-500">{s(selected.question_type)} · v{n(selected.version)}</span></div><h2 className="mt-1 text-xl font-black text-slate-950">{s(selected.question_code) || 'Soal tanpa kode'}</h2><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-slate-500"><span>Penulis: <b className="text-slate-700">{profileName(author)}</b></span><span>Reviewer: <b className="text-slate-700">{profileName(assignedReviewer)}</b></span><span>Diperbarui: {formatDateTime(selected.updated_at)}</span></div></div>
                                    <AdminBadge variant={adminStatusVariant(selected.status)}>{adminStatusLabel(selected.status)}</AdminBadge>
                                </div>
                                <ReviewProgress question={selected}/>
                            </AdminCard>

                            <AdminCard className="p-5">
                                <AdminSectionHeading title="Periksa isi soal" description="Baca pertanyaan, jawaban, dan pembahasan sebelum mengambil tindakan." step={2}/>
                                {data.stimulus ? <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">{Boolean(data.stimulus.title) ? <h4 className="mb-2 font-black text-slate-900">{s(data.stimulus.title)}</h4> : null}<div className="whitespace-pre-wrap text-sm font-medium leading-6 text-slate-700"><MathRenderer text={s(data.stimulus.content)}/></div>{Boolean(data.stimulus.source_reference) ? <div className="mt-2 text-xs font-semibold text-slate-500">Sumber: {s(data.stimulus.source_reference)}</div> : null}</div> : null}
                                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-base font-bold leading-7 text-slate-900"><MathRenderer text={s(selected.stem)}/></div>
                                <div className="mt-4 space-y-2.5">{data.options.map((option) => <OptionPreview key={s(option.id)} option={option}/>)}</div>
                                <div className="mt-5 border-t border-slate-200 pt-4"><div className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">Pembahasan</div><div className="mt-2 whitespace-pre-wrap text-sm font-medium leading-6 text-slate-700">{data.explanation?.content ? <MathRenderer text={s(data.explanation.content)}/> : <span className="font-bold text-orange-700">Pembahasan belum tersedia.</span>}</div></div>
                                <div className="mt-4 border-t border-slate-200 pt-4"><div className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">Pemetaan materi</div><div className="mt-2 flex flex-wrap gap-2">{data.knowledgeNodes.length ? data.knowledgeNodes.map((node) => <AdminBadge key={s(node.id)} variant="blue">{s(node.name)}</AdminBadge>) : <span className="text-sm font-bold text-orange-700">Belum dipetakan.</span>}</div></div>
                            </AdminCard>

                            <AdminCard className="border-blue-200 p-5 ring-4 ring-blue-50/70">
                                <AdminSectionHeading title="Tindakan berikutnya" description={Boolean(selected.current_stage) ? `Tahap aktif: ${stageLabel(selected.current_stage)}. Keputusan hanya memakai versi yang tampil di atas.` : `Status saat ini: ${adminStatusLabel(selected.status)}`} step={3}/>
                                <div className="mt-4 space-y-4">
                                    <p className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold leading-6 text-blue-900">{nextActionCopy}</p>
                                    {canSubmit ? <form action={submitContentQuestionAction}><HiddenContext program={program} track={track}/><input type="hidden" name="question_id" value={s(selected.id)}/><button className={adminPrimaryButtonClass}><Send size={16}/>Kirim ke Editorial Review</button></form> : null}

                                    {canAssign ? <form action={assignContentReviewerAction} className="rounded-xl border border-slate-200 bg-slate-50 p-4"><HiddenContext program={program} track={track}/><input type="hidden" name="question_id" value={s(selected.id)}/><label htmlFor="assign-reviewer-select" className="block text-xs font-extrabold uppercase tracking-wide text-slate-500">Pilih reviewer</label><div className="mt-2 flex flex-col gap-2 sm:flex-row"><select id="assign-reviewer-select" className={adminInputClass} name="reviewer_id" required defaultValue={s(pendingReview?.reviewer_id)}><option value="">Pilih reviewer</option>{data.reviewers.filter((reviewer) => s(reviewer.id) !== s(selected.author_id)).map((reviewer) => <option key={reviewer.id} value={reviewer.id}>{reviewer.full_name}</option>)}</select><button className={adminPrimaryButtonClass}><UserCheck size={16}/>Tugaskan</button></div></form> : null}

                                    {Boolean(selected.current_stage) && !pendingReview ? <p className="rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm font-bold text-orange-800">Stage aktif tidak memiliki pending review. Periksa workflow history.</p> : null}

                                    {canReview ? <form action={decideContentReviewAction} className="rounded-xl border border-blue-200 bg-blue-50/50 p-4"><HiddenContext program={program} track={track}/><input type="hidden" name="question_id" value={s(selected.id)}/><AdminField label="Catatan reviewer"><textarea className={`${adminInputClass} min-h-24 resize-y`} name="notes" placeholder="Tuliskan alasan keputusan agar penulis atau reviewer berikutnya memahami konteks..."/></AdminField><div className="mt-3 flex flex-wrap gap-2"><button className={adminSuccessButtonClass} name="decision" value="approve"><CheckCircle2 size={16}/>Setujui</button><button className={adminWarningButtonClass} name="decision" value="revision_required"><Clock3 size={16}/>Minta revisi</button><button className={adminDangerButtonClass} name="decision" value="reject"><XCircle size={16}/>Tolak</button></div></form> : null}

                                    {Boolean(selected.current_stage) && !canReview && Boolean(selected.reviewer_id) ? <p className="text-sm font-medium leading-6 text-slate-500">Tahap ini ditugaskan ke <b className="text-slate-800">{profileName(assignedReviewer)}</b>. Hanya reviewer tersebut yang dapat memberikan keputusan.</p> : null}
                                    {currentActorIsAuthor && Boolean(selected.current_stage) ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">Self-review diblok. Author tidak dapat mereview soal sendiri.</div> : null}
                                    {canPublish ? <form action={publishContentQuestionAction}><HiddenContext program={program} track={track}/><input type="hidden" name="question_id" value={s(selected.id)}/><button className={adminPrimaryButtonClass}><ShieldCheck size={16}/>Publish Question</button></form> : null}
                                </div>
                            </AdminCard>

                            {canEdit ? (
                                <section className="rounded-2xl border border-orange-200 bg-white shadow-sm">
                                    <details open>
                                        <summary className="cursor-pointer list-none border-b border-slate-200 p-5"><div><h3 className="text-base font-black text-slate-950">Edit draft / revisi</h3><p className="mt-1 text-sm font-medium text-slate-500">Ubah content dan klasifikasi. Simpan sebelum mengirim kembali ke review.</p></div></summary>
                                        <ReviewDraftForm action={saveContentDraftAction} className="grid gap-4 p-5 lg:grid-cols-2">
                                            <HiddenContext program={program} track={track}/><input type="hidden" name="id" value={s(selected.id)}/>
                                            <input type="hidden" name="expected_version" value={s(selected.version)}/>
                                            <input type="hidden" name="expected_updated_at" value={s(selected.updated_at)}/>
                                            <AdminField label="Subject"><select className={adminInputClass} name="subject_code" required defaultValue={s(data.subjectById.get(s(selected.subject_id))?.code)}>{data.catalog.subjects.map((subject) => <option key={subject.id} value={subject.code}>{subject.code} · {subject.name}</option>)}</select></AdminField>
                                            <ReviewQuestionFields defaultType={s(selected.question_type)} middle={<>
                                                <AdminField label="Pertanyaan" className="lg:col-span-2"><textarea className={`${adminInputClass} min-h-32 resize-y`} name="stem" required defaultValue={s(selected.stem)}/></AdminField>
                                                <AdminField label="Difficulty"><select className={adminInputClass} name="difficulty" defaultValue={s(selected.difficulty)}><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></AdminField>
                                                <AdminField label="Cognitive level"><input className={adminInputClass} name="cognitive_level" defaultValue={s(selected.cognitive_level)}/></AdminField>
                                                <AdminField label="Estimasi detik"><input className={adminInputClass} type="number" min="1" name="estimated_seconds" defaultValue={s(selected.estimated_seconds)}/></AdminField>
                                                <AdminField label="Source reference"><input className={adminInputClass} name="source_reference" defaultValue={s(selected.source_reference)}/></AdminField>
                                                <AdminField label="Stimulus"><select className={adminInputClass} name="stimulus_id" defaultValue={s(selected.stimulus_id)}><option value="">Tanpa stimulus</option>{data.stimulusCandidates.map((stimulus) => <option key={s(stimulus.id)} value={s(stimulus.id)}>{s(stimulus.stimulus_code)} · {s(stimulus.title) || s(stimulus.content).slice(0, 60)}</option>)}</select></AdminField>
                                                <AdminField label="Primary knowledge node"><select className={adminInputClass} name="knowledge_node_id" defaultValue={primaryNode ? s(primaryNode.knowledge_node_id) : ''}><option value="">Belum dipetakan</option>{data.subjectKnowledgeNodes.map((node) => <option key={s(node.id)} value={s(node.id)}>{'—'.repeat(Math.min(n(node.depth), 4))} {s(node.name)}</option>)}</select></AdminField>
                                            </>}/>
                                            <AdminField label="Pembahasan" className="lg:col-span-2"><textarea className={`${adminInputClass} min-h-32 resize-y`} name="explanation" defaultValue={s(data.explanation?.content)}/></AdminField>
                                            <AdminField label="Alasan perubahan" className="lg:col-span-2"><input className={adminInputClass} name="change_reason" defaultValue="Content workspace update"/></AdminField>
                                            <div className="lg:col-span-2"><button className={adminPrimaryButtonClass}>Simpan perubahan</button></div>
                                        </ReviewDraftForm>
                                    </details>
                                </section>
                            ) : null}

                            <section className="grid gap-5 lg:grid-cols-2">
                                <AdminCard className="min-w-0 p-5">
                                    <AdminSectionHeading title="Review Rounds" description="Keputusan reviewer per tahap dan versi soal."/>
                                    <div className="mt-4 space-y-3">{data.currentReviews.length === 0 ? <p className="text-sm font-medium text-slate-500">Belum ada review round.</p> : data.currentReviews.map((review) => <div key={s(review.id)} className="rounded-xl border border-slate-200 bg-slate-50 p-3.5"><div className="flex flex-wrap items-center justify-between gap-2"><b className="text-sm text-slate-900">Round {n(review.review_round)} · {stageLabel(review.review_stage)}</b><AdminBadge variant={adminStatusVariant(review.status)}>{adminStatusLabel(review.status)}</AdminBadge></div><div className="mt-1 text-xs font-medium text-slate-500">Reviewer: {profileName(data.profileById.get(s(review.reviewer_id)))} · Version {s(review.question_version) || '—'} · {formatDateTime(review.completed_at || review.updated_at)}</div>{Boolean(review.notes) ? <div className="mt-2 rounded-lg bg-white p-2.5 text-sm font-medium leading-6 text-slate-700 ring-1 ring-slate-200">{s(review.notes)}</div> : null}</div>)}</div>
                                </AdminCard>

                                <AdminCard className="min-w-0 p-5">
                                    <AdminSectionHeading title="Audit Trail" description="Riwayat aksi pada soal ini."/>
                                    <div className="mt-4 max-h-80 space-y-2 overflow-y-auto">{data.auditLogs.length === 0 ? <p className="text-sm font-medium text-slate-500">Belum ada audit action untuk soal ini.</p> : data.auditLogs.map((log) => <div key={s(log.id)} className="rounded-xl border border-slate-200 p-3"><div className="text-sm font-extrabold text-slate-800" title={s(log.action)}>{adminAuditLabel(log.action)}</div><div className="mt-1 text-xs font-medium text-slate-500">{formatDateTime(log.created_at)} · {profileName(data.profileById.get(s(log.actor_user_id)), 'System')}</div></div>)}</div>
                                </AdminCard>
                            </section>

                            <AdminCard className="min-w-0 p-5">
                                <AdminSectionHeading title="Question version history" description="Snapshot perubahan disimpan untuk audit dan rollback content."/>
                                <div className="mt-4 max-h-96 space-y-2 overflow-y-auto">{data.versions.length === 0 ? <p className="text-sm font-medium text-slate-500">Snapshot version belum tersedia.</p> : data.versions.map((version) => <details key={s(version.id)} className="rounded-xl border border-slate-200 bg-slate-50 p-3"><summary className="cursor-pointer text-sm font-extrabold text-slate-800">v{n(version.version)} · {formatDateTime(version.created_at)} · {s(version.change_reason) || 'Tanpa catatan'}</summary><pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-950 p-3 text-[11px] text-slate-200">{JSON.stringify(version.snapshot, null, 2)}</pre></details>)}</div>
                            </AdminCard>
                        </>
                    ) : null}
                </main>
            </div> : null}
        </AdminPage>
    )
}
