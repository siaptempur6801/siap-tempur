import Link from 'next/link'
import { Archive, CalendarDays, FileQuestion, Package, Save, Settings2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getServerNowMs } from '@/lib/server/time'
import { adminV2Service } from '@/src/services/admin-v2.service'
import { authorizationService } from '@/src/services/authorization.service'
import { PERMISSIONS } from '@/src/auth/permissions'
import {
    archiveEventAction,
    archiveExamAction,
    archiveProductAction,
    archiveQuestionAction,
    linkEventProductAction,
    saveEventAction,
    saveEventSessionAction,
    saveExamAction,
    saveExamSectionAction,
    saveProductAction,
    saveQuestionAction,
} from '@/app/actions/admin-v2'
import {
    AdminBadge,
    AdminCard,
    AdminEmptyState,
    AdminMetric,
    AdminPageHeader,
    AdminSectionHeading,
    adminDangerButtonClass,
    adminInputClass,
    adminPrimaryButtonClass,
    adminSecondaryButtonClass,
} from '@/components/admin/AdminUi'

export type AdminOperationsMode = 'products' | 'events' | 'exams' | 'questions' | 'commerce'

type ViewRow = Record<string, unknown>

type WorkspaceView = {
    catalog: {
        program: { id: string; code: string; name: string }
        track: { id: string; code: string; name: string }
        subjects: Array<{ id: string; code: string; name: string }>
        examTypes: Array<{ id: string; code: string; name: string }>
    }
    products: ViewRow[]
    productPrices: ViewRow[]
    productWalletGrants: ViewRow[]
    events: ViewRow[]
    eventSessions: ViewRow[]
    exams: ViewRow[]
    examSections: ViewRow[]
    questions: ViewRow[]
    questionOptions: ViewRow[]
    orders: ViewRow[]
    payments: ViewRow[]
}

type SearchParams = {
    ok?: string
    error?: string
    edit?: string
    program?: string
    track?: string
}

const ROUTES: Record<AdminOperationsMode, string> = {
    products: '/admin/commerce/products',
    events: '/admin/assessment/events',
    exams: '/admin/assessment/exams',
    questions: '/admin/content/questions',
    commerce: '/admin/commerce',
}

const PAGE_COPY: Record<AdminOperationsMode, { title: string; description: string }> = {
    products: { title: 'Products', description: 'Kelola paket, harga, durasi, dan grant untuk context aktif.' },
    events: { title: 'Events', description: 'Kelola event, sesi pelaksanaan, dan produk tiket untuk context aktif.' },
    exams: { title: 'Exams', description: 'Kelola konfigurasi exam dan section untuk context aktif.' },
    questions: { title: 'Question Bank', description: 'Kelola soal operasional, opsi jawaban, versi, dan status publikasi.' },
    commerce: { title: 'Orders & Payments', description: 'Monitor order dan payment terbaru. Data commerce masih global lintas program.' },
}

function s(value: unknown) { return typeof value === 'string' ? value : value == null ? '' : String(value) }
function n(value: unknown) { const parsed = Number(value ?? 0); return Number.isFinite(parsed) ? parsed : 0 }
function nullable(value: unknown) { const valueString = s(value); return valueString || null }
function lower(value: unknown) { return s(value).toLowerCase() }
function localDateTime(value: unknown) {
    const source = s(value)
    if (!source) return ''
    const date = new Date(source)
    if (Number.isNaN(date.getTime())) return ''
    return new Date(date.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 16)
}
function displayDate(value: unknown) {
    const source = s(value)
    if (!source) return '—'
    const date = new Date(source)
    if (Number.isNaN(date.getTime())) return source
    return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(date)
}
function rupiah(value: unknown) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n(value))
}
function workspaceHref(mode: AdminOperationsMode, program: string, track: string, edit?: string) {
    const query = new URLSearchParams({ program, track })
    if (edit) query.set('edit', edit)
    return `${ROUTES[mode]}?${query.toString()}`
}
function statusVariant(value: unknown): 'neutral' | 'blue' | 'green' | 'yellow' | 'orange' | 'red' | 'violet' {
    switch (lower(value)) {
        case 'active':
        case 'paid':
        case 'published':
        case 'live': return 'green'
        case 'draft':
        case 'pending':
        case 'scheduled': return 'yellow'
        case 'archived':
        case 'closed': return 'neutral'
        case 'failed':
        case 'cancelled':
        case 'expired': return 'red'
        default: return 'blue'
    }
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
    return <label className={cn('space-y-1.5', className)}><span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400">{label}</span>{children}</label>
}

function ContextFields({ program, track }: { program: string; track: string }) {
    return <><input type="hidden" name="program_code" value={program}/><input type="hidden" name="track_code" value={track}/></>
}

function Feedback({ ok, error }: { ok?: string; error?: string }) {
    if (!ok && !error) return null
    return <div role="status" className={cn('rounded-xl border px-4 py-3 text-sm font-bold shadow-sm', error ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800')}>{error || ok}</div>
}

function PermissionEmpty({ permission }: { permission: string }) {
    return <AdminCard><AdminEmptyState title="Akses tidak tersedia" description={`Akun ini tidak memiliki permission ${permission}.`}/></AdminCard>
}

export default async function AdminOperationsWorkspace({ mode, searchParams }: { mode: AdminOperationsMode; searchParams: Promise<SearchParams> }) {
    const params = await searchParams
    const requestedContext = {
        programCode: (params.program || 'TKA').toUpperCase(),
        trackCode: (params.track || 'SMP').toUpperCase(),
    }
    const data = await adminV2Service.getWorkspaceData(requestedContext) as unknown as WorkspaceView
    const authorization = await authorizationService.getCurrentAuthorization()
    const permissions = new Set(authorization?.permissions ?? [])
    const program = data.catalog.program.code
    const track = data.catalog.track.code
    const nowMs = getServerNowMs()

    const canProducts = permissions.has(PERMISSIONS.PRODUCT_MANAGE)
    const canEvents = permissions.has(PERMISSIONS.EVENT_MANAGE)
    const canExams = permissions.has(PERMISSIONS.EXAM_MANAGE)
    const canQuestions = permissions.has(PERMISSIONS.QUESTION_MANAGE)
    const canCommerce = permissions.has(PERMISSIONS.ORDER_READ) || permissions.has(PERMISSIONS.PAYMENT_MANAGE)

    const priceByProduct = new Map<string, ViewRow>()
    for (const row of data.productPrices) {
        if (lower(row.status) !== 'active') continue
        const endsAt = nullable(row.ends_at)
        if (endsAt && new Date(endsAt).getTime() < nowMs) continue
        const id = s(row.product_id)
        if (!priceByProduct.has(id)) priceByProduct.set(id, row)
    }
    const grantByProduct = new Map(data.productWalletGrants.map((row) => [s(row.product_id), n(row.amount)]))
    const subjectById = new Map(data.catalog.subjects.map((row) => [row.id, row]))
    const examTypeById = new Map(data.catalog.examTypes.map((row) => [row.id, row]))
    const sessionsFor = (eventId: string) => data.eventSessions.filter((row) => s(row.event_id) === eventId)
    const sectionsFor = (examId: string) => data.examSections.filter((row) => s(row.exam_id) === examId)
    const optionsFor = (questionId: string) => data.questionOptions.filter((row) => s(row.question_id) === questionId)

    const editedProduct = data.products.find((row) => s(row.id) === params.edit)
    const editedEvent = data.events.find((row) => s(row.id) === params.edit)
    const editedExam = data.exams.find((row) => s(row.id) === params.edit)
    const editedQuestion = data.questions.find((row) => s(row.id) === params.edit)
    const editedProductPrice = editedProduct ? priceByProduct.get(s(editedProduct.id)) : undefined

    return (
        <div className="space-y-6 pb-10">
            <AdminPageHeader
                title={PAGE_COPY[mode].title}
                description={`${PAGE_COPY[mode].description} Context aktif: ${data.catalog.program.name} / ${data.catalog.track.name}.`}
            />
            <Feedback ok={params.ok} error={params.error}/>

            {mode === 'products' && (canProducts ? <section className="space-y-5">
                <AdminCard className="p-5 sm:p-6">
                    <AdminSectionHeading
                        title={editedProduct ? 'Edit product' : 'Tambah product'}
                        description={editedProduct ? 'Nilai terakhir dari database dimuat ke form. Context tidak dapat dipindah saat edit.' : 'Buat product baru untuk context aktif.'}
                        action={editedProduct ? <Link className={adminSecondaryButtonClass} href={workspaceHref('products', program, track)}>Batal edit</Link> : undefined}
                    />
                    <form key={editedProduct ? `product-${s(editedProduct.id)}-${s(editedProduct.updated_at)}` : `product-new-${program}-${track}`} action={saveProductAction} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <ContextFields program={program} track={track}/>{editedProduct && <input type="hidden" name="id" value={s(editedProduct.id)}/>} 
                        <Field label="Kode"><input className={adminInputClass} name="code" required defaultValue={s(editedProduct?.code)} placeholder={`${program}_${track}_PRODUCT`}/></Field>
                        <Field label="Nama"><input className={adminInputClass} name="name" required defaultValue={s(editedProduct?.name)}/></Field>
                        <Field label="Jenis"><select className={adminInputClass} name="product_type" defaultValue={s(editedProduct?.product_type) || 'PASS'}><option>TOKEN_PACK</option><option>PASS</option><option>EVENT_TICKET</option></select></Field>
                        <Field label="Status"><select className={adminInputClass} name="status" defaultValue={s(editedProduct?.status) || 'draft'}><option value="draft">Draft</option><option value="active">Active</option><option value="archived">Archived</option></select></Field>
                        <Field label="Harga"><input className={adminInputClass} name="price" type="number" min="0" defaultValue={editedProductPrice ? s(editedProductPrice.amount) : ''}/></Field>
                        <input type="hidden" name="current_price" value={editedProductPrice ? s(editedProductPrice.amount) : ''}/>
                        <Field label="Token grant"><input className={adminInputClass} name="token_grant" type="number" min="0" defaultValue={editedProduct ? grantByProduct.get(s(editedProduct.id)) ?? 0 : ''}/></Field>
                        <Field label="Durasi hari"><input className={adminInputClass} name="duration_days" type="number" min="1" defaultValue={s(editedProduct?.duration_days)}/></Field>
                        <Field label="Deskripsi"><input className={adminInputClass} name="description" defaultValue={s(editedProduct?.description)}/></Field>
                        <input type="hidden" name="currency" value="IDR"/>
                        <div className="md:col-span-2 xl:col-span-4 flex justify-end"><button className={adminPrimaryButtonClass}><Save size={16}/>{editedProduct ? 'Simpan perubahan' : 'Simpan product'}</button></div>
                    </form>
                </AdminCard>

                <AdminCard className="overflow-hidden">
                    <div className="border-b border-slate-200 p-5"><AdminSectionHeading title="Product catalog" description={`${data.products.length} product pada context aktif.`}/></div>
                    {data.products.length ? <div className="divide-y divide-slate-100">{data.products.map((row) => {
                        const id = s(row.id); const price = priceByProduct.get(id)
                        return <div key={id} className="flex flex-col gap-4 p-5 transition hover:bg-slate-50/70 lg:flex-row lg:items-center lg:justify-between">
                            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-extrabold text-slate-900">{s(row.name)}</span><AdminBadge variant={statusVariant(row.status)}>{s(row.status)}</AdminBadge></div><div className="mt-1 text-xs font-semibold text-slate-500">{s(row.code)} · {s(row.product_type)} · {price ? rupiah(price.amount) : 'Tanpa harga'} · grant {grantByProduct.get(id) ?? 0}</div></div>
                            <div className="flex shrink-0 flex-wrap gap-2"><Link className={adminSecondaryButtonClass} href={workspaceHref('products', program, track, id)}>Edit</Link><form action={archiveProductAction}><ContextFields program={program} track={track}/><input type="hidden" name="id" value={id}/><button className={adminDangerButtonClass}><Archive size={14}/>Archive</button></form></div>
                        </div>
                    })}</div> : <AdminEmptyState title="Belum ada product" description="Tambahkan product pertama untuk context aktif."/>}
                </AdminCard>
            </section> : <PermissionEmpty permission="product.manage"/>)}

            {mode === 'events' && (canEvents ? <section className="space-y-5">
                <AdminCard className="p-5 sm:p-6">
                    <AdminSectionHeading title={editedEvent ? 'Edit event' : 'Buat event'} description="Jadwal registrasi dan pelaksanaan menggunakan waktu lokal WIB." action={editedEvent ? <Link className={adminSecondaryButtonClass} href={workspaceHref('events', program, track)}>Batal edit</Link> : undefined}/>
                    <form key={editedEvent ? `event-${s(editedEvent.id)}-${s(editedEvent.status)}-${s(editedEvent.starts_at)}` : `event-new-${program}-${track}`} action={saveEventAction} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <ContextFields program={program} track={track}/>{editedEvent && <input type="hidden" name="id" value={s(editedEvent.id)}/>} 
                        <Field label="Kode"><input className={adminInputClass} name="code" required defaultValue={s(editedEvent?.code)}/></Field><Field label="Judul"><input className={adminInputClass} name="title" required defaultValue={s(editedEvent?.title)}/></Field><Field label="Slug"><input className={adminInputClass} name="slug" defaultValue={s(editedEvent?.slug)}/></Field><Field label="Status"><select className={adminInputClass} name="status" defaultValue={s(editedEvent?.status)||'draft'}><option>draft</option><option>scheduled</option><option>live</option><option>closed</option><option>archived</option></select></Field>
                        <Field label="Registrasi mulai"><input className={adminInputClass} type="datetime-local" name="registration_start" defaultValue={localDateTime(editedEvent?.registration_start)}/></Field><Field label="Registrasi selesai"><input className={adminInputClass} type="datetime-local" name="registration_end" defaultValue={localDateTime(editedEvent?.registration_end)}/></Field><Field label="Mulai"><input className={adminInputClass} required type="datetime-local" name="starts_at" defaultValue={localDateTime(editedEvent?.starts_at)}/></Field><Field label="Selesai"><input className={adminInputClass} required type="datetime-local" name="ends_at" defaultValue={localDateTime(editedEvent?.ends_at)}/></Field>
                        <Field label="Deskripsi" className="md:col-span-2 xl:col-span-3"><input className={adminInputClass} name="description" defaultValue={s(editedEvent?.description)}/></Field><div className="flex items-end justify-end"><button className={adminPrimaryButtonClass}><Save size={16}/>{editedEvent?'Simpan perubahan':'Simpan event'}</button></div>
                    </form>
                </AdminCard>
                {data.events.length ? <div className="space-y-3">{data.events.map((row) => { const id=s(row.id); const sessions=sessionsFor(id); return <AdminCard key={id} className="p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><span className="font-extrabold text-slate-900">{s(row.title)}</span><AdminBadge variant={statusVariant(row.status)}>{s(row.status)}</AdminBadge></div><p className="mt-1 text-xs font-semibold text-slate-500">{s(row.code)} · {sessions.length} sesi · {displayDate(row.starts_at)} → {displayDate(row.ends_at)}</p></div><div className="flex flex-wrap gap-2"><Link className={adminSecondaryButtonClass} href={workspaceHref('events', program, track, id)}>Edit</Link><form action={archiveEventAction}><ContextFields program={program} track={track}/><input type="hidden" name="id" value={id}/><button className={adminDangerButtonClass}><Archive size={14}/>Archive</button></form></div></div><details className="group mt-4 border-t border-slate-200 pt-4"><summary className="cursor-pointer text-sm font-extrabold text-blue-600">Kelola sesi & tiket</summary><form action={saveEventSessionAction} className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3"><ContextFields program={program} track={track}/><input type="hidden" name="event_id" value={id}/><Field label="Nama sesi"><input className={adminInputClass} name="name" required/></Field><Field label="Exam EVENT"><select className={adminInputClass} name="exam_id">{data.exams.filter((exam)=>examTypeById.get(s(exam.exam_type_id))?.code==='EVENT').map((exam)=><option key={s(exam.id)} value={s(exam.id)}>{s(exam.title)}</option>)}</select></Field><Field label="Mulai"><input className={adminInputClass} type="datetime-local" name="starts_at" defaultValue={localDateTime(row.starts_at)}/></Field><Field label="Selesai"><input className={adminInputClass} type="datetime-local" name="ends_at" defaultValue={localDateTime(row.ends_at)}/></Field><Field label="Kapasitas"><input className={adminInputClass} type="number" min="1" name="capacity"/></Field><Field label="Status"><select className={adminInputClass} name="status"><option>scheduled</option><option>live</option><option>closed</option></select></Field><div className="md:col-span-2 xl:col-span-3"><button className={adminPrimaryButtonClass}>Tambah sesi</button></div></form>{sessions.length>0 && <form action={linkEventProductAction} className="mt-5 grid gap-3 border-t border-slate-100 pt-5 md:grid-cols-3"><ContextFields program={program} track={track}/><input type="hidden" name="event_id" value={id}/><Field label="Sesi"><select className={adminInputClass} name="session_id">{sessions.map((session)=><option key={s(session.id)} value={s(session.id)}>{s(session.name)}</option>)}</select></Field><Field label="Produk tiket"><select className={adminInputClass} name="product_id">{data.products.filter((product)=>s(product.product_type)==='EVENT_TICKET').map((product)=><option key={s(product.id)} value={s(product.id)}>{s(product.code)} · {s(product.name)}</option>)}</select></Field><input type="hidden" name="status" value="active"/><div className="flex items-end"><button className={adminSecondaryButtonClass}>Hubungkan tiket</button></div></form>}</details></AdminCard>})}</div> : <AdminCard><AdminEmptyState title="Belum ada event" description="Buat event pertama untuk context aktif."/></AdminCard>}
            </section> : <PermissionEmpty permission="event.manage"/>)}

            {mode === 'exams' && (canExams ? <section className="space-y-5">
                <AdminCard className="p-5 sm:p-6"><AdminSectionHeading title={editedExam ? 'Edit exam' : 'Buat exam'} description="Konfigurasi akses, attempt, durasi, dan urutan soal." action={editedExam ? <Link className={adminSecondaryButtonClass} href={workspaceHref('exams', program, track)}>Batal edit</Link> : undefined}/><form key={editedExam ? `exam-${s(editedExam.id)}-${s(editedExam.updated_at)}` : `exam-new-${program}-${track}`} action={saveExamAction} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4"><ContextFields program={program} track={track}/>{editedExam&&<input type="hidden" name="id" value={s(editedExam.id)}/>}<Field label="Tipe"><select className={adminInputClass} name="exam_type_code" defaultValue={examTypeById.get(s(editedExam?.exam_type_id))?.code}>{data.catalog.examTypes.map((type)=><option key={type.id} value={type.code}>{type.code}</option>)}</select></Field><Field label="Judul"><input className={adminInputClass} name="title" required defaultValue={s(editedExam?.title)}/></Field><Field label="Slug"><input className={adminInputClass} name="slug" defaultValue={s(editedExam?.slug)}/></Field><Field label="Status"><select className={adminInputClass} name="status" defaultValue={s(editedExam?.status)||'draft'}><option>draft</option><option>active</option><option>scheduled</option><option>archived</option></select></Field><Field label="Durasi detik"><input className={adminInputClass} name="duration_seconds" type="number" min="1" defaultValue={s(editedExam?.duration_seconds)}/></Field><Field label="Attempt limit"><input className={adminInputClass} name="attempt_limit" type="number" min="1" defaultValue={s(editedExam?.attempt_limit)}/></Field><Field label="Token cost"><input className={adminInputClass} name="token_cost" type="number" min="0" defaultValue={s(editedExam?.token_cost)||'0'}/></Field><Field label="Order"><select className={adminInputClass} name="question_order" defaultValue={s(editedExam?.question_order)||'random'}><option>random</option><option>fixed</option></select></Field><input type="hidden" name="result_visibility" value={s(editedExam?.result_visibility)||'instant'}/><input type="hidden" name="access_type" value={s(editedExam?.access_type)||'FREE'}/><div className="md:col-span-2 xl:col-span-4 flex justify-end"><button className={adminPrimaryButtonClass}><Save size={16}/>{editedExam?'Simpan perubahan':'Simpan exam'}</button></div></form></AdminCard>
                {data.exams.length ? <div className="space-y-3">{data.exams.map((row)=>{const id=s(row.id);const sections=sectionsFor(id);return <AdminCard key={id} className="p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><span className="font-extrabold text-slate-900">{s(row.title)}</span><AdminBadge variant="blue">{examTypeById.get(s(row.exam_type_id))?.code??'?'}</AdminBadge><AdminBadge variant={statusVariant(row.status)}>{s(row.status)}</AdminBadge></div><p className="mt-1 text-xs font-semibold text-slate-500">{sections.length} section · token {s(row.token_cost)}</p></div><div className="flex flex-wrap gap-2"><Link className={adminSecondaryButtonClass} href={workspaceHref('exams', program, track, id)}>Edit</Link><form action={archiveExamAction}><ContextFields program={program} track={track}/><input type="hidden" name="id" value={id}/><button className={adminDangerButtonClass}><Archive size={14}/>Archive</button></form></div></div><details className="mt-4 border-t border-slate-200 pt-4"><summary className="cursor-pointer text-sm font-extrabold text-blue-600">Kelola section</summary><form action={saveExamSectionAction} className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3"><ContextFields program={program} track={track}/><input type="hidden" name="exam_id" value={id}/><Field label="Mapel / Subtes"><select className={adminInputClass} name="subject_code"><option value="">Tanpa mapel</option>{data.catalog.subjects.map((subject)=><option key={subject.id} value={subject.code}>{subject.code} · {subject.name}</option>)}</select></Field><Field label="Judul"><input className={adminInputClass} name="title" required/></Field><Field label="Urutan"><input className={adminInputClass} name="sort_order" type="number" defaultValue={sections.length+1}/></Field><Field label="Jumlah soal"><input className={adminInputClass} name="question_count" type="number" min="1"/></Field><Field label="Passing score"><input className={adminInputClass} name="passing_score" type="number" min="0"/></Field><div className="flex items-end"><button className={adminPrimaryButtonClass}>Tambah section</button></div></form>{sections.length ? <div className="mt-4 flex flex-wrap gap-2">{sections.map((section)=><AdminBadge key={s(section.id)}>{subjectById.get(s(section.subject_id))?.code??'-'} · {s(section.question_count)} soal</AdminBadge>)}</div> : null}</details></AdminCard>})}</div> : <AdminCard><AdminEmptyState title="Belum ada exam" description="Buat exam pertama untuk context aktif."/></AdminCard>}
            </section> : <PermissionEmpty permission="exam.manage"/>)}

            {mode === 'questions' && (canQuestions ? <section className="space-y-5">
                <AdminCard className="p-5 sm:p-6"><AdminSectionHeading title={editedQuestion ? 'Edit soal' : 'Tambah soal'} description="Gunakan format opsi A|Teks|score|true/false. Untuk category tambahkan group dan groupOrder." action={editedQuestion ? <Link className={adminSecondaryButtonClass} href={workspaceHref('questions', program, track)}>Batal edit</Link> : undefined}/><form key={editedQuestion ? `question-${s(editedQuestion.id)}-${s(editedQuestion.updated_at)}-${s(editedQuestion.version)}` : `question-new-${program}-${track}`} action={saveQuestionAction} className="mt-5 grid gap-4 lg:grid-cols-2"><ContextFields program={program} track={track}/>{editedQuestion&&<input type="hidden" name="id" value={s(editedQuestion.id)}/>}<Field label="Mapel / Subtes"><select className={adminInputClass} name="subject_code" defaultValue={subjectById.get(s(editedQuestion?.subject_id))?.code}>{data.catalog.subjects.map((subject)=><option key={subject.id} value={subject.code}>{subject.code} · {subject.name}</option>)}</select></Field><Field label="Tipe respons"><select className={adminInputClass} name="question_type" defaultValue={s(editedQuestion?.question_type)||'single_choice'}><option value="single_choice">single_choice</option><option value="multiple_choice">multiple_choice</option><option value="category">category</option></select></Field><Field label="Difficulty"><select className={adminInputClass} name="difficulty" defaultValue={s(editedQuestion?.difficulty)||'medium'}><option>easy</option><option>medium</option><option>hard</option></select></Field><Field label="Status"><select className={adminInputClass} name="status" defaultValue={s(editedQuestion?.status)||'draft'}><option>draft</option><option>published</option><option>archived</option></select></Field><Field label="Source reference"><input className={adminInputClass} name="source_reference" defaultValue={s(editedQuestion?.source_reference)} placeholder="Sumber soal / referensi internal"/></Field><Field label="Alasan perubahan"><input className={adminInputClass} name="change_reason" placeholder="Contoh: koreksi typo atau kunci"/></Field><Field label="Pertanyaan"><textarea className={cn(adminInputClass, 'min-h-36 resize-y')} name="stem" required rows={5} defaultValue={s(editedQuestion?.stem)}/></Field><Field label="Opsi"><textarea className={cn(adminInputClass, 'min-h-44 resize-y font-mono text-xs')} name="options" required={!editedQuestion} rows={7} defaultValue={editedQuestion?optionsFor(s(editedQuestion.id)).map((option)=>{const base=`${s(option.option_key)}|${s(option.content)}|${s(option.score)}|${s(option.is_correct)}`;return nullable(option.response_group)?`${base}|${s(option.response_group)}|${s(option.response_group_order)}`:base}).join('\n'):''} placeholder={'A|Pilihan A|1|true\nB|Pilihan B|0|false'}/></Field><div className="lg:col-span-2 flex justify-end"><button className={adminPrimaryButtonClass}><Save size={16}/>{editedQuestion?'Simpan perubahan':'Tambah soal'}</button></div></form></AdminCard>
                <AdminCard className="overflow-hidden"><div className="border-b border-slate-200 p-5"><AdminSectionHeading title="Daftar soal" description={`${data.questions.length} soal pada context aktif.`}/></div>{data.questions.length ? <div className="divide-y divide-slate-100">{data.questions.map((row)=>{const id=s(row.id);return <div key={id} className="flex flex-col gap-4 p-5 transition hover:bg-slate-50/70 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-extrabold text-slate-900">{s(row.question_code) || 'Tanpa kode'}</span><AdminBadge variant="blue">{subjectById.get(s(row.subject_id))?.code??'?'}</AdminBadge><AdminBadge>{s(row.question_type)}</AdminBadge><AdminBadge variant={statusVariant(row.status)}>{s(row.status)}</AdminBadge><span className="text-xs font-bold text-slate-400">v{s(row.version)}</span></div><p className="mt-2 line-clamp-2 max-w-4xl text-sm font-medium leading-6 text-slate-600">{s(row.stem)}</p></div><div className="flex shrink-0 flex-wrap gap-2"><Link className={adminSecondaryButtonClass} href={workspaceHref('questions', program, track, id)}>Edit</Link><form action={archiveQuestionAction}><ContextFields program={program} track={track}/><input type="hidden" name="id" value={id}/><button className={adminDangerButtonClass}><Archive size={14}/>Archive</button></form></div></div>})}</div> : <AdminEmptyState title="Belum ada soal" description="Tambahkan soal pertama untuk context aktif."/>}</AdminCard>
            </section> : <PermissionEmpty permission="question.manage"/>)}

            {mode === 'commerce' && (canCommerce ? <section className="space-y-5">
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">Commerce monitor masih global lintas program. Filter per Program/Track belum diterapkan karena ownership berada pada order_items.</div>
                <section className="grid gap-3 sm:grid-cols-3"><AdminMetric label="Order terbaru" value={data.orders.length} helper="Snapshot workspace" icon={<Package size={18}/>} tone="blue"/><AdminMetric label="Payment terbaru" value={data.payments.length} helper="Snapshot workspace" icon={<CalendarDays size={18}/>} tone="violet"/><AdminMetric label="Paid" value={data.orders.filter((row)=>lower(row.status)==='paid').length} helper="Order berstatus paid" icon={<FileQuestion size={18}/>} tone="green"/></section>
                <AdminCard className="overflow-hidden"><div className="border-b border-slate-200 p-5"><AdminSectionHeading title="Orders" description="Order terbaru dan status pembayarannya."/></div>{data.orders.length ? <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-slate-50 text-[11px] font-extrabold uppercase tracking-wide text-slate-400"><tr><th className="px-5 py-3">Order</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">User</th><th className="px-5 py-3">Created</th></tr></thead><tbody className="divide-y divide-slate-100">{data.orders.map((row)=><tr key={s(row.id)} className="hover:bg-slate-50/70"><td className="px-5 py-4 font-extrabold text-slate-900">{s(row.order_number)}</td><td className="px-4 py-4"><AdminBadge variant={statusVariant(row.status)}>{s(row.status)}</AdminBadge></td><td className="px-4 py-4 font-bold text-slate-700">{rupiah(row.total_amount)}</td><td className="px-4 py-4 font-mono text-xs text-slate-500">{s(row.user_id).slice(0,8)}</td><td className="px-5 py-4 text-slate-500">{displayDate(row.created_at)}</td></tr>)}</tbody></table></div> : <AdminEmptyState title="Belum ada order"/>}</AdminCard>
                <AdminCard className="overflow-hidden"><div className="border-b border-slate-200 p-5"><AdminSectionHeading title="Payments" description="Payment terbaru dari provider."/></div>{data.payments.length ? <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-slate-50 text-[11px] font-extrabold uppercase tracking-wide text-slate-400"><tr><th className="px-5 py-3">Provider</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Order</th><th className="px-5 py-3">Method</th></tr></thead><tbody className="divide-y divide-slate-100">{data.payments.map((row)=><tr key={s(row.id)} className="hover:bg-slate-50/70"><td className="px-5 py-4 font-extrabold text-slate-900">{s(row.provider)}</td><td className="px-4 py-4"><AdminBadge variant={statusVariant(row.status)}>{s(row.status)}</AdminBadge></td><td className="px-4 py-4 font-bold text-slate-700">{rupiah(row.amount)}</td><td className="px-4 py-4 font-mono text-xs text-slate-500">{s(row.order_id).slice(0,8)}</td><td className="px-5 py-4 text-slate-500">{s(row.payment_method)||'—'}</td></tr>)}</tbody></table></div> : <AdminEmptyState title="Belum ada payment"/>}</AdminCard>
            </section> : <PermissionEmpty permission="order.read / payment.manage"/>)}
        </div>
    )
}
