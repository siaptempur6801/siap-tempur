import Link from 'next/link'
import {
    Archive,
    BookOpenCheck,
    CalendarDays,
    CreditCard,
    Database,
    FileQuestion,
    Package,
    Save,
    Settings2,
    ShoppingCart,
    Ticket,
} from 'lucide-react'
import { cn } from '@/lib/utils'
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

export const dynamic = 'force-dynamic'

const TABS = [
    { id: 'products', label: 'Produk', icon: Package },
    { id: 'events', label: 'Event', icon: CalendarDays },
    { id: 'exams', label: 'Exam', icon: BookOpenCheck },
    { id: 'questions', label: 'Soal', icon: FileQuestion },
    { id: 'commerce', label: 'Order & Payment', icon: CreditCard },
] as const

type TabId = (typeof TABS)[number]['id']

function localDateTime(value: string | null | undefined) {
    if (!value) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    return new Date(date.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 16)
}

function rupiah(value: unknown) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(Number(value ?? 0))
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="block space-y-1.5">
            <span className="text-xs font-black uppercase tracking-wide text-gray-500">{label}</span>
            {children}
        </label>
    )
}

const inputClass = 'w-full border-2 border-gray-900 bg-white px-3 py-2 text-sm font-semibold outline-none focus:bg-yellow-50'
const selectClass = inputClass
const buttonClass = 'inline-flex items-center justify-center gap-2 border-2 border-gray-900 bg-gray-900 px-4 py-2 text-sm font-black text-white shadow-[3px_3px_0_0_#aaa] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none'
const dangerClass = 'inline-flex items-center justify-center gap-2 border-2 border-gray-900 bg-red-100 px-3 py-2 text-xs font-black text-red-800 transition hover:bg-red-200'

function Notice({ ok, error }: { ok?: string; error?: string }) {
    if (!ok && !error) return null
    return (
        <div className={cn(
            'mb-6 border-2 border-gray-900 px-4 py-3 font-bold shadow-[3px_3px_0_0_#111]',
            error ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
        )}>
            {error || ok}
        </div>
    )
}

export default async function AdminDashboard({
    searchParams,
}: {
    searchParams: Promise<{ tab?: string; ok?: string; error?: string }>
}) {
    const params = await searchParams
    const tab = TABS.some((item) => item.id === params.tab) ? params.tab as TabId : 'products'
    const [data, authorization] = await Promise.all([
        adminV2Service.getWorkspaceData(),
        authorizationService.getCurrentAuthorization(),
    ])
    const permissions = new Set(authorization?.permissions ?? [])
    const canProducts = permissions.has(PERMISSIONS.PRODUCT_MANAGE)
    const canEvents = permissions.has(PERMISSIONS.EVENT_MANAGE)
    const canExams = permissions.has(PERMISSIONS.EXAM_MANAGE)
    const canQuestions = permissions.has(PERMISSIONS.QUESTION_MANAGE)
    const canOrders = permissions.has(PERMISSIONS.ORDER_READ) || permissions.has(PERMISSIONS.PAYMENT_MANAGE)

    const priceByProduct = new Map<string, (typeof data.productPrices)[number]>()
    for (const price of data.productPrices) {
        if (String(price.status).toLowerCase() !== 'active') continue
        if (price.ends_at && new Date(price.ends_at).getTime() < Date.now()) continue
        if (!priceByProduct.has(price.product_id)) priceByProduct.set(price.product_id, price)
    }
    const grantByProduct = new Map(data.productWalletGrants.map((row) => [String(row.product_id), Number(row.amount ?? 0)]))
    const subjectById = new Map(data.catalog.subjects.map((row) => [row.id, row]))
    const examTypeById = new Map(data.catalog.examTypes.map((row) => [row.id, row]))
    const sessionsByEvent = new Map<string, typeof data.eventSessions>()
    for (const session of data.eventSessions) {
        const rows = sessionsByEvent.get(session.event_id) ?? []
        rows.push(session)
        sessionsByEvent.set(session.event_id, rows)
    }
    const sectionsByExam = new Map<string, typeof data.examSections>()
    for (const section of data.examSections) {
        const rows = sectionsByExam.get(section.exam_id) ?? []
        rows.push(section)
        sectionsByExam.set(section.exam_id, rows)
    }
    const optionsByQuestion = new Map<string, typeof data.questionOptions>()
    for (const option of data.questionOptions) {
        const rows = optionsByQuestion.get(option.question_id) ?? []
        rows.push(option)
        optionsByQuestion.set(option.question_id, rows)
    }

    return (
        <div className="space-y-6 pb-14">
            <header className="border-2 border-gray-900 bg-white p-6 shadow-[6px_6px_0_0_#111]">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <div className="mb-2 inline-flex items-center gap-2 border-2 border-gray-900 bg-yellow-300 px-3 py-1 text-xs font-black uppercase tracking-widest">
                            <Database size={14} /> Schema V2
                        </div>
                        <h1 className="font-handwriting text-4xl font-black text-gray-900 sm:text-5xl">Admin Workspace</h1>
                        <p className="mt-2 max-w-3xl font-semibold text-gray-600">
                            CRUD canonical untuk produk, event, exam, dan bank soal. Perubahan harga disimpan sebagai histori price baru; data yang sudah dipakai peserta diarsipkan, bukan dihapus paksa.
                        </p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs font-black sm:text-sm">
                        <div className="border-2 border-gray-900 bg-indigo-50 px-3 py-2"><b className="block text-xl">{data.products.length}</b>Produk</div>
                        <div className="border-2 border-gray-900 bg-green-50 px-3 py-2"><b className="block text-xl">{data.events.length}</b>Event</div>
                        <div className="border-2 border-gray-900 bg-orange-50 px-3 py-2"><b className="block text-xl">{data.questions.length}</b>Soal terbaru</div>
                    </div>
                </div>
            </header>

            <Notice ok={params.ok} error={params.error} />

            <nav className="flex gap-2 overflow-x-auto pb-1">
                {TABS.map(({ id, label, icon: Icon }) => (
                    <Link
                        key={id}
                        href={`/cpns/admin?tab=${id}`}
                        className={cn(
                            'inline-flex shrink-0 items-center gap-2 border-2 border-gray-900 px-4 py-2 font-black shadow-[3px_3px_0_0_#bbb]',
                            tab === id ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'
                        )}
                    >
                        <Icon size={17} /> {label}
                    </Link>
                ))}
            </nav>

            {tab === 'products' && (
                <section className="space-y-6">
                    <div className="border-2 border-gray-900 bg-indigo-50 p-5 shadow-[4px_4px_0_0_#111]">
                        <h2 className="mb-4 flex items-center gap-2 text-xl font-black"><Package /> Tambah Produk</h2>
                        {canProducts ? (
                            <form action={saveProductAction} className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                                <Field label="Kode"><input name="code" required placeholder="CPNS_TOKEN_20" className={inputClass} /></Field>
                                <Field label="Nama"><input name="name" required placeholder="20 Token CPNS" className={inputClass} /></Field>
                                <Field label="Jenis">
                                    <select name="product_type" className={selectClass} defaultValue="TOKEN_PACK">
                                        <option value="TOKEN_PACK">TOKEN_PACK</option><option value="PASS">PASS</option><option value="EVENT_TICKET">EVENT_TICKET</option>
                                    </select>
                                </Field>
                                <Field label="Status"><select name="status" className={selectClass} defaultValue="draft"><option value="draft">draft</option><option value="active">active</option></select></Field>
                                <Field label="Harga IDR"><input name="price" type="number" min="0" className={inputClass} /></Field>
                                <Field label="Token Grant"><input name="token_grant" type="number" min="0" className={inputClass} /></Field>
                                <Field label="Durasi hari"><input name="duration_days" type="number" min="1" className={inputClass} /></Field>
                                <Field label="Deskripsi"><input name="description" className={inputClass} /></Field>
                                <input type="hidden" name="currency" value="IDR" />
                                <button className={buttonClass}><Save size={16} /> Simpan Produk</button>
                            </form>
                        ) : <p className="font-bold text-gray-500">Tidak memiliki permission product.manage.</p>}
                    </div>

                    <div className="grid gap-4 xl:grid-cols-2">
                        {data.products.map((product) => {
                            const price = priceByProduct.get(product.id)
                            const grant = grantByProduct.get(product.id) ?? 0
                            return (
                                <details key={product.id} className="border-2 border-gray-900 bg-white p-4 shadow-[4px_4px_0_0_#ccc]">
                                    <summary className="cursor-pointer font-black">
                                        {product.code} · {product.name} · {product.status} · {price ? rupiah(price.amount) : 'tanpa harga'}
                                    </summary>
                                    {canProducts && (
                                        <div className="mt-4 space-y-3">
                                            <form action={saveProductAction} className="grid gap-3 md:grid-cols-2">
                                                <input type="hidden" name="id" value={product.id} />
                                                <Field label="Kode"><input name="code" defaultValue={product.code} className={inputClass} /></Field>
                                                <Field label="Nama"><input name="name" defaultValue={product.name} className={inputClass} /></Field>
                                                <Field label="Jenis"><input name="product_type" defaultValue={product.product_type} className={inputClass} /></Field>
                                                <Field label="Status"><input name="status" defaultValue={product.status} className={inputClass} /></Field>
                                                <Field label="Harga Baru"><input name="price" type="number" min="0" placeholder={price ? String(price.amount) : 'kosong = tidak berubah'} className={inputClass} /></Field>
                                                <Field label="Token Grant"><input name="token_grant" type="number" min="0" defaultValue={grant} className={inputClass} /></Field>
                                                <Field label="Durasi hari"><input name="duration_days" type="number" min="1" defaultValue={product.duration_days ?? ''} className={inputClass} /></Field>
                                                <Field label="Deskripsi"><input name="description" defaultValue={product.description ?? ''} className={inputClass} /></Field>
                                                <input type="hidden" name="currency" value="IDR" />
                                                <button className={buttonClass}><Save size={15} /> Update</button>
                                            </form>
                                            <form action={archiveProductAction}><input type="hidden" name="id" value={product.id} /><button className={dangerClass}><Archive size={14} /> Arsipkan</button></form>
                                        </div>
                                    )}
                                </details>
                            )
                        })}
                    </div>
                </section>
            )}

            {tab === 'events' && (
                <section className="space-y-6">
                    <div className="border-2 border-gray-900 bg-green-50 p-5 shadow-[4px_4px_0_0_#111]">
                        <h2 className="mb-4 flex items-center gap-2 text-xl font-black"><CalendarDays /> Buat Tryout Akbar</h2>
                        {canEvents ? (
                            <form action={saveEventAction} className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                                <Field label="Kode"><input name="code" required placeholder="AKBAR-02" className={inputClass} /></Field>
                                <Field label="Judul"><input name="title" required className={inputClass} /></Field>
                                <Field label="Slug"><input name="slug" className={inputClass} /></Field>
                                <Field label="Status"><select name="status" defaultValue="draft" className={selectClass}><option value="draft">draft</option><option value="scheduled">scheduled</option><option value="live">live</option><option value="closed">closed</option></select></Field>
                                <Field label="Pendaftaran mulai"><input type="datetime-local" name="registration_start" className={inputClass} /></Field>
                                <Field label="Pendaftaran selesai"><input type="datetime-local" name="registration_end" className={inputClass} /></Field>
                                <Field label="Event mulai"><input required type="datetime-local" name="starts_at" className={inputClass} /></Field>
                                <Field label="Event selesai"><input required type="datetime-local" name="ends_at" className={inputClass} /></Field>
                                <Field label="Deskripsi"><input name="description" className={inputClass} /></Field>
                                <button className={buttonClass}><Save size={16} /> Simpan Event</button>
                            </form>
                        ) : <p className="font-bold text-gray-500">Tidak memiliki permission event.manage.</p>}
                    </div>

                    {data.events.map((event) => {
                        const sessions = sessionsByEvent.get(event.id) ?? []
                        const mapping = data.eventProducts.find((row) => String(row.event_id) === event.id)
                        return (
                            <details key={event.id} className="border-2 border-gray-900 bg-white p-5 shadow-[4px_4px_0_0_#ccc]">
                                <summary className="cursor-pointer text-lg font-black">{event.code} · {event.title} · {event.status} · {sessions.length} sesi</summary>
                                {canEvents && (
                                    <div className="mt-5 space-y-5">
                                        <form action={saveEventAction} className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                                            <input type="hidden" name="id" value={event.id} />
                                            <Field label="Kode"><input name="code" defaultValue={event.code} className={inputClass} /></Field>
                                            <Field label="Judul"><input name="title" defaultValue={event.title} className={inputClass} /></Field>
                                            <Field label="Slug"><input name="slug" defaultValue={event.slug} className={inputClass} /></Field>
                                            <Field label="Status"><input name="status" defaultValue={event.status} className={inputClass} /></Field>
                                            <Field label="Pendaftaran mulai"><input type="datetime-local" name="registration_start" defaultValue={localDateTime(event.registration_start)} className={inputClass} /></Field>
                                            <Field label="Pendaftaran selesai"><input type="datetime-local" name="registration_end" defaultValue={localDateTime(event.registration_end)} className={inputClass} /></Field>
                                            <Field label="Mulai"><input type="datetime-local" name="starts_at" defaultValue={localDateTime(event.starts_at)} className={inputClass} /></Field>
                                            <Field label="Selesai"><input type="datetime-local" name="ends_at" defaultValue={localDateTime(event.ends_at)} className={inputClass} /></Field>
                                            <Field label="Deskripsi"><input name="description" defaultValue={event.description ?? ''} className={inputClass} /></Field>
                                            <button className={buttonClass}><Save size={15} /> Update Event</button>
                                        </form>

                                        <div className="border-t-2 border-dashed border-gray-300 pt-4">
                                            <h3 className="mb-3 font-black">Sesi Event</h3>
                                            <form action={saveEventSessionAction} className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                                                <input type="hidden" name="event_id" value={event.id} />
                                                <Field label="Nama Sesi"><input name="name" required placeholder="Sesi 1" className={inputClass} /></Field>
                                                <Field label="Exam EVENT"><select name="exam_id" className={selectClass}>{data.exams.filter((exam) => examTypeById.get(exam.exam_type_id)?.code === 'EVENT').map((exam) => <option key={exam.id} value={exam.id}>{exam.title}</option>)}</select></Field>
                                                <Field label="Mulai"><input type="datetime-local" name="starts_at" defaultValue={localDateTime(event.starts_at)} className={inputClass} /></Field>
                                                <Field label="Selesai"><input type="datetime-local" name="ends_at" defaultValue={localDateTime(event.ends_at)} className={inputClass} /></Field>
                                                <Field label="Kapasitas"><input type="number" min="1" name="capacity" className={inputClass} /></Field>
                                                <Field label="Status"><select name="status" defaultValue="scheduled" className={selectClass}><option value="scheduled">scheduled</option><option value="live">live</option><option value="closed">closed</option></select></Field>
                                                <button className={buttonClass}><Save size={15} /> Tambah Sesi</button>
                                            </form>
                                            <div className="mt-3 grid gap-2 lg:grid-cols-2">
                                                {sessions.map((session) => <div key={session.id} className="border-2 border-gray-300 p-3 text-sm"><b>{session.name}</b><div>{localDateTime(session.starts_at)} → {localDateTime(session.ends_at)} · kuota {session.capacity ?? '∞'} · {session.status}</div></div>)}
                                            </div>
                                        </div>

                                        <div className="border-t-2 border-dashed border-gray-300 pt-4">
                                            <h3 className="mb-3 flex items-center gap-2 font-black"><Ticket size={17} /> Hubungkan Tiket Berbayar</h3>
                                            <form action={linkEventProductAction} className="grid gap-3 md:grid-cols-3">
                                                <input type="hidden" name="event_id" value={event.id} />
                                                <Field label="Sesi"><select name="session_id" className={selectClass}>{sessions.map((session) => <option key={session.id} value={session.id}>{session.name}</option>)}</select></Field>
                                                <Field label="Produk Tiket"><select name="product_id" className={selectClass}>{data.products.filter((product) => product.product_type === 'EVENT_TICKET').map((product) => <option key={product.id} value={product.id}>{product.code} · {product.name}</option>)}</select></Field>
                                                <input type="hidden" name="status" value="active" />
                                                <button className={buttonClass}><Ticket size={15} /> Hubungkan</button>
                                            </form>
                                            {mapping && <p className="mt-2 text-xs font-bold text-green-700">Ticket product aktif: {String(mapping.product_id)}</p>}
                                        </div>

                                        <form action={archiveEventAction}><input type="hidden" name="id" value={event.id} /><button className={dangerClass}><Archive size={14} /> Arsipkan Event</button></form>
                                    </div>
                                )}
                            </details>
                        )
                    })}
                </section>
            )}

            {tab === 'exams' && (
                <section className="space-y-6">
                    <div className="border-2 border-gray-900 bg-orange-50 p-5 shadow-[4px_4px_0_0_#111]">
                        <h2 className="mb-4 flex items-center gap-2 text-xl font-black"><Settings2 /> Buat Exam</h2>
                        {canExams ? (
                            <form action={saveExamAction} className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                                <Field label="Tipe"><select name="exam_type_code" className={selectClass}>{data.catalog.examTypes.map((type) => <option key={type.id} value={type.code}>{type.code}</option>)}</select></Field>
                                <Field label="Judul"><input name="title" required className={inputClass} /></Field>
                                <Field label="Slug"><input name="slug" className={inputClass} /></Field>
                                <Field label="Status"><select name="status" defaultValue="draft" className={selectClass}><option value="draft">draft</option><option value="active">active</option><option value="scheduled">scheduled</option></select></Field>
                                <Field label="Durasi detik"><input name="duration_seconds" type="number" min="1" className={inputClass} /></Field>
                                <Field label="Attempt limit"><input name="attempt_limit" type="number" min="1" className={inputClass} /></Field>
                                <Field label="Token cost"><input name="token_cost" type="number" min="0" defaultValue="0" className={inputClass} /></Field>
                                <Field label="Question order"><select name="question_order" defaultValue="random" className={selectClass}><option value="random">random</option><option value="fixed">fixed</option></select></Field>
                                <input type="hidden" name="result_visibility" value="instant" /><input type="hidden" name="access_type" value="FREE" />
                                <button className={buttonClass}><Save size={16} /> Simpan Exam</button>
                            </form>
                        ) : <p className="font-bold text-gray-500">Tidak memiliki permission exam.manage.</p>}
                    </div>

                    {data.exams.map((exam) => {
                        const examType = examTypeById.get(exam.exam_type_id)
                        const sections = sectionsByExam.get(exam.id) ?? []
                        return (
                            <details key={exam.id} className="border-2 border-gray-900 bg-white p-5 shadow-[4px_4px_0_0_#ccc]">
                                <summary className="cursor-pointer font-black">[{examType?.code ?? '?'}] {exam.title} · {exam.status} · {sections.length} section</summary>
                                {canExams && (
                                    <div className="mt-4 space-y-5">
                                        <form action={saveExamAction} className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                                            <input type="hidden" name="id" value={exam.id} />
                                            <Field label="Tipe"><select name="exam_type_code" defaultValue={examType?.code} className={selectClass}>{data.catalog.examTypes.map((type) => <option key={type.id} value={type.code}>{type.code}</option>)}</select></Field>
                                            <Field label="Judul"><input name="title" defaultValue={exam.title} className={inputClass} /></Field>
                                            <Field label="Slug"><input name="slug" defaultValue={exam.slug} className={inputClass} /></Field>
                                            <Field label="Status"><input name="status" defaultValue={exam.status} className={inputClass} /></Field>
                                            <Field label="Durasi detik"><input name="duration_seconds" type="number" defaultValue={exam.duration_seconds ?? ''} className={inputClass} /></Field>
                                            <Field label="Attempt limit"><input name="attempt_limit" type="number" defaultValue={exam.attempt_limit ?? ''} className={inputClass} /></Field>
                                            <Field label="Token cost"><input name="token_cost" type="number" min="0" defaultValue={exam.token_cost} className={inputClass} /></Field>
                                            <Field label="Question order"><input name="question_order" defaultValue={exam.question_order} className={inputClass} /></Field>
                                            <input type="hidden" name="result_visibility" value={exam.result_visibility} /><input type="hidden" name="access_type" value={exam.access_type} />
                                            <button className={buttonClass}><Save size={15} /> Update Exam</button>
                                        </form>

                                        <div className="border-t-2 border-dashed border-gray-300 pt-4">
                                            <h3 className="mb-3 font-black">Tambah Section</h3>
                                            <form action={saveExamSectionAction} className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                                                <input type="hidden" name="exam_id" value={exam.id} />
                                                <Field label="Subtes"><select name="subject_code" className={selectClass}><option value="">Tanpa subtes</option>{data.catalog.subjects.filter((subject) => ['TWK','TIU','TKP'].includes(subject.code)).map((subject) => <option key={subject.id} value={subject.code}>{subject.code}</option>)}</select></Field>
                                                <Field label="Judul"><input name="title" required className={inputClass} /></Field>
                                                <Field label="Urutan"><input name="sort_order" type="number" defaultValue={sections.length + 1} className={inputClass} /></Field>
                                                <Field label="Jumlah soal"><input name="question_count" type="number" min="1" className={inputClass} /></Field>
                                                <Field label="Passing score"><input name="passing_score" type="number" min="0" className={inputClass} /></Field>
                                                <button className={buttonClass}><Save size={15} /> Tambah Section</button>
                                            </form>
                                            <div className="mt-3 flex flex-wrap gap-2">{sections.map((section) => <span key={section.id} className="border-2 border-gray-300 bg-gray-50 px-3 py-1 text-xs font-bold">{subjectById.get(section.subject_id ?? '')?.code ?? '-'} · {section.question_count ?? 0} soal</span>)}</div>
                                        </div>

                                        <form action={archiveExamAction}><input type="hidden" name="id" value={exam.id} /><button className={dangerClass}><Archive size={14} /> Arsipkan Exam</button></form>
                                    </div>
                                )}
                            </details>
                        )
                    })}
                </section>
            )}

            {tab === 'questions' && (
                <section className="space-y-6">
                    <div className="border-2 border-gray-900 bg-yellow-50 p-5 shadow-[4px_4px_0_0_#111]">
                        <h2 className="mb-2 flex items-center gap-2 text-xl font-black"><FileQuestion /> Tambah Soal</h2>
                        <p className="mb-4 text-sm font-semibold text-gray-600">Format opsi per baris: <code>A|Teks opsi|5|true</code>. Untuk TKP isi skor 1–5; penanda benar boleh dipakai untuk opsi optimal.</p>
                        {canQuestions ? (
                            <form action={saveQuestionAction} className="grid gap-3 lg:grid-cols-2">
                                <Field label="Subtes"><select name="subject_code" className={selectClass}>{data.catalog.subjects.filter((subject) => ['TWK','TIU','TKP'].includes(subject.code)).map((subject) => <option key={subject.id} value={subject.code}>{subject.code}</option>)}</select></Field>
                                <Field label="Difficulty"><select name="difficulty" defaultValue="medium" className={selectClass}><option value="easy">easy</option><option value="medium">medium</option><option value="hard">hard</option></select></Field>
                                <Field label="Status"><select name="status" defaultValue="draft" className={selectClass}><option value="draft">draft</option><option value="published">published</option></select></Field>
                                <Field label="Source reference"><input name="source_reference" className={inputClass} /></Field>
                                <Field label="Pertanyaan"><textarea name="stem" required rows={5} className={inputClass} /></Field>
                                <Field label="Opsi"><textarea name="options" required rows={5} placeholder={'A|Pilihan A|5|true\nB|Pilihan B|0|false'} className={inputClass} /></Field>
                                <button className={buttonClass}><Save size={16} /> Simpan Soal</button>
                            </form>
                        ) : <p className="font-bold text-gray-500">Tidak memiliki permission question.manage.</p>}
                    </div>

                    <div className="space-y-3">
                        {data.questions.map((question) => {
                            const subject = subjectById.get(question.subject_id)
                            const options = optionsByQuestion.get(question.id) ?? []
                            const optionText = options.map((option) => `${option.option_key}|${option.content}|${option.score ?? ''}|${option.is_correct ?? ''}`).join('\n')
                            return (
                                <details key={question.id} className="border-2 border-gray-900 bg-white p-4 shadow-[3px_3px_0_0_#ccc]">
                                    <summary className="cursor-pointer font-bold">{question.question_code} · {subject?.code ?? '?'} · v{question.version} · {question.status} — {question.stem.slice(0, 90)}</summary>
                                    {canQuestions && (
                                        <div className="mt-4 space-y-3">
                                            <form action={saveQuestionAction} className="grid gap-3 lg:grid-cols-2">
                                                <input type="hidden" name="id" value={question.id} />
                                                <Field label="Subtes"><select name="subject_code" defaultValue={subject?.code} className={selectClass}>{data.catalog.subjects.filter((row) => ['TWK','TIU','TKP'].includes(row.code)).map((row) => <option key={row.id} value={row.code}>{row.code}</option>)}</select></Field>
                                                <Field label="Difficulty"><input name="difficulty" defaultValue={question.difficulty} className={inputClass} /></Field>
                                                <Field label="Status"><input name="status" defaultValue={question.status} className={inputClass} /></Field>
                                                <Field label="Alasan perubahan"><input name="change_reason" placeholder="Revisi typo / koreksi kunci" className={inputClass} /></Field>
                                                <Field label="Pertanyaan"><textarea name="stem" rows={5} defaultValue={question.stem} className={inputClass} /></Field>
                                                <Field label="Opsi"><textarea name="options" rows={5} defaultValue={optionText} className={inputClass} /></Field>
                                                <button className={buttonClass}><Save size={15} /> Simpan Versi Baru</button>
                                            </form>
                                            <form action={archiveQuestionAction}><input type="hidden" name="id" value={question.id} /><button className={dangerClass}><Archive size={14} /> Arsipkan Soal</button></form>
                                        </div>
                                    )}
                                </details>
                            )
                        })}
                    </div>
                </section>
            )}

            {tab === 'commerce' && (
                <section className="space-y-6">
                    {!canOrders ? (
                        <div className="border-2 border-gray-900 bg-red-50 p-5 font-bold">Tidak memiliki permission order.read / payment.manage.</div>
                    ) : (
                        <>
                            <div className="grid gap-4 md:grid-cols-3">
                                <div className="border-2 border-gray-900 bg-white p-5 shadow-[4px_4px_0_0_#ccc]"><ShoppingCart /><b className="mt-2 block text-3xl">{data.orders.length}</b><span className="text-sm font-bold text-gray-500">Order terbaru</span></div>
                                <div className="border-2 border-gray-900 bg-white p-5 shadow-[4px_4px_0_0_#ccc]"><CreditCard /><b className="mt-2 block text-3xl">{data.payments.length}</b><span className="text-sm font-bold text-gray-500">Payment terbaru</span></div>
                                <div className="border-2 border-gray-900 bg-white p-5 shadow-[4px_4px_0_0_#ccc]"><Database /><b className="mt-2 block text-3xl">{data.orders.filter((order) => order.status === 'paid').length}</b><span className="text-sm font-bold text-gray-500">Order paid</span></div>
                            </div>
                            <div className="overflow-x-auto border-2 border-gray-900 bg-white shadow-[4px_4px_0_0_#ccc]">
                                <table className="w-full min-w-[850px] text-left text-sm">
                                    <thead className="border-b-2 border-gray-900 bg-gray-100 text-xs uppercase"><tr><th className="p-3">Order</th><th>Status</th><th>Total</th><th>User</th><th>Paid at</th><th>Created</th></tr></thead>
                                    <tbody>{data.orders.map((order) => <tr key={order.id} className="border-b border-gray-200"><td className="p-3 font-bold">{order.order_number}</td><td>{order.status}</td><td>{rupiah(order.total_amount)}</td><td className="font-mono text-xs">{order.user_id.slice(0, 8)}</td><td>{order.paid_at ? localDateTime(order.paid_at) : '-'}</td><td>{localDateTime(order.created_at)}</td></tr>)}</tbody>
                                </table>
                            </div>
                            <div className="overflow-x-auto border-2 border-gray-900 bg-white shadow-[4px_4px_0_0_#ccc]">
                                <table className="w-full min-w-[850px] text-left text-sm">
                                    <thead className="border-b-2 border-gray-900 bg-gray-100 text-xs uppercase"><tr><th className="p-3">Provider</th><th>Status</th><th>Amount</th><th>Order ID</th><th>Method</th><th>Updated</th></tr></thead>
                                    <tbody>{data.payments.map((payment) => <tr key={payment.id} className="border-b border-gray-200"><td className="p-3 font-bold">{payment.provider}</td><td>{payment.status}</td><td>{rupiah(payment.amount)}</td><td className="font-mono text-xs">{payment.order_id.slice(0, 8)}</td><td>{payment.payment_method ?? '-'}</td><td>{localDateTime(payment.updated_at)}</td></tr>)}</tbody>
                                </table>
                            </div>
                        </>
                    )}
                </section>
            )}
        </div>
    )
}
