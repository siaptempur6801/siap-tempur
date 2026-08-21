import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
    CheckCircle2,
    ClipboardCheck,
    Clock3,
    FilePlus2,
    History,
    Send,
    ShieldCheck,
    UserCheck,
    XCircle,
} from 'lucide-react'
import MathRenderer from '@/components/MathRenderer'
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

function fmt(value: unknown) {
    const source = s(value)
    if (!source) return '—'
    const date = new Date(source)
    if (Number.isNaN(date.getTime())) return source
    return new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Jakarta',
    }).format(date)
}

function profileName(profile: unknown, fallback = 'Belum ditentukan') {
    if (!profile || typeof profile !== 'object') return fallback
    const row = profile as Row
    return s(row.display_name) || s(row.full_name) || fallback
}

function statusClass(status: unknown) {
    switch (lower(status)) {
        case 'published': return 'bg-green-200 text-green-950'
        case 'approved': return 'bg-emerald-100 text-emerald-900'
        case 'revision_required': return 'bg-orange-200 text-orange-950'
        case 'rejected': return 'bg-red-200 text-red-950'
        case 'editorial_review':
        case 'academic_review':
        case 'technical_qa': return 'bg-blue-100 text-blue-900'
        case 'submitted': return 'bg-cyan-100 text-cyan-900'
        default: return 'bg-gray-100 text-gray-800'
    }
}

function stageLabel(stage: unknown) {
    switch (s(stage)) {
        case 'editorial': return 'Editorial Review'
        case 'academic': return 'Academic Review'
        case 'technical_qa': return 'Technical QA'
        default: return '—'
    }
}

function optionsText(options: Row[]) {
    return options.map((option) => [
        s(option.option_key),
        s(option.content).replace(/\r?\n/g, ' '),
        option.score == null ? '' : s(option.score),
        option.is_correct == null ? '' : String(Boolean(option.is_correct)),
        s(option.response_group),
        option.response_group_order == null ? '' : s(option.response_group_order),
        s(option.image_url),
    ].join('|')).join('\n')
}

function workspaceHref(params: SearchParams, overrides: Partial<SearchParams> = {}) {
    const merged = { ...params, ...overrides }
    const query = new URLSearchParams()
    for (const key of ['program', 'track', 'subject', 'status', 'stage', 'reviewer', 'q', 'question', 'new'] as const) {
        const value = merged[key]
        if (value) query.set(key, value)
    }
    return `/cpns/admin/review?${query.toString()}`
}

const input = 'w-full border-2 border-gray-900 bg-white px-3 py-2 text-sm font-semibold outline-none focus:bg-yellow-50'
const button = 'inline-flex items-center justify-center gap-2 border-2 border-gray-900 bg-gray-900 px-4 py-2 text-sm font-black text-white shadow-[3px_3px_0_0_#aaa] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none disabled:cursor-not-allowed disabled:opacity-50'
const secondaryButton = 'inline-flex items-center justify-center gap-2 border-2 border-gray-900 bg-white px-4 py-2 text-sm font-black shadow-[3px_3px_0_0_#bbb] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none'

function HiddenContext({ program, track }: { program: string; track: string }) {
    return <><input type="hidden" name="program_code" value={program}/><input type="hidden" name="track_code" value={track}/></>
}

function Metric({ label, value }: { label: string; value: number }) {
    return <div className="border-2 border-gray-900 bg-white px-4 py-3 shadow-[3px_3px_0_0_#ccc]"><div className="text-2xl font-black">{value}</div><div className="text-xs font-black uppercase text-gray-500">{label}</div></div>
}

function OptionPreview({ option }: { option: Row }) {
    const isCorrect = option.is_correct === true
    return (
        <div className={cn('border-2 p-3', isCorrect ? 'border-green-700 bg-green-50' : 'border-gray-300 bg-white')}>
            <div className="flex items-start gap-3">
                <span className="flex h-7 min-w-7 items-center justify-center border-2 border-gray-900 bg-white text-xs font-black">{s(option.option_key)}</span>
                <div className="min-w-0 flex-1">
                    {Boolean(option.response_group) && <div className="mb-1 text-[11px] font-black uppercase text-blue-700">{s(option.response_group)}</div>}
                    <MathRenderer text={s(option.content)} />
                    {Boolean(option.image_url) && <div className="mt-2 break-all text-[10px] font-semibold text-gray-500">Image: {s(option.image_url)}</div>}
                    {isCorrect && <span className="mt-2 inline-block border border-green-800 bg-green-200 px-2 py-0.5 text-[10px] font-black uppercase text-green-900">Jawaban benar</span>}
                </div>
            </div>
        </div>
    )
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
    }, params.question || null)

    const program = data.catalog.program.code
    const track = data.catalog.track.code
    const selected = data.selectedQuestion as Row | null
    const pendingReview = selected?.pending_review && typeof selected.pending_review === 'object'
        ? selected.pending_review as Row
        : null
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
    const primaryNode = data.knowledgeMappings.find((row) => lower(row.relation_type) === 'primary') as Row | undefined

    const visibleQuestions = data.questions
    const assignedToMe = visibleQuestions.filter((row) => {
        const pending = row.pending_review
        return Boolean(pending && s(pending.reviewer_id) === authorization.userId)
    }).length

    const createNew = params.new === '1'
    const activeSubjectCode = params.subject || data.catalog.subjects[0]?.code || ''

    return (
        <div className="space-y-6 pb-16">
            <header className="border-2 border-gray-900 bg-white p-6 shadow-[6px_6px_0_0_#111]">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <span className="inline-flex items-center gap-2 border-2 border-gray-900 bg-violet-200 px-3 py-1 text-xs font-black uppercase"><ClipboardCheck size={15}/> Content Operations</span>
                        <h1 className="mt-3 font-handwriting text-4xl font-black sm:text-5xl">Reviewer Workspace</h1>
                        <p className="mt-2 max-w-3xl font-semibold text-gray-600">Satu tempat untuk authoring, assignment, Editorial Review, Academic Review, Technical QA, approval, publish, version history, dan audit trail.</p>
                    </div>
                    {canCreate && <Link href={workspaceHref({ ...params, program, track }, { new: '1', question: undefined })} className={button}><FilePlus2 size={17}/>Draft baru</Link>}
                </div>
            </header>

            {(params.ok || params.error) && (
                <div className={cn('border-2 border-gray-900 px-4 py-3 font-bold shadow-[3px_3px_0_0_#111]', params.error ? 'bg-red-100 text-red-900' : 'bg-green-100 text-green-900')}>{params.error || params.ok}</div>
            )}

            <section className="space-y-3 border-2 border-gray-900 bg-cyan-50 p-4 shadow-[3px_3px_0_0_#111]">
                <div className="text-xs font-black uppercase text-gray-500">Program / Track</div>
                <div className="flex flex-wrap gap-2">
                    {data.contexts.map((ctx) => {
                        const active = ctx.programCode === program && ctx.trackCode === track
                        return <Link key={`${ctx.programCode}-${ctx.trackCode}`} href={workspaceHref({}, { program: ctx.programCode, track: ctx.trackCode })} className={cn('border-2 border-gray-900 px-3 py-2 text-sm font-black', active ? 'bg-gray-900 text-white' : 'bg-white')}>{ctx.programCode} / {ctx.trackCode}</Link>
                    })}
                </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                <Metric label="Queue" value={data.counts.total}/>
                <Metric label="Unassigned" value={data.counts.unassigned}/>
                <Metric label="Assigned to me" value={assignedToMe}/>
                <Metric label="Revision" value={data.counts.revisionRequired}/>
                <Metric label="Approved" value={data.counts.approved}/>
                <Metric label="Published" value={data.counts.published}/>
            </section>

            <form className="grid gap-3 border-2 border-gray-900 bg-white p-4 shadow-[3px_3px_0_0_#ccc] md:grid-cols-3 xl:grid-cols-7" method="get">
                <input type="hidden" name="program" value={program}/><input type="hidden" name="track" value={track}/>
                <input className={input} name="q" defaultValue={params.q || ''} placeholder="Cari kode / isi soal" />
                <select className={input} name="subject" defaultValue={params.subject || ''}><option value="">Semua subject</option>{data.catalog.subjects.map((subject) => <option key={subject.id} value={subject.code}>{subject.code} · {subject.name}</option>)}</select>
                <select className={input} name="status" defaultValue={params.status || ''}><option value="">Semua status</option>{['draft','submitted','editorial_review','academic_review','technical_qa','revision_required','approved','published','rejected'].map((status) => <option key={status}>{status}</option>)}</select>
                <select className={input} name="stage" defaultValue={params.stage || ''}><option value="">Semua stage</option><option value="editorial">Editorial</option><option value="academic">Academic</option><option value="technical_qa">Technical QA</option></select>
                <select className={input} name="reviewer" defaultValue={params.reviewer || ''}><option value="">Semua reviewer</option><option value="unassigned">Belum di-assign</option>{data.reviewers.map((reviewer) => <option key={reviewer.id} value={reviewer.id}>{reviewer.full_name}</option>)}</select>
                <button className={button}>Filter</button>
                <Link className={secondaryButton} href={workspaceHref({}, { program, track })}>Reset</Link>
            </form>

            {createNew && canCreate && (
                <section className="border-2 border-gray-900 bg-yellow-50 p-5 shadow-[5px_5px_0_0_#111]">
                    <div className="mb-4 flex items-center justify-between gap-3"><div><div className="text-xs font-black uppercase text-violet-700">Authoring</div><h2 className="text-2xl font-black">Buat draft soal</h2></div><Link className="font-bold underline" href={workspaceHref({ program, track })}>Tutup</Link></div>
                    <form action={saveContentDraftAction} className="grid gap-4 lg:grid-cols-2">
                        <HiddenContext program={program} track={track}/>
                        <label className="space-y-1"><span className="text-xs font-black uppercase text-gray-500">Subject</span><select className={input} name="subject_code" required defaultValue={activeSubjectCode}>{data.catalog.subjects.map((subject) => <option key={subject.id} value={subject.code}>{subject.code} · {subject.name}</option>)}</select></label>
                        <label className="space-y-1"><span className="text-xs font-black uppercase text-gray-500">Tipe soal</span><select className={input} name="question_type" defaultValue="single_choice"><option value="single_choice">single_choice</option><option value="multiple_choice">multiple_choice</option><option value="category">category</option></select></label>
                        <label className="space-y-1 lg:col-span-2"><span className="text-xs font-black uppercase text-gray-500">Pertanyaan</span><textarea className={`${input} min-h-32`} name="stem" required/></label>
                        <label className="space-y-1"><span className="text-xs font-black uppercase text-gray-500">Difficulty</span><select className={input} name="difficulty" defaultValue="medium"><option>easy</option><option>medium</option><option>hard</option></select></label>
                        <label className="space-y-1"><span className="text-xs font-black uppercase text-gray-500">Cognitive level</span><input className={input} name="cognitive_level" placeholder="application / reasoning"/></label>
                        <label className="space-y-1"><span className="text-xs font-black uppercase text-gray-500">Estimasi detik</span><input className={input} type="number" min="1" name="estimated_seconds"/></label>
                        <label className="space-y-1"><span className="text-xs font-black uppercase text-gray-500">Source reference</span><input className={input} name="source_reference"/></label>
                        <label className="space-y-1 lg:col-span-2"><span className="text-xs font-black uppercase text-gray-500">Options — key|content|score|correct|group|groupOrder|imageUrl</span><textarea className={`${input} min-h-40 font-mono text-xs`} name="options" required defaultValue={'A|Pilihan A||true|||\nB|Pilihan B||false|||\nC|Pilihan C||false|||\nD|Pilihan D||false|||'}/></label>
                        <label className="space-y-1 lg:col-span-2"><span className="text-xs font-black uppercase text-gray-500">Pembahasan</span><textarea className={`${input} min-h-32`} name="explanation" placeholder="Markdown/LaTeX didukung oleh renderer."/></label>
                        <label className="space-y-1 lg:col-span-2"><span className="text-xs font-black uppercase text-gray-500">Alasan / catatan perubahan</span><input className={input} name="change_reason" defaultValue="Initial draft from Content Workspace"/></label>
                        <button className={button}><FilePlus2 size={17}/>Simpan draft</button>
                    </form>
                </section>
            )}

            <div className="grid items-start gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
                <aside className="space-y-3 xl:sticky xl:top-20">
                    <div className="flex items-center justify-between"><h2 className="text-xl font-black">Review Queue</h2><span className="text-xs font-bold text-gray-500">{visibleQuestions.length} soal</span></div>
                    <div className="max-h-[75vh] space-y-2 overflow-y-auto pr-1">
                        {visibleQuestions.length === 0 && <div className="border-2 border-dashed border-gray-300 bg-white p-5 text-sm font-bold text-gray-500">Tidak ada soal untuk filter ini.</div>}
                        {visibleQuestions.map((question) => {
                            const id = s(question.id)
                            const active = id === data.selectedId
                            const subject = data.subjectById.get(s(question.subject_id))
                            const pending = question.pending_review
                            return <Link key={id} href={workspaceHref({ ...params, program, track }, { question: id, new: undefined })} className={cn('block border-2 border-gray-900 p-3 shadow-[3px_3px_0_0_#ccc]', active ? 'bg-yellow-100' : 'bg-white hover:bg-gray-50')}>
                                <div className="flex items-start justify-between gap-2"><span className="text-xs font-black text-blue-700">{s(subject?.code)} · v{n(question.version)}</span><span className={cn('border border-gray-900 px-2 py-0.5 text-[10px] font-black uppercase', statusClass(question.status))}>{s(question.status)}</span></div>
                                <div className="mt-2 line-clamp-3 text-sm font-bold leading-snug">{s(question.stem)}</div>
                                <div className="mt-2 flex flex-wrap gap-1 text-[10px] font-bold text-gray-500"><span>{s(question.question_code)}</span>{Boolean(question.current_stage) && <span>· {stageLabel(question.current_stage)}</span>}{Boolean(pending) && <span>· {pending?.reviewer_id ? profileName(data.profileById.get(s(pending.reviewer_id)), 'Assigned') : 'Unassigned'}</span>}</div>
                            </Link>
                        })}
                    </div>
                </aside>

                <main className="min-w-0 space-y-5">
                    {!selected && <div className="border-2 border-dashed border-gray-300 bg-white p-10 text-center"><ClipboardCheck className="mx-auto mb-3"/><h2 className="text-xl font-black">Pilih soal dari queue</h2><p className="mt-1 text-sm font-semibold text-gray-500">Detail, workflow, history, dan tindakan review akan muncul di sini.</p></div>}
                    {Boolean(selected) && selected && (
                        <>
                            <section className="border-2 border-gray-900 bg-white p-5 shadow-[5px_5px_0_0_#111]">
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div><div className="text-xs font-black uppercase text-blue-700">{s(data.subjectById.get(s(selected.subject_id))?.code)} · {s(selected.question_type)} · v{n(selected.version)}</div><h2 className="mt-1 text-2xl font-black">{s(selected.question_code)}</h2><div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-gray-600"><span>Author: {profileName(author)}</span><span>· Reviewer: {profileName(assignedReviewer)}</span><span>· Updated: {fmt(selected.updated_at)}</span></div></div>
                                    <span className={cn('border-2 border-gray-900 px-3 py-1 text-xs font-black uppercase', statusClass(selected.status))}>{s(selected.status)}</span>
                                </div>
                            </section>

                            {canEdit && (
                                <section className="border-2 border-gray-900 bg-orange-50 p-5 shadow-[4px_4px_0_0_#111]">
                                    <div className="mb-4"><div className="text-xs font-black uppercase text-orange-700">Authoring</div><h3 className="text-xl font-black">Edit draft / revisi</h3></div>
                                    <form action={saveContentDraftAction} className="grid gap-4 lg:grid-cols-2">
                                        <HiddenContext program={program} track={track}/><input type="hidden" name="id" value={s(selected.id)}/>
                                        <label className="space-y-1"><span className="text-xs font-black uppercase text-gray-500">Subject</span><select className={input} name="subject_code" required defaultValue={s(data.subjectById.get(s(selected.subject_id))?.code)}>{data.catalog.subjects.map((subject) => <option key={subject.id} value={subject.code}>{subject.code} · {subject.name}</option>)}</select></label>
                                        <label className="space-y-1"><span className="text-xs font-black uppercase text-gray-500">Tipe soal</span><select className={input} name="question_type" defaultValue={s(selected.question_type)}><option value="single_choice">single_choice</option><option value="multiple_choice">multiple_choice</option><option value="category">category</option></select></label>
                                        <label className="space-y-1 lg:col-span-2"><span className="text-xs font-black uppercase text-gray-500">Pertanyaan</span><textarea className={`${input} min-h-36`} name="stem" required defaultValue={s(selected.stem)}/></label>
                                        <label className="space-y-1"><span className="text-xs font-black uppercase text-gray-500">Difficulty</span><select className={input} name="difficulty" defaultValue={s(selected.difficulty)}><option>easy</option><option>medium</option><option>hard</option></select></label>
                                        <label className="space-y-1"><span className="text-xs font-black uppercase text-gray-500">Cognitive level</span><input className={input} name="cognitive_level" defaultValue={s(selected.cognitive_level)}/></label>
                                        <label className="space-y-1"><span className="text-xs font-black uppercase text-gray-500">Estimasi detik</span><input className={input} type="number" min="1" name="estimated_seconds" defaultValue={s(selected.estimated_seconds)}/></label>
                                        <label className="space-y-1"><span className="text-xs font-black uppercase text-gray-500">Source reference</span><input className={input} name="source_reference" defaultValue={s(selected.source_reference)}/></label>
                                        <label className="space-y-1"><span className="text-xs font-black uppercase text-gray-500">Stimulus</span><select className={input} name="stimulus_id" defaultValue={s(selected.stimulus_id)}><option value="">Tanpa stimulus</option>{data.stimulusCandidates.map((stimulus) => <option key={s(stimulus.id)} value={s(stimulus.id)}>{s(stimulus.stimulus_code)} · {s(stimulus.title) || s(stimulus.content).slice(0, 60)}</option>)}</select></label>
                                        <label className="space-y-1"><span className="text-xs font-black uppercase text-gray-500">Primary knowledge node</span><select className={input} name="knowledge_node_id" defaultValue={primaryNode ? s(primaryNode.knowledge_node_id) : ''}><option value="">Belum dipetakan</option>{data.subjectKnowledgeNodes.map((node) => <option key={s(node.id)} value={s(node.id)}>{'—'.repeat(Math.min(n(node.depth), 4))} {s(node.name)}</option>)}</select></label>
                                        <label className="space-y-1 lg:col-span-2"><span className="text-xs font-black uppercase text-gray-500">Options — key|content|score|correct|group|groupOrder|imageUrl</span><textarea className={`${input} min-h-48 font-mono text-xs`} name="options" required defaultValue={optionsText(data.options)}/></label>
                                        <label className="space-y-1 lg:col-span-2"><span className="text-xs font-black uppercase text-gray-500">Pembahasan</span><textarea className={`${input} min-h-36`} name="explanation" defaultValue={s(data.explanation?.content)}/></label>
                                        <label className="space-y-1 lg:col-span-2"><span className="text-xs font-black uppercase text-gray-500">Alasan perubahan</span><input className={input} name="change_reason" defaultValue="Content workspace update"/></label>
                                        <button className={button}>Simpan perubahan</button>
                                    </form>
                                </section>
                            )}

                            <section className="border-2 border-gray-900 bg-white p-5 shadow-[4px_4px_0_0_#111]">
                                <div className="mb-4 flex items-center justify-between gap-3"><h3 className="text-xl font-black">Preview Soal</h3><span className="text-xs font-bold text-gray-500">Read-only review surface</span></div>
                                {Boolean(data.stimulus) && data.stimulus && <div className="mb-5 border-2 border-gray-900 bg-yellow-50 p-4">{Boolean(data.stimulus.title) && <h4 className="mb-2 font-black">{s(data.stimulus.title)}</h4>}<div className="whitespace-pre-wrap font-semibold leading-relaxed"><MathRenderer text={s(data.stimulus.content)}/></div>{Boolean(data.stimulus.source_reference) && <div className="mt-2 text-xs font-bold text-gray-500">Sumber: {s(data.stimulus.source_reference)}</div>}</div>}
                                <div className="whitespace-pre-wrap text-lg font-bold leading-relaxed"><MathRenderer text={s(selected.stem)}/></div>
                                <div className="mt-5 space-y-2">{data.options.map((option) => <OptionPreview key={s(option.id)} option={option}/>)}</div>
                                <div className="mt-5 border-t-2 border-dashed border-gray-300 pt-4"><div className="text-xs font-black uppercase text-gray-500">Pembahasan</div><div className="mt-2 whitespace-pre-wrap font-semibold text-gray-700">{data.explanation?.content ? <MathRenderer text={s(data.explanation.content)}/> : <span className="text-orange-700">Pembahasan belum tersedia.</span>}</div></div>
                                <div className="mt-4 border-t-2 border-dashed border-gray-300 pt-4"><div className="text-xs font-black uppercase text-gray-500">Knowledge Mapping</div><div className="mt-2 flex flex-wrap gap-2">{data.knowledgeNodes.length ? data.knowledgeNodes.map((node) => <span key={s(node.id)} className="border-2 border-gray-900 bg-cyan-50 px-2 py-1 text-xs font-bold">{s(node.name)}</span>) : <span className="text-sm font-bold text-orange-700">Belum dipetakan.</span>}</div></div>
                            </section>

                            <section className="grid gap-5 lg:grid-cols-2">
                                <div className="space-y-4 border-2 border-gray-900 bg-blue-50 p-5 shadow-[4px_4px_0_0_#111]">
                                    <div><div className="text-xs font-black uppercase text-blue-700">Current Stage</div><h3 className="text-xl font-black">{stageLabel(selected.current_stage)}</h3></div>
                                    {canSubmit && <form action={submitContentQuestionAction}><HiddenContext program={program} track={track}/><input type="hidden" name="question_id" value={s(selected.id)}/><button className={button}><Send size={16}/>Kirim ke Editorial Review</button></form>}
                                    {canAssign && <form action={assignContentReviewerAction} className="space-y-2"><HiddenContext program={program} track={track}/><input type="hidden" name="question_id" value={s(selected.id)}/><label className="block text-xs font-black uppercase text-gray-500">Assign reviewer</label><div className="flex gap-2"><select className={input} name="reviewer_id" required defaultValue={s(pendingReview?.reviewer_id)}><option value="">Pilih reviewer</option>{data.reviewers.filter((reviewer) => s(reviewer.id) !== s(selected.author_id)).map((reviewer) => <option key={reviewer.id} value={reviewer.id}>{reviewer.full_name}</option>)}</select><button className={button}><UserCheck size={16}/>Assign</button></div></form>}
                                    {Boolean(selected.current_stage) && !pendingReview && <p className="text-sm font-bold text-orange-800">Stage aktif tidak memiliki pending review. Periksa workflow history.</p>}
                                    {canReview && <form action={decideContentReviewAction} className="space-y-3"><HiddenContext program={program} track={track}/><input type="hidden" name="question_id" value={s(selected.id)}/><label className="block space-y-1"><span className="text-xs font-black uppercase text-gray-500">Reviewer notes</span><textarea className={`${input} min-h-28`} name="notes" placeholder="Catatan editorial/akademik/technical QA..."/></label><div className="grid gap-2 sm:grid-cols-3"><button className="inline-flex items-center justify-center gap-2 border-2 border-gray-900 bg-green-200 px-3 py-2 text-sm font-black" name="decision" value="approve"><CheckCircle2 size={16}/>Approve</button><button className="inline-flex items-center justify-center gap-2 border-2 border-gray-900 bg-orange-200 px-3 py-2 text-sm font-black" name="decision" value="revision_required"><Clock3 size={16}/>Revision</button><button className="inline-flex items-center justify-center gap-2 border-2 border-gray-900 bg-red-200 px-3 py-2 text-sm font-black" name="decision" value="reject"><XCircle size={16}/>Reject</button></div></form>}
                                    {Boolean(selected.current_stage) && !canReview && Boolean(selected.reviewer_id) && <p className="text-sm font-semibold text-gray-600">Stage ini ditugaskan ke <b>{profileName(assignedReviewer)}</b>. Hanya reviewer tersebut yang dapat memberikan keputusan.</p>}
                                    {currentActorIsAuthor && Boolean(selected.current_stage) && <div className="border-2 border-red-700 bg-red-50 p-3 text-sm font-black text-red-800">Self-review diblok. Author tidak dapat mereview soal sendiri.</div>}
                                    {canPublish && <form action={publishContentQuestionAction}><HiddenContext program={program} track={track}/><input type="hidden" name="question_id" value={s(selected.id)}/><button className={button}><ShieldCheck size={16}/>Publish Question</button></form>}
                                </div>

                                <div className="border-2 border-gray-900 bg-white p-5 shadow-[4px_4px_0_0_#111]">
                                    <h3 className="mb-3 flex items-center gap-2 text-xl font-black"><History size={19}/> Review Rounds</h3>
                                    <div className="space-y-3">{data.currentReviews.length === 0 && <p className="text-sm font-bold text-gray-500">Belum ada review round.</p>}{data.currentReviews.map((review) => <div key={s(review.id)} className="border-2 border-gray-300 bg-gray-50 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><b className="text-sm">Round {n(review.review_round)} · {stageLabel(review.review_stage)}</b><span className={cn('border border-gray-900 px-2 py-0.5 text-[10px] font-black uppercase', statusClass(review.status))}>{s(review.status)}</span></div><div className="mt-1 text-xs font-semibold text-gray-500">Reviewer: {profileName(data.profileById.get(s(review.reviewer_id)))} · Version {s(review.question_version) || '—'} · {fmt(review.completed_at || review.updated_at)}</div>{Boolean(review.notes) && <div className="mt-2 border-l-4 border-gray-900 bg-white p-2 text-sm font-semibold">{s(review.notes)}</div>}</div>)}</div>
                                </div>
                            </section>

                            <section className="grid gap-5 lg:grid-cols-2">
                                <div className="border-2 border-gray-900 bg-white p-5 shadow-[4px_4px_0_0_#111]">
                                    <h3 className="mb-3 text-xl font-black">Question Version History</h3>
                                    <div className="max-h-96 space-y-2 overflow-y-auto">{data.versions.length === 0 && <p className="text-sm font-bold text-gray-500">Snapshot version belum tersedia. Snapshot otomatis dibuat saat submission/update yang terversi.</p>}{data.versions.map((version) => <details key={s(version.id)} className="border-2 border-gray-300 bg-gray-50 p-3"><summary className="cursor-pointer text-sm font-black">v{n(version.version)} · {fmt(version.created_at)} · {s(version.change_reason) || 'No reason'}</summary><pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words bg-white p-3 text-[11px]">{JSON.stringify(version.snapshot, null, 2)}</pre></details>)}</div>
                                </div>
                                <div className="border-2 border-gray-900 bg-white p-5 shadow-[4px_4px_0_0_#111]">
                                    <h3 className="mb-3 text-xl font-black">Audit Trail</h3>
                                    <div className="max-h-96 space-y-2 overflow-y-auto">{data.auditLogs.length === 0 && <p className="text-sm font-bold text-gray-500">Belum ada audit action untuk soal ini.</p>}{data.auditLogs.map((log) => <div key={s(log.id)} className="border-l-4 border-violet-700 bg-violet-50 p-3"><div className="text-sm font-black">{s(log.action)}</div><div className="mt-1 text-xs font-semibold text-gray-500">{fmt(log.created_at)} · actor {s(log.actor_user_id).slice(0, 8) || 'system'}</div></div>)}</div>
                                </div>
                            </section>
                        </>
                    )}
                </main>
            </div>
        </div>
    )
}
