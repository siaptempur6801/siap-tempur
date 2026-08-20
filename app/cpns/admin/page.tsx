import Link from 'next/link'
import { Archive, CalendarDays, CreditCard, Database, FileQuestion, Package, Save, Settings2 } from 'lucide-react'
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

const TABS = ['products', 'events', 'exams', 'questions', 'commerce'] as const
type TabId = (typeof TABS)[number]
type ViewRow = Record<string, unknown>

type WorkspaceView = {
    catalog: {
        subjects: Array<{ id: string; code: string; name: string }>
        examTypes: Array<{ id: string; code: string; name: string }>
    }
    products: ViewRow[]
    productPrices: ViewRow[]
    productWalletGrants: ViewRow[]
    events: ViewRow[]
    eventProducts: ViewRow[]
    eventSessions: ViewRow[]
    exams: ViewRow[]
    examSections: ViewRow[]
    questions: ViewRow[]
    questionOptions: ViewRow[]
    orders: ViewRow[]
    payments: ViewRow[]
}

function s(value: unknown) { return typeof value === 'string' ? value : value == null ? '' : String(value) }
function n(value: unknown) { const parsed = Number(value ?? 0); return Number.isFinite(parsed) ? parsed : 0 }
function nullable(value: unknown) { const valueString = s(value); return valueString || null }
function localDateTime(value: unknown) {
    const source = s(value)
    if (!source) return ''
    const date = new Date(source)
    if (Number.isNaN(date.getTime())) return ''
    return new Date(date.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 16)
}
function rupiah(value: unknown) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n(value))
}

const input = 'w-full border-2 border-gray-900 bg-white px-3 py-2 text-sm font-semibold outline-none focus:bg-yellow-50'
const button = 'inline-flex items-center justify-center gap-2 border-2 border-gray-900 bg-gray-900 px-4 py-2 text-sm font-black text-white shadow-[3px_3px_0_0_#aaa] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none'
const danger = 'inline-flex items-center gap-2 border-2 border-gray-900 bg-red-100 px-3 py-2 text-xs font-black text-red-800 hover:bg-red-200'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return <label className="space-y-1"><span className="block text-xs font-black uppercase text-gray-500">{label}</span>{children}</label>
}

function Banner({ ok, error }: { ok?: string; error?: string }) {
    if (!ok && !error) return null
    return <div className={cn('border-2 border-gray-900 px-4 py-3 font-bold shadow-[3px_3px_0_0_#111]', error ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800')}>{error || ok}</div>
}

export default async function AdminDashboard({ searchParams }: {
    searchParams: Promise<{ tab?: string; ok?: string; error?: string; edit?: string }>
}) {
    const params = await searchParams
    const tab = (TABS.includes(params.tab as TabId) ? params.tab : 'products') as TabId
    // Some staging-generated DB typings still expose a few canonical rows as unknown.
    // Normalize once at this server-rendered view boundary; mutation services remain typed/validated.
    const data = await adminV2Service.getWorkspaceData() as unknown as WorkspaceView
    const authorization = await authorizationService.getCurrentAuthorization()
    const permissions = new Set(authorization?.permissions ?? [])

    const canProducts = permissions.has(PERMISSIONS.PRODUCT_MANAGE)
    const canEvents = permissions.has(PERMISSIONS.EVENT_MANAGE)
    const canExams = permissions.has(PERMISSIONS.EXAM_MANAGE)
    const canQuestions = permissions.has(PERMISSIONS.QUESTION_MANAGE)
    const canCommerce = permissions.has(PERMISSIONS.ORDER_READ) || permissions.has(PERMISSIONS.PAYMENT_MANAGE)

    const priceByProduct = new Map<string, ViewRow>()
    for (const row of data.productPrices) {
        if (s(row.status).toLowerCase() !== 'active') continue
        const endsAt = nullable(row.ends_at)
        if (endsAt && new Date(endsAt).getTime() < Date.now()) continue
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
        <div className="space-y-6 pb-14">
            <header className="border-2 border-gray-900 bg-white p-6 shadow-[6px_6px_0_0_#111]">
                <span className="inline-flex items-center gap-2 border-2 border-gray-900 bg-yellow-300 px-3 py-1 text-xs font-black uppercase"><Database size={14}/> Schema V2</span>
                <h1 className="mt-3 font-handwriting text-4xl font-black sm:text-5xl">Admin Workspace</h1>
                <p className="mt-2 max-w-3xl font-semibold text-gray-600">Produk, Event, Exam, Bank Soal, Order dan Payment dari tabel canonical. Delete operasional memakai archive agar histori attempt/order tetap aman.</p>
            </header>

            <Banner ok={params.ok} error={params.error} />

            <nav className="flex gap-2 overflow-x-auto pb-1">
                {TABS.map((id) => <Link key={id} href={`/cpns/admin?tab=${id}`} className={cn('shrink-0 border-2 border-gray-900 px-4 py-2 font-black shadow-[3px_3px_0_0_#bbb]', tab === id ? 'bg-gray-900 text-white' : 'bg-white')}>{id}</Link>)}
            </nav>

            {tab === 'products' && (
                <section className="space-y-5">
                    <div className="border-2 border-gray-900 bg-indigo-50 p-5 shadow-[4px_4px_0_0_#111]">
                        <h2 className="mb-1 flex items-center gap-2 text-xl font-black"><Package/> {editedProduct ? 'Edit Produk' : 'Tambah Produk'}</h2>
                        {editedProduct && <p className="mb-4 text-sm font-semibold text-gray-600">Semua field di bawah memuat nilai terakhir dari database. Ubah hanya yang memang perlu diubah.</p>}
                        {canProducts ? <form key={editedProduct ? `product-${s(editedProduct.id)}-${s(editedProduct.updated_at)}` : 'product-new'} action={saveProductAction} className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                            {editedProduct && <input type="hidden" name="id" value={s(editedProduct.id)} />}
                            <Field label="Kode"><input className={input} name="code" required defaultValue={s(editedProduct?.code)} placeholder="CPNS_TOKEN_20" /></Field>
                            <Field label="Nama"><input className={input} name="name" required defaultValue={s(editedProduct?.name)} /></Field>
                            <Field label="Jenis"><select className={input} name="product_type" defaultValue={s(editedProduct?.product_type) || 'TOKEN_PACK'}><option>TOKEN_PACK</option><option>PASS</option><option>EVENT_TICKET</option></select></Field>
                            <Field label="Status"><select className={input} name="status" defaultValue={s(editedProduct?.status) || 'draft'}><option value="draft">draft</option><option value="active">active</option><option value="archived">archived</option></select></Field>
                            <Field label="Harga"><input className={input} name="price" type="number" min="0" defaultValue={editedProductPrice ? s(editedProductPrice.amount) : ''} placeholder="10000" /></Field>
                            <input type="hidden" name="current_price" value={editedProductPrice ? s(editedProductPrice.amount) : ''}/>
                            <Field label="Token Grant"><input className={input} name="token_grant" type="number" min="0" defaultValue={editedProduct ? grantByProduct.get(s(editedProduct.id)) ?? 0 : ''} /></Field>
                            <Field label="Durasi hari"><input className={input} name="duration_days" type="number" min="1" defaultValue={s(editedProduct?.duration_days)} /></Field>
                            <Field label="Deskripsi"><input className={input} name="description" defaultValue={s(editedProduct?.description)} /></Field>
                            <input type="hidden" name="currency" value="IDR" />
                            <button className={button}><Save size={16}/>{editedProduct ? 'Simpan Perubahan' : 'Simpan'}</button>
                            {editedProduct && <Link className="px-3 py-2 text-sm font-bold underline" href="/cpns/admin?tab=products">Selesai edit</Link>}
                        </form> : <p className="font-bold text-gray-500">Tidak memiliki product.manage.</p>}
                    </div>
                    <div className="grid gap-3 lg:grid-cols-2">{data.products.map((row) => {
                        const id = s(row.id); const price = priceByProduct.get(id)
                        return <div key={id} className="border-2 border-gray-900 bg-white p-4 shadow-[3px_3px_0_0_#ccc]"><b>{s(row.code)} · {s(row.name)}</b><p className="mt-1 text-sm text-gray-600">{s(row.product_type)} · {s(row.status)} · {price ? rupiah(price.amount) : 'tanpa harga'} · grant {grantByProduct.get(id) ?? 0}</p>{canProducts && <div className="mt-3 flex gap-2"><Link className={button} href={`/cpns/admin?tab=products&edit=${id}`}>Edit</Link><form action={archiveProductAction}><input type="hidden" name="id" value={id}/><button className={danger}><Archive size={14}/>Archive</button></form></div>}</div>
                    })}</div>
                </section>
            )}

            {tab === 'events' && (
                <section className="space-y-5">
                    <div className="border-2 border-gray-900 bg-green-50 p-5 shadow-[4px_4px_0_0_#111]">
                        <h2 className="mb-4 flex items-center gap-2 text-xl font-black"><CalendarDays/> {editedEvent ? 'Edit Event' : 'Buat Tryout Akbar'}</h2>
                        {canEvents ? <form key={editedEvent ? `event-${s(editedEvent.id)}-${s(editedEvent.status)}-${s(editedEvent.starts_at)}-${s(editedEvent.ends_at)}` : 'event-new'} action={saveEventAction} className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                            {editedEvent && <input type="hidden" name="id" value={s(editedEvent.id)}/>}<Field label="Kode"><input className={input} name="code" required defaultValue={s(editedEvent?.code)}/></Field><Field label="Judul"><input className={input} name="title" required defaultValue={s(editedEvent?.title)}/></Field><Field label="Slug"><input className={input} name="slug" defaultValue={s(editedEvent?.slug)}/></Field><Field label="Status"><select className={input} name="status" defaultValue={s(editedEvent?.status)||'draft'}><option>draft</option><option>scheduled</option><option>live</option><option>closed</option><option>archived</option></select></Field><Field label="Registrasi mulai"><input className={input} type="datetime-local" name="registration_start" defaultValue={localDateTime(editedEvent?.registration_start)}/></Field><Field label="Registrasi selesai"><input className={input} type="datetime-local" name="registration_end" defaultValue={localDateTime(editedEvent?.registration_end)}/></Field><Field label="Mulai"><input className={input} required type="datetime-local" name="starts_at" defaultValue={localDateTime(editedEvent?.starts_at)}/></Field><Field label="Selesai"><input className={input} required type="datetime-local" name="ends_at" defaultValue={localDateTime(editedEvent?.ends_at)}/></Field><Field label="Deskripsi"><input className={input} name="description" defaultValue={s(editedEvent?.description)}/></Field><button className={button}><Save size={16}/>{editedEvent?'Simpan Perubahan':'Simpan'}</button>
                        </form> : <p className="font-bold text-gray-500">Tidak memiliki event.manage.</p>}
                    </div>
                    {data.events.map((row) => { const id=s(row.id); const sessions=sessionsFor(id); return <div key={id} className="border-2 border-gray-900 bg-white p-4 shadow-[3px_3px_0_0_#ccc]"><b>{s(row.code)} · {s(row.title)} · {s(row.status)}</b><p className="text-sm text-gray-600">{sessions.length} sesi · {localDateTime(row.starts_at)} → {localDateTime(row.ends_at)}</p>{canEvents && <><div className="mt-3 flex gap-2"><Link className={button} href={`/cpns/admin?tab=events&edit=${id}`}>Edit</Link><form action={archiveEventAction}><input type="hidden" name="id" value={id}/><button className={danger}><Archive size={14}/>Archive</button></form></div><details className="mt-4 border-t-2 border-dashed border-gray-300 pt-3"><summary className="cursor-pointer font-black">Kelola sesi & tiket</summary><form action={saveEventSessionAction} className="mt-3 grid gap-2 md:grid-cols-3"><input type="hidden" name="event_id" value={id}/><Field label="Nama sesi"><input className={input} name="name" required/></Field><Field label="Exam EVENT"><select className={input} name="exam_id">{data.exams.filter((exam)=>examTypeById.get(s(exam.exam_type_id))?.code==='EVENT').map((exam)=><option key={s(exam.id)} value={s(exam.id)}>{s(exam.title)}</option>)}</select></Field><Field label="Mulai"><input className={input} type="datetime-local" name="starts_at" defaultValue={localDateTime(row.starts_at)}/></Field><Field label="Selesai"><input className={input} type="datetime-local" name="ends_at" defaultValue={localDateTime(row.ends_at)}/></Field><Field label="Kapasitas"><input className={input} type="number" min="1" name="capacity"/></Field><Field label="Status"><select className={input} name="status"><option>scheduled</option><option>live</option><option>closed</option></select></Field><button className={button}>Tambah Sesi</button></form>{sessions.length>0 && <form action={linkEventProductAction} className="mt-4 grid gap-2 md:grid-cols-3"><input type="hidden" name="event_id" value={id}/><Field label="Sesi"><select className={input} name="session_id">{sessions.map((session)=><option key={s(session.id)} value={s(session.id)}>{s(session.name)}</option>)}</select></Field><Field label="Produk tiket"><select className={input} name="product_id">{data.products.filter((product)=>s(product.product_type)==='EVENT_TICKET').map((product)=><option key={s(product.id)} value={s(product.id)}>{s(product.code)} · {s(product.name)}</option>)}</select></Field><input type="hidden" name="status" value="active"/><button className={button}>Hubungkan Tiket</button></form>}</details></>}</div>})}
                </section>
            )}

            {tab === 'exams' && (
                <section className="space-y-5">
                    <div className="border-2 border-gray-900 bg-orange-50 p-5 shadow-[4px_4px_0_0_#111]">
                        <h2 className="mb-4 flex items-center gap-2 text-xl font-black"><Settings2/> {editedExam ? 'Edit Exam' : 'Buat Exam'}</h2>
                        {canExams ? <form key={editedExam ? `exam-${s(editedExam.id)}-${s(editedExam.updated_at)}` : 'exam-new'} action={saveExamAction} className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">{editedExam&&<input type="hidden" name="id" value={s(editedExam.id)}/>}<Field label="Tipe"><select className={input} name="exam_type_code" defaultValue={examTypeById.get(s(editedExam?.exam_type_id))?.code}>{data.catalog.examTypes.map((type)=><option key={type.id} value={type.code}>{type.code}</option>)}</select></Field><Field label="Judul"><input className={input} name="title" required defaultValue={s(editedExam?.title)}/></Field><Field label="Slug"><input className={input} name="slug" defaultValue={s(editedExam?.slug)}/></Field><Field label="Status"><select className={input} name="status" defaultValue={s(editedExam?.status)||'draft'}><option>draft</option><option>active</option><option>scheduled</option><option>archived</option></select></Field><Field label="Durasi detik"><input className={input} name="duration_seconds" type="number" min="1" defaultValue={s(editedExam?.duration_seconds)}/></Field><Field label="Attempt limit"><input className={input} name="attempt_limit" type="number" min="1" defaultValue={s(editedExam?.attempt_limit)}/></Field><Field label="Token cost"><input className={input} name="token_cost" type="number" min="0" defaultValue={s(editedExam?.token_cost)||'0'}/></Field><Field label="Order"><select className={input} name="question_order" defaultValue={s(editedExam?.question_order)||'random'}><option>random</option><option>fixed</option></select></Field><input type="hidden" name="result_visibility" value={s(editedExam?.result_visibility)||'instant'}/><input type="hidden" name="access_type" value={s(editedExam?.access_type)||'FREE'}/><button className={button}><Save size={16}/>{editedExam?'Simpan Perubahan':'Simpan'}</button></form>:<p className="font-bold text-gray-500">Tidak memiliki exam.manage.</p>}
                    </div>
                    {data.exams.map((row)=>{const id=s(row.id);const sections=sectionsFor(id);return <div key={id} className="border-2 border-gray-900 bg-white p-4 shadow-[3px_3px_0_0_#ccc]"><b>[{examTypeById.get(s(row.exam_type_id))?.code??'?'}] {s(row.title)} · {s(row.status)}</b><p className="text-sm text-gray-600">{sections.length} section · token {s(row.token_cost)}</p>{canExams&&<><div className="mt-3 flex gap-2"><Link className={button} href={`/cpns/admin?tab=exams&edit=${id}`}>Edit</Link><form action={archiveExamAction}><input type="hidden" name="id" value={id}/><button className={danger}><Archive size={14}/>Archive</button></form></div><details className="mt-4 border-t-2 border-dashed border-gray-300 pt-3"><summary className="cursor-pointer font-black">Tambah section</summary><form action={saveExamSectionAction} className="mt-3 grid gap-2 md:grid-cols-3"><input type="hidden" name="exam_id" value={id}/><Field label="Subtes"><select className={input} name="subject_code"><option value="">Tanpa subtes</option>{data.catalog.subjects.filter((subject)=>['TWK','TIU','TKP'].includes(subject.code)).map((subject)=><option key={subject.id} value={subject.code}>{subject.code}</option>)}</select></Field><Field label="Judul"><input className={input} name="title" required/></Field><Field label="Urutan"><input className={input} name="sort_order" type="number" defaultValue={sections.length+1}/></Field><Field label="Jumlah soal"><input className={input} name="question_count" type="number" min="1"/></Field><Field label="Passing score"><input className={input} name="passing_score" type="number" min="0"/></Field><button className={button}>Tambah Section</button></form><div className="mt-2 text-xs font-bold text-gray-600">{sections.map((section)=>`${subjectById.get(s(section.subject_id))?.code??'-'}:${s(section.question_count)}`).join(' · ')}</div></details></>}</div>})}
                </section>
            )}

            {tab === 'questions' && (
                <section className="space-y-5">
                    <div className="border-2 border-gray-900 bg-yellow-50 p-5 shadow-[4px_4px_0_0_#111]">
                        <h2 className="mb-2 flex items-center gap-2 text-xl font-black"><FileQuestion/> {editedQuestion ? 'Edit Soal' : 'Tambah Soal'}</h2><p className="mb-4 text-sm font-semibold text-gray-600">Opsi per baris: A|Teks|5|true. Edit answer key diblok jika ada attempt aktif yang memakai soal.</p>
                        {canQuestions ? <form key={editedQuestion ? `question-${s(editedQuestion.id)}-${s(editedQuestion.updated_at)}-${s(editedQuestion.version)}` : 'question-new'} action={saveQuestionAction} className="grid gap-3 lg:grid-cols-2">{editedQuestion&&<input type="hidden" name="id" value={s(editedQuestion.id)}/>}<Field label="Subtes"><select className={input} name="subject_code" defaultValue={subjectById.get(s(editedQuestion?.subject_id))?.code}>{data.catalog.subjects.filter((subject)=>['TWK','TIU','TKP'].includes(subject.code)).map((subject)=><option key={subject.id} value={subject.code}>{subject.code}</option>)}</select></Field><Field label="Difficulty"><select className={input} name="difficulty" defaultValue={s(editedQuestion?.difficulty)||'medium'}><option>easy</option><option>medium</option><option>hard</option></select></Field><Field label="Status"><select className={input} name="status" defaultValue={s(editedQuestion?.status)||'draft'}><option>draft</option><option>published</option><option>archived</option></select></Field><Field label="Alasan perubahan"><input className={input} name="change_reason" placeholder="Koreksi typo/kunci"/></Field><Field label="Pertanyaan"><textarea className={input} name="stem" required rows={5} defaultValue={s(editedQuestion?.stem)}/></Field><Field label="Opsi"><textarea className={input} name="options" required={!editedQuestion} rows={5} defaultValue={editedQuestion?optionsFor(s(editedQuestion.id)).map((option)=>`${s(option.option_key)}|${s(option.content)}|${s(option.score)}|${s(option.is_correct)}`).join('\n'):''} placeholder={'A|Pilihan A|5|true\nB|Pilihan B|0|false'}/></Field><button className={button}><Save size={16}/>{editedQuestion?'Simpan Versi Baru':'Tambah Soal'}</button></form>:<p className="font-bold text-gray-500">Tidak memiliki question.manage.</p>}
                    </div>
                    <div className="space-y-2">{data.questions.map((row)=>{const id=s(row.id);return <div key={id} className="border-2 border-gray-900 bg-white p-3 shadow-[2px_2px_0_0_#ccc]"><b>{s(row.question_code)} · {subjectById.get(s(row.subject_id))?.code??'?'} · v{s(row.version)} · {s(row.status)}</b><p className="mt-1 line-clamp-2 text-sm text-gray-600">{s(row.stem)}</p>{canQuestions&&<div className="mt-2 flex gap-2"><Link className={button} href={`/cpns/admin?tab=questions&edit=${id}`}>Edit</Link><form action={archiveQuestionAction}><input type="hidden" name="id" value={id}/><button className={danger}><Archive size={14}/>Archive</button></form></div>}</div>})}</div>
                </section>
            )}

            {tab === 'commerce' && (
                <section className="space-y-5">{!canCommerce?<div className="border-2 border-gray-900 bg-red-50 p-5 font-bold">Tidak memiliki order.read/payment.manage.</div>:<><div className="grid gap-3 md:grid-cols-3"><div className="border-2 border-gray-900 bg-white p-4"><b className="text-3xl">{data.orders.length}</b><p>Order terbaru</p></div><div className="border-2 border-gray-900 bg-white p-4"><b className="text-3xl">{data.payments.length}</b><p>Payment terbaru</p></div><div className="border-2 border-gray-900 bg-white p-4"><b className="text-3xl">{data.orders.filter((row)=>s(row.status)==='paid').length}</b><p>Paid</p></div></div><div className="overflow-x-auto border-2 border-gray-900 bg-white"><table className="w-full min-w-[800px] text-left text-sm"><thead className="bg-gray-100"><tr><th className="p-3">Order</th><th>Status</th><th>Total</th><th>User</th><th>Created</th></tr></thead><tbody>{data.orders.map((row)=><tr key={s(row.id)} className="border-t"><td className="p-3 font-bold">{s(row.order_number)}</td><td>{s(row.status)}</td><td>{rupiah(row.total_amount)}</td><td className="font-mono">{s(row.user_id).slice(0,8)}</td><td>{localDateTime(row.created_at)}</td></tr>)}</tbody></table></div><div className="overflow-x-auto border-2 border-gray-900 bg-white"><table className="w-full min-w-[800px] text-left text-sm"><thead className="bg-gray-100"><tr><th className="p-3">Provider</th><th>Status</th><th>Amount</th><th>Order</th><th>Method</th></tr></thead><tbody>{data.payments.map((row)=><tr key={s(row.id)} className="border-t"><td className="p-3 font-bold">{s(row.provider)}</td><td>{s(row.status)}</td><td>{rupiah(row.amount)}</td><td className="font-mono">{s(row.order_id).slice(0,8)}</td><td>{s(row.payment_method)||'-'}</td></tr>)}</tbody></table></div></>}</section>
            )}
        </div>
    )
}
