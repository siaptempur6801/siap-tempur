import Link from 'next/link'
import { Archive, CalendarDays, FileQuestion, Package, Save } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getServerNowMs } from '@/lib/server/time'
import {
    ADMIN_OPERATIONS_PAGE_COPY,
    ADMIN_OPERATIONS_PERMISSIONS,
    ADMIN_OPERATIONS_ROUTES,
    ADMIN_OPERATIONS_SECTIONS,
    type AdminOperationsMode,
} from '@/lib/admin-operations'
import { serializeOptionRows } from '@/lib/question-options'
import { adminV2Service } from '@/src/services/admin-v2.service'
import { authorizationService } from '@/src/services/authorization.service'
import { PERMISSIONS } from '@/src/auth/permissions'
import {
    archiveEventAction,
    archiveProductAction,
    archiveQuestionAction,
    linkEventProductAction,
    saveEventAction,
    saveEventSessionAction,
    saveProductAction,
    saveQuestionAction,
} from '@/app/actions/admin-v2'
import AdminModal from '@/components/admin/AdminModal'
import EventFlyerField from '@/components/admin/EventFlyerField'
import QuestionOptionsEditor from '@/components/admin/QuestionOptionsEditor'
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

export type { AdminOperationsMode }

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
    return `${ADMIN_OPERATIONS_ROUTES[mode]}?${query.toString()}`
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

    // Otorisasi dulu, query kemudian.
    const authorization = await authorizationService.getCurrentAuthorization()
    const permissions = new Set(authorization?.permissions ?? [])
    const allowed = ADMIN_OPERATIONS_PERMISSIONS[mode]
    if (!allowed.some((permission) => permissions.has(permission))) {
        return (
            <div className="space-y-5 pb-10">
                <AdminPageHeader title={ADMIN_OPERATIONS_PAGE_COPY[mode].title} description={ADMIN_OPERATIONS_PAGE_COPY[mode].description}/>
                <PermissionEmpty permission={allowed.join(' atau ')}/>
            </div>
        )
    }

    const data = await adminV2Service.getWorkspaceData(requestedContext, ADMIN_OPERATIONS_SECTIONS[mode]) as unknown as WorkspaceView
    const program = data.catalog.program.code
    const track = data.catalog.track.code
    const nowMs = getServerNowMs()

    const canProducts = permissions.has(PERMISSIONS.PRODUCT_MANAGE)
    const canEvents = permissions.has(PERMISSIONS.EVENT_MANAGE)
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
    const optionsFor = (questionId: string) => data.questionOptions.filter((row) => s(row.question_id) === questionId)

    const editedProduct = data.products.find((row) => s(row.id) === params.edit)
    const editedEvent = data.events.find((row) => s(row.id) === params.edit)
    const editedQuestion = data.questions.find((row) => s(row.id) === params.edit)
    const editedProductPrice = editedProduct ? priceByProduct.get(s(editedProduct.id)) : undefined
    const closeHref = workspaceHref(mode, program, track)

    let pageAction: React.ReactNode = null

    if (mode === 'products' && canProducts) {
        pageAction = (
            <AdminModal
                title={editedProduct ? 'Edit product' : 'Tambah product'}
                description={editedProduct ? 'Perbarui product tanpa meninggalkan catalog.' : 'Buat product baru untuk context aktif.'}
                triggerLabel="Tambah product"
                defaultOpen={Boolean(editedProduct)}
                closeHref={closeHref}
                size="xl"
            >
                <form key={editedProduct ? `product-${s(editedProduct.id)}-${s(editedProduct.updated_at)}` : `product-new-${program}-${track}`} action={saveProductAction} className="grid gap-4 md:grid-cols-2">
                    <ContextFields program={program} track={track}/>
                    {editedProduct && <input type="hidden" name="id" value={s(editedProduct.id)}/>} 
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
                    <div className="md:col-span-2 flex justify-end border-t border-slate-100 pt-4"><button className={adminPrimaryButtonClass}><Save size={16}/>{editedProduct ? 'Simpan perubahan' : 'Simpan product'}</button></div>
                </form>
            </AdminModal>
        )
    }

    if (mode === 'events' && canEvents) {
        pageAction = (
            <AdminModal
                title={editedEvent ? 'Edit event' : 'Buat event'}
                description="Jadwal registrasi dan pelaksanaan menggunakan waktu lokal WIB."
                triggerLabel="Buat event"
                defaultOpen={Boolean(editedEvent)}
                closeHref={closeHref}
                size="xl"
            >
                <form key={editedEvent ? `event-${s(editedEvent.id)}-${s(editedEvent.status)}-${s(editedEvent.starts_at)}` : `event-new-${program}-${track}`} action={saveEventAction} className="grid gap-4 md:grid-cols-2">
                    <ContextFields program={program} track={track}/>
                    {editedEvent && <input type="hidden" name="id" value={s(editedEvent.id)}/>} 
                    <Field label="Kode"><input className={adminInputClass} name="code" required defaultValue={s(editedEvent?.code)}/></Field>
                    <Field label="Judul"><input className={adminInputClass} name="title" required defaultValue={s(editedEvent?.title)}/></Field>
                    <Field label="Slug"><input className={adminInputClass} name="slug" defaultValue={s(editedEvent?.slug)}/></Field>
                    <Field label="Status"><select className={adminInputClass} name="status" defaultValue={s(editedEvent?.status)||'draft'}><option>draft</option><option>scheduled</option><option>live</option><option>closed</option><option>archived</option></select></Field>
                    <Field label="Registrasi mulai"><input className={adminInputClass} type="datetime-local" name="registration_start" defaultValue={localDateTime(editedEvent?.registration_start)}/></Field>
                    <Field label="Registrasi selesai"><input className={adminInputClass} type="datetime-local" name="registration_end" defaultValue={localDateTime(editedEvent?.registration_end)}/></Field>
                    <Field label="Mulai"><input className={adminInputClass} required type="datetime-local" name="starts_at" defaultValue={localDateTime(editedEvent?.starts_at)}/></Field>
                    <Field label="Selesai"><input className={adminInputClass} required type="datetime-local" name="ends_at" defaultValue={localDateTime(editedEvent?.ends_at)}/></Field>
                    <Field label="Deskripsi" className="md:col-span-2"><input className={adminInputClass} name="description" defaultValue={s(editedEvent?.description)}/></Field>
                    <EventFlyerField defaultValue={nullable(editedEvent?.flyer_image_url)}/>
                    <div className="md:col-span-2 flex justify-end border-t border-slate-100 pt-4"><button className={adminPrimaryButtonClass}><Save size={16}/>{editedEvent ? 'Simpan perubahan' : 'Simpan event'}</button></div>
                </form>
            </AdminModal>
        )
    }

    if (mode === 'questions' && canQuestions) {
        pageAction = (
            <AdminModal
                title={editedQuestion ? 'Edit soal' : 'Tambah soal'}
                description="Form soal dibuka hanya saat dibutuhkan agar daftar soal tetap mudah dipindai."
                triggerLabel="Tambah soal"
                defaultOpen={Boolean(editedQuestion)}
                closeHref={closeHref}
                size="wide"
            >
                <form key={editedQuestion ? `question-${s(editedQuestion.id)}-${s(editedQuestion.updated_at)}-${s(editedQuestion.version)}` : `question-new-${program}-${track}`} action={saveQuestionAction} className="grid gap-4 lg:grid-cols-2">
                    <ContextFields program={program} track={track}/>
                    {editedQuestion && <input type="hidden" name="id" value={s(editedQuestion.id)}/>} 
                    <Field label="Mapel / Subtes"><select className={adminInputClass} name="subject_code" defaultValue={subjectById.get(s(editedQuestion?.subject_id))?.code}>{data.catalog.subjects.map((subject)=><option key={subject.id} value={subject.code}>{subject.code} · {subject.name}</option>)}</select></Field>
                    <Field label="Tipe respons"><select className={adminInputClass} name="question_type" defaultValue={s(editedQuestion?.question_type)||'single_choice'}><option value="single_choice">single_choice</option><option value="multiple_choice">multiple_choice</option><option value="category">category</option></select></Field>
                    <Field label="Difficulty"><select className={adminInputClass} name="difficulty" defaultValue={s(editedQuestion?.difficulty)||'medium'}><option>easy</option><option>medium</option><option>hard</option></select></Field>
                    <Field label="Status"><select className={adminInputClass} name="status" defaultValue={s(editedQuestion?.status)||'draft'}><option>draft</option><option>published</option><option>archived</option></select></Field>
                    <Field label="Source reference"><input className={adminInputClass} name="source_reference" defaultValue={s(editedQuestion?.source_reference)} placeholder="Sumber soal / referensi internal"/></Field>
                    <Field label="Alasan perubahan"><input className={adminInputClass} name="change_reason" placeholder="Contoh: koreksi typo atau kunci"/></Field>
                    <Field label="Pertanyaan"><textarea className={cn(adminInputClass, 'min-h-36 resize-y')} name="stem" required rows={5} defaultValue={s(editedQuestion?.stem)}/></Field>
                    <Field label="Opsi" className="lg:col-span-2">
                        <QuestionOptionsEditor defaultValue={serializeOptionRows(optionsFor(s(editedQuestion?.id)))}/>
                    </Field>
                    <div className="lg:col-span-2 flex justify-end border-t border-slate-100 pt-4"><button className={adminPrimaryButtonClass}><Save size={16}/>{editedQuestion ? 'Simpan perubahan' : 'Tambah soal'}</button></div>
                </form>
            </AdminModal>
        )
    }

    return (
        <div className="space-y-6 pb-10">
            <AdminPageHeader
                title={ADMIN_OPERATIONS_PAGE_COPY[mode].title}
                description={`${ADMIN_OPERATIONS_PAGE_COPY[mode].description} Context aktif: ${data.catalog.program.name} / ${data.catalog.track.name}.`}
                action={pageAction}
            />
            <Feedback ok={params.ok} error={params.error}/>

            {mode === 'products' && (canProducts ? <section className="space-y-5">
                <AdminCard className="overflow-hidden">
                    <div className="border-b border-slate-200 p-5"><AdminSectionHeading title="Product catalog" description={`${data.products.length} product pada context aktif.`}/></div>
                    {data.products.length ? <div className="divide-y divide-slate-100">{data.products.map((row) => {
                        const id = s(row.id)
                        const price = priceByProduct.get(id)
                        return <div key={id} className="flex flex-col gap-4 p-5 transition hover:bg-slate-50/70 lg:flex-row lg:items-center lg:justify-between">
                            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-extrabold text-slate-900">{s(row.name)}</span><AdminBadge variant={statusVariant(row.status)}>{s(row.status)}</AdminBadge></div><div className="mt-1 text-xs font-semibold text-slate-500">{s(row.code)} · {s(row.product_type)} · {price ? rupiah(price.amount) : 'Tanpa harga'} · grant {grantByProduct.get(id) ?? 0}</div></div>
                            <div className="flex shrink-0 flex-wrap gap-2"><Link className={adminSecondaryButtonClass} href={workspaceHref('products', program, track, id)}>Edit</Link><form action={archiveProductAction}><ContextFields program={program} track={track}/><input type="hidden" name="id" value={id}/><button className={adminDangerButtonClass}><Archive size={14}/>Archive</button></form></div>
                        </div>
                    })}</div> : <AdminEmptyState title="Belum ada product" description="Gunakan tombol Tambah product untuk membuat product pertama."/>}
                </AdminCard>
            </section> : <PermissionEmpty permission="product.manage"/>)}

            {mode === 'events' && (canEvents ? <section className="space-y-3">
                {data.events.length ? data.events.map((row) => {
                    const id = s(row.id)
                    const sessions = sessionsFor(id)
                    const ticketProducts = data.products.filter((product) => s(product.product_type) === 'EVENT_TICKET')
                    return <AdminCard key={id} className="p-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div><div className="flex flex-wrap items-center gap-2"><span className="font-extrabold text-slate-900">{s(row.title)}</span><AdminBadge variant={statusVariant(row.status)}>{s(row.status)}</AdminBadge></div><p className="mt-1 text-xs font-semibold text-slate-500">{s(row.code)} · {sessions.length} sesi · {displayDate(row.starts_at)} → {displayDate(row.ends_at)}</p></div>
                            <div className="flex flex-wrap gap-2"><Link className={adminSecondaryButtonClass} href={workspaceHref('events', program, track, id)}>Edit</Link><form action={archiveEventAction}><ContextFields program={program} track={track}/><input type="hidden" name="id" value={id}/><button className={adminDangerButtonClass}><Archive size={14}/>Archive</button></form></div>
                        </div>
                        <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex min-w-0 flex-wrap gap-2">{sessions.length ? sessions.map((session) => <AdminBadge key={s(session.id)}>{s(session.name)} · {s(session.status)}</AdminBadge>) : <span className="text-sm font-medium text-slate-500">Belum ada sesi.</span>}</div>
                            <div className="flex shrink-0 flex-wrap gap-2">
                                <AdminModal title="Tambah sesi" description={`Tambahkan sesi untuk ${s(row.title)}.`} triggerLabel="Tambah sesi" triggerVariant="secondary" size="lg">
                                    <form action={saveEventSessionAction} className="grid gap-4 md:grid-cols-2">
                                        <ContextFields program={program} track={track}/><input type="hidden" name="event_id" value={id}/>
                                        <Field label="Nama sesi"><input className={adminInputClass} name="name" required/></Field>
                                        <Field label="Exam EVENT"><select className={adminInputClass} name="exam_id">{data.exams.filter((exam) => examTypeById.get(s(exam.exam_type_id))?.code === 'EVENT').map((exam) => <option key={s(exam.id)} value={s(exam.id)}>{s(exam.title)}</option>)}</select></Field>
                                        <Field label="Mulai"><input className={adminInputClass} type="datetime-local" name="starts_at" defaultValue={localDateTime(row.starts_at)}/></Field>
                                        <Field label="Selesai"><input className={adminInputClass} type="datetime-local" name="ends_at" defaultValue={localDateTime(row.ends_at)}/></Field>
                                        <Field label="Kapasitas"><input className={adminInputClass} type="number" min="1" name="capacity"/></Field>
                                        <Field label="Status"><select className={adminInputClass} name="status"><option>scheduled</option><option>live</option><option>closed</option></select></Field>
                                        <div className="md:col-span-2 flex justify-end border-t border-slate-100 pt-4"><button className={adminPrimaryButtonClass}>Tambah sesi</button></div>
                                    </form>
                                </AdminModal>
                                {sessions.length > 0 && ticketProducts.length > 0 ? <AdminModal title="Hubungkan tiket" description="Pilih sesi dan product tiket yang akan digunakan." triggerLabel="Hubungkan tiket" triggerVariant="secondary" size="md">
                                    <form action={linkEventProductAction} className="grid gap-4">
                                        <ContextFields program={program} track={track}/><input type="hidden" name="event_id" value={id}/>
                                        <Field label="Sesi"><select className={adminInputClass} name="session_id">{sessions.map((session) => <option key={s(session.id)} value={s(session.id)}>{s(session.name)}</option>)}</select></Field>
                                        <Field label="Produk tiket"><select className={adminInputClass} name="product_id">{ticketProducts.map((product) => <option key={s(product.id)} value={s(product.id)}>{s(product.code)} · {s(product.name)}</option>)}</select></Field>
                                        <input type="hidden" name="status" value="active"/>
                                        <div className="flex justify-end border-t border-slate-100 pt-4"><button className={adminPrimaryButtonClass}>Hubungkan tiket</button></div>
                                    </form>
                                </AdminModal> : null}
                            </div>
                        </div>
                    </AdminCard>
                }) : <AdminCard><AdminEmptyState title="Belum ada event" description="Gunakan tombol Buat event untuk membuat event pertama."/></AdminCard>}
            </section> : <PermissionEmpty permission="event.manage"/>)}

            {mode === 'questions' && (canQuestions ? <section className="space-y-5">
                <AdminCard className="overflow-hidden"><div className="border-b border-slate-200 p-5"><AdminSectionHeading title="Daftar soal" description={`${data.questions.length} soal pada context aktif.`}/></div>{data.questions.length ? <div className="divide-y divide-slate-100">{data.questions.map((row) => {
                    const id = s(row.id)
                    return <div key={id} className="flex flex-col gap-4 p-5 transition hover:bg-slate-50/70 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-extrabold text-slate-900">{s(row.question_code) || 'Tanpa kode'}</span><AdminBadge variant="blue">{subjectById.get(s(row.subject_id))?.code ?? '?'}</AdminBadge><AdminBadge>{s(row.question_type)}</AdminBadge><AdminBadge variant={statusVariant(row.status)}>{s(row.status)}</AdminBadge><span className="text-xs font-bold text-slate-400">v{s(row.version)}</span></div><p className="mt-2 line-clamp-2 max-w-4xl text-sm font-medium leading-6 text-slate-600">{s(row.stem)}</p></div><div className="flex shrink-0 flex-wrap gap-2"><Link className={adminSecondaryButtonClass} href={workspaceHref('questions', program, track, id)}>Edit</Link><form action={archiveQuestionAction}><ContextFields program={program} track={track}/><input type="hidden" name="id" value={id}/><button className={adminDangerButtonClass}><Archive size={14}/>Archive</button></form></div></div>
                })}</div> : <AdminEmptyState title="Belum ada soal" description="Gunakan tombol Tambah soal untuk membuat soal pertama."/>}</AdminCard>
            </section> : <PermissionEmpty permission="question.manage"/>)}

            {mode === 'commerce' && (canCommerce ? <section className="space-y-5">
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">Commerce monitor masih global lintas program. Filter per Program/Track belum diterapkan karena ownership berada pada order_items.</div>
                <section className="grid gap-3 sm:grid-cols-3"><AdminMetric label="Order terbaru" value={data.orders.length} helper="Snapshot workspace" icon={<Package size={18}/>} tone="blue"/><AdminMetric label="Payment terbaru" value={data.payments.length} helper="Snapshot workspace" icon={<CalendarDays size={18}/>} tone="violet"/><AdminMetric label="Paid" value={data.orders.filter((row) => lower(row.status) === 'paid').length} helper="Order berstatus paid" icon={<FileQuestion size={18}/>} tone="green"/></section>
                <AdminCard className="overflow-hidden"><div className="border-b border-slate-200 p-5"><AdminSectionHeading title="Orders" description="Order terbaru dan status pembayarannya."/></div>{data.orders.length ? <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-slate-50 text-[11px] font-extrabold uppercase tracking-wide text-slate-400"><tr><th className="px-5 py-3">Order</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">User</th><th className="px-5 py-3">Created</th></tr></thead><tbody className="divide-y divide-slate-100">{data.orders.map((row) => <tr key={s(row.id)} className="hover:bg-slate-50/70"><td className="px-5 py-4 font-extrabold text-slate-900">{s(row.order_number)}</td><td className="px-4 py-4"><AdminBadge variant={statusVariant(row.status)}>{s(row.status)}</AdminBadge></td><td className="px-4 py-4 font-bold text-slate-700">{rupiah(row.total_amount)}</td><td className="px-4 py-4 font-mono text-xs text-slate-500">{s(row.user_id).slice(0, 8)}</td><td className="px-5 py-4 text-slate-500">{displayDate(row.created_at)}</td></tr>)}</tbody></table></div> : <AdminEmptyState title="Belum ada order"/>}</AdminCard>
                <AdminCard className="overflow-hidden"><div className="border-b border-slate-200 p-5"><AdminSectionHeading title="Payments" description="Payment terbaru dari provider."/></div>{data.payments.length ? <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-slate-50 text-[11px] font-extrabold uppercase tracking-wide text-slate-400"><tr><th className="px-5 py-3">Provider</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Order</th><th className="px-5 py-3">Method</th></tr></thead><tbody className="divide-y divide-slate-100">{data.payments.map((row) => <tr key={s(row.id)} className="hover:bg-slate-50/70"><td className="px-5 py-4 font-extrabold text-slate-900">{s(row.provider)}</td><td className="px-4 py-4"><AdminBadge variant={statusVariant(row.status)}>{s(row.status)}</AdminBadge></td><td className="px-4 py-4 font-bold text-slate-700">{rupiah(row.amount)}</td><td className="px-4 py-4 font-mono text-xs text-slate-500">{s(row.order_id).slice(0, 8)}</td><td className="px-5 py-4 text-slate-500">{s(row.payment_method) || '—'}</td></tr>)}</tbody></table></div> : <AdminEmptyState title="Belum ada payment"/>}</AdminCard>
            </section> : <PermissionEmpty permission="order.read / payment.manage"/>)}
        </div>
    )
}
