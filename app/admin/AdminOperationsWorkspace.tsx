import Link from 'next/link'
import { Archive, CheckCircle2, CreditCard, Package, Save } from 'lucide-react'
import { getServerNowMs } from '@/lib/server/time'
import {
    ADMIN_OPERATIONS_PAGE_COPY,
    ADMIN_OPERATIONS_PAGE_SECTIONS,
    ADMIN_OPERATIONS_PERMISSIONS,
    ADMIN_OPERATIONS_ROUTES,
    type AdminOperationsMode,
} from '@/lib/admin-operations'
import QuestionBankEditorModal from '@/components/admin/QuestionBankEditorModal'
import { adminStatusLabel, formatDateTime, formatLocalDateTimeInput, formatRupiah } from '@/lib/admin-format'
import { adminPageHref, adminPageSummary, adminPageSummaryLabel, parseAdminPage } from '@/lib/admin-pagination'
import { isLegacyHistoryPlaceholder } from '@/lib/question-source'
import { adminV2Service } from '@/src/services/admin-v2.service'
import { authorizationService } from '@/src/services/authorization.service'
import { PERMISSIONS } from '@/src/auth/permissions'
import {
    archiveEventAction,
    archiveProductAction,
    linkEventProductAction,
    saveEventAction,
    saveEventSessionAction,
    saveProductAction,
} from '@/app/actions/admin-v2'
import AdminModal from '@/components/admin/AdminModal'
import ConfirmSubmit from '@/components/admin/ConfirmSubmit'
import AdminListToolbar from '@/components/admin/AdminListToolbar'
import AdminPagination from '@/components/admin/AdminPagination'
import EventFlyerField from '@/components/admin/EventFlyerField'
import {
    AdminBadge,
    AdminCard,
    AdminEmptyState,
    AdminField,
    AdminFeedbackBanner,
    AdminHint,
    AdminMetric,
    AdminPage,
    AdminPageHeader,
    AdminSectionHeading,
    AdminStatusBadge,
    AdminTh,
    adminTableHeadClass,
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
    /** Nomor halaman daftar (S6). */
    page?: string
    /** Kata kunci pencarian di sisi database (S7). */
    q?: string
    /** Filter status daftar (S7). */
    status?: string
    /** Filter mapel pada Question Bank (S7). */
    subject?: string
}

function s(value: unknown) { return typeof value === 'string' ? value : value == null ? '' : String(value) }
function n(value: unknown) { const parsed = Number(value ?? 0); return Number.isFinite(parsed) ? parsed : 0 }
function nullable(value: unknown) { const valueString = s(value); return valueString || null }
function lower(value: unknown) { return s(value).toLowerCase() }

/** Bentuk UUID — dipakai sebagai penjaga sebelum id dari URL menyentuh query. */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function isUuid(value: string) { return UUID_PATTERN.test(value) }

function workspaceHref(mode: AdminOperationsMode, program: string, track: string, edit?: string) {
    const query = new URLSearchParams({ program, track })
    if (edit) query.set('edit', edit)
    return `${ADMIN_OPERATIONS_ROUTES[mode]}?${query.toString()}`
}

function ContextFields({ program, track }: { program: string; track: string }) {
    return <><input type="hidden" name="program_code" value={program}/><input type="hidden" name="track_code" value={track}/></>
}

function PermissionEmpty({ permission }: { permission: string }) {
    return <AdminCard><AdminEmptyState title="Akses tidak tersedia" description={`Akun ini tidak memiliki permission ${permission}.`}/></AdminCard>
}

/**
 * Nilai status yang ditawarkan per domain.
 *
 * Ditulis eksplisit, bukan diturunkan dari baris yang sedang tampil: kalau
 * diturunkan, filter hanya bisa memilih status yang kebetulan ada di halaman
 * ini — persis kebalikan dari gunanya filter.
 */
const DOMAIN_STATUS_OPTIONS: Record<'products' | 'events' | 'questions', ReadonlyArray<{ value: string; label: string }>> = {
    products: [
        { value: 'DRAFT', label: 'Draf' },
        { value: 'ACTIVE', label: 'Aktif' },
        { value: 'ARCHIVED', label: 'Diarsipkan' },
    ],
    events: [
        { value: 'draft', label: 'Draf' },
        { value: 'scheduled', label: 'Terjadwal' },
        { value: 'live', label: 'Berlangsung' },
        { value: 'closed', label: 'Selesai' },
        { value: 'archived', label: 'Diarsipkan' },
    ],
    questions: [
        { value: 'draft', label: 'Draf' },
        { value: 'published', label: 'Terbit' },
        { value: 'archived', label: 'Diarsipkan' },
        ...['submitted', 'editorial_review', 'academic_review', 'technical_qa', 'revision_required', 'approved', 'rejected'].map((value) => ({ value, label: value === 'submitted' ? 'Diajukan' : adminStatusLabel(value) })),
    ],
}

/** Alur kerja per mode — dirender sebagai panduan bernomor di header halaman. */
const ADMIN_OPERATIONS_WORKFLOW: Record<AdminOperationsMode, string[]> = {
    products: ['Buat product & tentukan harganya', 'Tetapkan jumlah token yang diberikan', 'Ubah status ke Aktif saat siap dijual'],
    events: ['Buat event & jadwalkan pelaksanaannya', 'Tambahkan sesi ujian per event', 'Hubungkan tiket product bila berbayar'],
    questions: ['Tulis soal dan pembahasan', 'Simpan draf & ajukan review', 'Terbitkan setelah disetujui'],
    commerce: ['Cek order terbaru', 'Cocokkan status payment per order', 'Telusuri order bermasalah lewat audit'],
}

/**
 * Jendela event yang dimuat `getWorkspaceData` `getWorkspaceData` (lihat `.limit(50)` di service).
 *
 * Dipakai untuk menyatakan cap secara eksplisit alih-alih menampilkan 50 baris
 * seolah itu seluruhnya.
 */
const EVENTS_WINDOW = 50

/** Placeholder pencarian per domain, memakai istilah yang dikenali admin. */
const DOMAIN_SEARCH_PLACEHOLDER = {
    products: 'Cari kode atau nama produk…',
    events: 'Cari kode atau judul event…',
    questions: 'Cari kode soal atau isi pertanyaan…',
} as const

/**
 * Keadaan daftar ketika nomor halaman di URL melewati jumlah baris.
 *
 * Dulu ini merender halaman tanpa heading sama sekali — terlihat seperti
 * kerusakan, padahal hanya nomor halaman yang terlalu jauh (CPNS/SKD punya 7
 * product, jadi `?page=2` sudah di luar jangkauan). `redirect()` TIDAK dipakai di
 * sini: di dalam server component yang di-stream ia menghasilkan shell kosong
 * tanpa heading, yaitu masalah yang sama dengan bentuk berbeda.
 */
function PageOutOfRange({ lastPage, href, noun }: { lastPage: number; href: string; noun: string }) {
    return (
        <AdminEmptyState
            title={`Tidak ada ${noun} di halaman ini`}
            description={`Daftar hanya punya ${lastPage} halaman. Nomor halaman di alamat mungkin sudah usang — buka halaman terakhir untuk melihat ${noun} terbaru.`}
            action={<Link className={adminSecondaryButtonClass} href={href}>Ke halaman {lastPage}</Link>}
        />
    )
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
            <AdminPage>
                <AdminPageHeader title={ADMIN_OPERATIONS_PAGE_COPY[mode].title} description={ADMIN_OPERATIONS_PAGE_COPY[mode].description}/>
                <PermissionEmpty permission={allowed.join(' atau ')}/>
            </AdminPage>
        )
    }

    const workspace = await adminV2Service.getWorkspaceData(requestedContext, ADMIN_OPERATIONS_PAGE_SECTIONS[mode]) as unknown as WorkspaceView
    const program = workspace.catalog.program.code
    const track = workspace.catalog.track.code
    const nowMs = getServerNowMs()

    const canProducts = permissions.has(PERMISSIONS.PRODUCT_MANAGE)
    const canEvents = permissions.has(PERMISSIONS.EVENT_MANAGE)
    const canQuestions = permissions.has(PERMISSIONS.QUESTION_MANAGE)
    const canCommerce = permissions.has(PERMISSIONS.ORDER_READ) || permissions.has(PERMISSIONS.PAYMENT_MANAGE)

    const domainFilters = { search: params.q || null, status: params.status || null, subject: params.subject || null, page: parseAdminPage(params.page) }
    /** Mode yang daftarnya dibaca langsung dari database, bukan dari workspace. */
    const isPaginatedDomain = (value: AdminOperationsMode): value is 'products' | 'questions' =>
        value === 'products' || value === 'questions'

    /**
     * Domain berhalaman membaca langsung dari database (S6/S7): pencarian dan
     * `total` dihitung di sana, bukan atas baris yang sudah terpotong. Domain
     * lain tetap memakai data workspace.
     */
    const domainPage = isPaginatedDomain(mode)
        ? await adminV2Service.listDomainPage(mode, { context: requestedContext, ...domainFilters })
        : null

    const products = domainPage && mode === 'products' ? domainPage.rows : workspace.products
    const questions = domainPage && mode === 'questions' ? domainPage.rows : workspace.questions
    const events = workspace.events

    /**
     * Pencarian & filter untuk domain yang BELUM berhalaman.
     *
     * `getWorkspaceData` memuat jendela tetap (event 50, product 50), dan UI
     * tidak pernah mengatakannya. Untuk events, filter di sini berlaku atas
     * jendela itu — bukan seluruh tabel — jadi `eventsCapped` wajib
     * ditampilkan agar admin tidak menyimpulkan "tidak ada" dari jawaban yang
     * sebenarnya "tidak ada di 50 terbaru".
     *
     * Product dan soal tidak lagi punya masalah ini: keduanya membaca langsung
     * dari database lewat `listDomainPage`.
     */
    const eventsCapped = events.length >= EVENTS_WINDOW
    const normalizedStatus = (params.status || '').toLowerCase()
    const normalizedQuery = (params.q || '').trim().toLowerCase()
    const filteredEvents = events.filter((row) => {
        if (normalizedStatus && lower(row.status) !== normalizedStatus) return false
        if (!normalizedQuery) return true
        return [row.code, row.title, row.slug].some((value) => lower(value).includes(normalizedQuery))
    })

    /**
     * Baris yang sedang diedit.
     *
     * `?edit=` dibawa oleh tautan Edit dari baris yang terlihat, jadi biasanya
     * sudah ada di halaman ini. Pengambilan khusus hanya untuk kasus nomor
     * halaman dirapikan (mis. `?edit=X&page=999`), supaya formulir tidak diam-
     * diam menyimpan sebagai **baris baru** hanya karena barisnya tidak termuat.
     */
    const editedId = params.edit || ''
    const domainRows = mode === 'products' ? products : mode === 'questions' ? questions : []
    const editedRow = editedId ? domainRows.find((row) => s(row.id) === editedId) : undefined
    // Hanya id berbentuk UUID yang boleh masuk ke query. `?edit=` berasal dari
    // URL dan bisa berisi apa saja; PostgREST menolak `uuid = 'apa-saja'` dengan
    // 400, dan kegagalannya menjatuhkan SELURUH halaman ke error boundary —
    // bukan sekadar mengembalikan nol baris.
    const editFallback = (isUuid(editedId) && isPaginatedDomain(mode) && !editedRow)
        ? (await adminV2Service.listDomainPage(mode, { context: requestedContext, id: editedId })).rows[0]
        : undefined

    const editedProduct = mode === 'products' ? (editedRow ?? editFallback) : undefined
    /**
     * Soal yang sedang diedit — hanya id valid yang benar-benar ditemukan.
     *
     * Katalog editor (stimulus + materi; terukur ~24 kB konten stimulus per track
     * SD/SMP) TIDAK
     * dimuat di sini lagi: `QuestionBankEditorModal` memuatnya saat modal dibuka,
     * sehingga halaman daftar tidak membayar payload itu.
     */
    const editingQuestionId = mode === 'questions' && (editedRow ?? editFallback) ? editedId : ''
    const missingQuestion = mode === 'questions' && Boolean(editedId) && !editingQuestionId
    const editedEvent = mode === 'events' ? events.find((row) => s(row.id) === editedId) : undefined

    const activeFilters = { program, track, q: params.q || '', status: params.status || '', subject: params.subject || '' }
    const pathname = ADMIN_OPERATIONS_ROUTES[mode]

    const pageSummary = domainPage
        ? adminPageSummary(domainPage.clampTo ?? domainFilters.page, domainPage.rows.length, domainPage.total)
        : null
    /** Nomor halaman di URL melewati jumlah baris — daftar kosong, bukan error. */
    const pageOutOfRange = Boolean(domainPage?.clampTo)

    const relatedFilters = domainPage && mode === 'products'
        ? { productIds: products.map((row) => s(row.id)), questionIds: [] as string[] }
        : domainPage && mode === 'questions'
            ? { productIds: [] as string[], questionIds: [] as string[] }
            : null
    const priceRows = relatedFilters ? await adminV2Service.listProductPrices(relatedFilters.productIds) : []
    const grantRows = relatedFilters ? await adminV2Service.listProductWalletGrants(relatedFilters.productIds) : []

    const priceByProduct = new Map<string, ViewRow>()
    for (const row of [...priceRows, ...workspace.productPrices]) {
        if (lower(row.status) !== 'active') continue
        const endsAt = nullable(row.ends_at)
        if (endsAt && new Date(endsAt).getTime() < nowMs) continue
        const id = s(row.product_id)
        if (!priceByProduct.has(id)) priceByProduct.set(id, row)
    }

    const grantByProduct = new Map([...workspace.productWalletGrants, ...grantRows].map((row) => [s(row.product_id), n(row.amount)]))
    const subjectById = new Map(workspace.catalog.subjects.map((row) => [row.id, row]))
    const examTypeById = new Map(workspace.catalog.examTypes.map((row) => [row.id, row]))
    const sessionsFor = (eventId: string) => workspace.eventSessions.filter((row) => s(row.event_id) === eventId)

    const editedProductPrice = editedProduct ? priceByProduct.get(s(editedProduct.id)) : undefined
    const returnFilters = { ...activeFilters, page: params.page || '1' }
    const closeHref = mode === 'questions' ? `${pathname}?${new URLSearchParams(returnFilters)}` : workspaceHref(mode, program, track)

    /**
     * Tautan "Edit" yang mempertahankan halaman dan filter.
     *
     * Tanpa `page`/`q`/`status`, membuka detail dari halaman 5 lalu menyimpan
     * akan melempar admin kembali ke halaman 1 — kehilangan konteks kerja, hal
     * yang dilarang `docs/ADMIN_UI_UX_STANDARD.md` §6.
     */
    const editHref = (targetMode: AdminOperationsMode, id: string) => {
        const query = new URLSearchParams({ program, track, edit: id })
        if (params.page) query.set('page', params.page)
        if (params.q) query.set('q', params.q)
        if (params.status) query.set('status', params.status)
        if (params.subject) query.set('subject', params.subject)
        return `${ADMIN_OPERATIONS_ROUTES[targetMode]}?${query.toString()}`
    }

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
                    <AdminField label="Kode"><input className={adminInputClass} name="code" required defaultValue={s(editedProduct?.code)} placeholder={`${program}_${track}_PRODUCT`}/></AdminField>
                    <AdminField label="Nama"><input className={adminInputClass} name="name" required defaultValue={s(editedProduct?.name)}/></AdminField>
                    <AdminField label="Jenis"><select className={adminInputClass} name="product_type" defaultValue={s(editedProduct?.product_type) || 'PASS'}><option>TOKEN_PACK</option><option>PASS</option><option>EVENT_TICKET</option></select></AdminField>
                    <AdminField label="Status"><select className={adminInputClass} name="status" defaultValue={s(editedProduct?.status) || 'DRAFT'}><option value="DRAFT">Draft</option><option value="ACTIVE">Active</option><option value="ARCHIVED">Archived</option></select></AdminField>
                    <AdminField label="Harga"><input className={adminInputClass} name="price" type="number" min="0" defaultValue={editedProductPrice ? s(editedProductPrice.amount) : ''}/></AdminField>
                    <input type="hidden" name="current_price" value={editedProductPrice ? s(editedProductPrice.amount) : ''}/>
                    <AdminField label="Token grant"><input className={adminInputClass} name="token_grant" type="number" min="0" defaultValue={editedProduct ? grantByProduct.get(s(editedProduct.id)) ?? 0 : ''}/></AdminField>
                    <AdminField label="Durasi hari"><input className={adminInputClass} name="duration_days" type="number" min="1" defaultValue={s(editedProduct?.duration_days)}/></AdminField>
                    <AdminField label="Deskripsi"><input className={adminInputClass} name="description" defaultValue={s(editedProduct?.description)}/></AdminField>
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
                    <AdminField label="Kode"><input className={adminInputClass} name="code" required defaultValue={s(editedEvent?.code)}/></AdminField>
                    <AdminField label="Judul"><input className={adminInputClass} name="title" required defaultValue={s(editedEvent?.title)}/></AdminField>
                    <AdminField label="Slug"><input className={adminInputClass} name="slug" defaultValue={s(editedEvent?.slug)}/></AdminField>
                    <AdminField label="Status"><select className={adminInputClass} name="status" defaultValue={s(editedEvent?.status)||'draft'}><option>draft</option><option>scheduled</option><option>live</option><option>closed</option><option>archived</option></select></AdminField>
                    <AdminField label="Registrasi mulai"><input className={adminInputClass} type="datetime-local" name="registration_start" defaultValue={formatLocalDateTimeInput(editedEvent?.registration_start)}/></AdminField>
                    <AdminField label="Registrasi selesai"><input className={adminInputClass} type="datetime-local" name="registration_end" defaultValue={formatLocalDateTimeInput(editedEvent?.registration_end)}/></AdminField>
                    <AdminField label="Mulai"><input className={adminInputClass} required type="datetime-local" name="starts_at" defaultValue={formatLocalDateTimeInput(editedEvent?.starts_at)}/></AdminField>
                    <AdminField label="Selesai"><input className={adminInputClass} required type="datetime-local" name="ends_at" defaultValue={formatLocalDateTimeInput(editedEvent?.ends_at)}/></AdminField>
                    <AdminField label="Deskripsi" className="md:col-span-2"><input className={adminInputClass} name="description" defaultValue={s(editedEvent?.description)}/></AdminField>
                    <EventFlyerField defaultValue={nullable(editedEvent?.flyer_image_url)}/>
                    <div className="md:col-span-2 flex justify-end border-t border-slate-100 pt-4"><button className={adminPrimaryButtonClass}><Save size={16}/>{editedEvent ? 'Simpan perubahan' : 'Simpan event'}</button></div>
                </form>
            </AdminModal>
        )
    }

    if (mode === 'questions' && canQuestions) {
        pageAction = (
            <QuestionBankEditorModal
                program={program}
                track={track}
                editId={editingQuestionId}
                subjects={workspace.catalog.subjects}
                returnFilters={returnFilters}
                closeHref={closeHref}
                canPublish={permissions.has(PERMISSIONS.CONTENT_PUBLISH)}
            />
        )
    }

    return (
        <AdminPage>
            <AdminPageHeader
                title={ADMIN_OPERATIONS_PAGE_COPY[mode].title}
                description={`${ADMIN_OPERATIONS_PAGE_COPY[mode].description} Context aktif: ${workspace.catalog.program.name} / ${workspace.catalog.track.name}.`}
                steps={ADMIN_OPERATIONS_WORKFLOW[mode]}
                action={pageAction}
            />
            <AdminFeedbackBanner ok={params.ok} error={params.error}/>

            {mode === 'products' && (canProducts ? <section className="space-y-5">
                <AdminListToolbar
                    pathname={pathname}
                    program={program}
                    track={track}
                    search={activeFilters.q}
                    status={activeFilters.status}
                    statusOptions={DOMAIN_STATUS_OPTIONS.products}
                    placeholder={DOMAIN_SEARCH_PLACEHOLDER.products}
                    resultCount={pageSummary?.total ?? products.length}
                />
                <AdminCard className="overflow-hidden">
                    <div className="border-b border-slate-200 p-5"><AdminSectionHeading title="Product catalog" description={pageSummary ? adminPageSummaryLabel(pageSummary, 'product', 'produk') : `${products.length} product pada context aktif.`}/></div>
                    {products.length ? <div className="divide-y divide-slate-100">{products.map((row) => {
                        const id = s(row.id)
                        const price = priceByProduct.get(id)
                        return <div key={id} className="flex flex-col gap-4 p-5 transition hover:bg-slate-50/70 lg:flex-row lg:items-center lg:justify-between">
                            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-extrabold text-slate-900">{s(row.name)}</span><AdminStatusBadge status={row.status}/></div><div className="mt-1 text-xs font-semibold text-slate-500">{s(row.code)} · {s(row.product_type)} · {price ? formatRupiah(price.amount) : 'Tanpa harga'} · grant {grantByProduct.get(id) ?? 0}</div></div>
                            <div className="flex shrink-0 flex-wrap gap-2"><Link className={adminSecondaryButtonClass} href={editHref('products', id)} aria-label={`Edit product ${s(row.name)}`}>Edit</Link><form action={archiveProductAction}><ContextFields program={program} track={track}/><input type="hidden" name="id" value={id}/><ConfirmSubmit message={`Product “${s(row.name)}” akan diarsipkan.`} detail="Product yang diarsipkan tidak lagi ditawarkan ke peserta. Riwayat order dan dompet yang sudah terjadi tidak berubah." confirmLabel="Arsipkan product" trigger={<button type="button" className={adminDangerButtonClass}><Archive size={14}/>Archive</button>}/></form></div>
                        </div>
                    })}</div> : pageOutOfRange ? (
                        <PageOutOfRange lastPage={pageSummary?.totalPages ?? 1} href={adminPageHref(pathname, activeFilters, pageSummary?.totalPages ?? 1)} noun="product"/>
                    ) : <AdminEmptyState title="Tidak ada product" description={(activeFilters.q || activeFilters.status) ? 'Tidak ada product yang cocok dengan filter ini. Coba ubah kata kunci atau status, atau tekan Reset.' : 'Gunakan tombol Tambah product untuk membuat product pertama.'}/>}
                    {pageSummary && (products.length > 0 || pageOutOfRange) ? (
                        <AdminPagination pathname={pathname} params={activeFilters} summary={pageSummary} noun="product" plural="produk"/>
                    ) : null}
                </AdminCard>
            </section> : <PermissionEmpty permission="product.manage"/>)}

            {mode === 'events' && (canEvents ? <section className="space-y-5">
                <AdminListToolbar
                    pathname={pathname}
                    program={program}
                    track={track}
                    search={params.q || ''}
                    status={params.status || ''}
                    statusOptions={DOMAIN_STATUS_OPTIONS.events}
                    placeholder={DOMAIN_SEARCH_PLACEHOLDER.events}
                    resultCount={filteredEvents.length}
                />
                {eventsCapped ? (
                    <AdminHint tone="amber">
                        Menampilkan {EVENTS_WINDOW} event terbaru pada context ini. Event yang lebih lama belum dapat dijangkau dari halaman ini — halaman berhalaman untuk Events belum tersedia; sementara pakai pencarian, atau kelola lewat <Link className="underline" href={`/admin/assessment/exams?${new URLSearchParams({ program, track })}`}>halaman Exams</Link> bila exam-nya perlu disunting.
                    </AdminHint>
                ) : null}
                {filteredEvents.length ? filteredEvents.map((row) => {
                    const id = s(row.id)
                    const sessions = sessionsFor(id)
                    const ticketProducts = workspace.products.filter((product) => s(product.product_type) === 'EVENT_TICKET')
                    return <AdminCard key={id} className="p-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div><div className="flex flex-wrap items-center gap-2"><span className="font-extrabold text-slate-900">{s(row.title)}</span><AdminStatusBadge status={row.status}/></div><p className="mt-1 text-xs font-semibold text-slate-500">{s(row.code)} · {sessions.length} sesi · {formatDateTime(row.starts_at)} → {formatDateTime(row.ends_at)}</p></div>
                            <div className="flex flex-wrap gap-2"><Link className={adminSecondaryButtonClass} href={editHref('events', id)} aria-label={`Edit event ${s(row.title)}`}>Edit</Link><form action={archiveEventAction}><ContextFields program={program} track={track}/><input type="hidden" name="id" value={id}/><ConfirmSubmit message={`Event “${s(row.title)}” akan diarsipkan.`} detail={`Event ini punya ${sessions.length} sesi. Peserta yang sudah terdaftar tidak lagi melihat event ini di halaman publik.`} confirmLabel="Arsipkan event" trigger={<button type="button" className={adminDangerButtonClass}><Archive size={14}/>Archive</button>}/></form></div>
                        </div>
                        <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex min-w-0 flex-wrap gap-2">{sessions.length ? sessions.map((session) => <AdminBadge key={s(session.id)}>{s(session.name)} · {adminStatusLabel(session.status)}</AdminBadge>) : <span className="text-sm font-medium text-slate-500">Belum ada sesi.</span>}</div>
                            <div className="flex shrink-0 flex-wrap gap-2">
                                <AdminModal title="Tambah sesi" description={`Tambahkan sesi untuk ${s(row.title)}.`} triggerLabel="Tambah sesi" triggerVariant="secondary" size="lg">
                                    <form action={saveEventSessionAction} className="grid gap-4 md:grid-cols-2">
                                        <ContextFields program={program} track={track}/><input type="hidden" name="event_id" value={id}/>
                                        <AdminField label="Nama sesi"><input className={adminInputClass} name="name" required/></AdminField>
                                        <AdminField label="Exam EVENT"><select className={adminInputClass} name="exam_id">{workspace.exams.filter((exam) => examTypeById.get(s(exam.exam_type_id))?.code === 'EVENT').map((exam) => <option key={s(exam.id)} value={s(exam.id)}>{s(exam.title)}</option>)}</select></AdminField>
                                        <AdminField label="Mulai"><input className={adminInputClass} type="datetime-local" name="starts_at" defaultValue={formatLocalDateTimeInput(row.starts_at)}/></AdminField>
                                        <AdminField label="Selesai"><input className={adminInputClass} type="datetime-local" name="ends_at" defaultValue={formatLocalDateTimeInput(row.ends_at)}/></AdminField>
                                        <AdminField label="Kapasitas"><input className={adminInputClass} type="number" min="1" name="capacity"/></AdminField>
                                        <AdminField label="Status"><select className={adminInputClass} name="status"><option>scheduled</option><option>live</option><option>closed</option></select></AdminField>
                                        <div className="md:col-span-2 flex justify-end border-t border-slate-100 pt-4"><button className={adminPrimaryButtonClass}>Tambah sesi</button></div>
                                    </form>
                                </AdminModal>
                                {sessions.length > 0 && ticketProducts.length > 0 ? <AdminModal title="Hubungkan tiket" description="Pilih sesi dan product tiket yang akan digunakan." triggerLabel="Hubungkan tiket" triggerVariant="secondary" size="md">
                                    <form action={linkEventProductAction} className="grid gap-4">
                                        <ContextFields program={program} track={track}/><input type="hidden" name="event_id" value={id}/>
                                        <AdminField label="Sesi"><select className={adminInputClass} name="session_id">{sessions.map((session) => <option key={s(session.id)} value={s(session.id)}>{s(session.name)}</option>)}</select></AdminField>
                                        <AdminField label="Produk tiket"><select className={adminInputClass} name="product_id">{ticketProducts.map((product) => <option key={s(product.id)} value={s(product.id)}>{s(product.code)} · {s(product.name)}</option>)}</select></AdminField>
                                        <input type="hidden" name="status" value="active"/>
                                        <div className="flex justify-end border-t border-slate-100 pt-4"><button className={adminPrimaryButtonClass}>Hubungkan tiket</button></div>
                                    </form>
                                </AdminModal> : null}
                            </div>
                        </div>
                    </AdminCard>
                }) : <AdminCard><AdminEmptyState title={(params.q || params.status) ? 'Tidak ada event yang cocok' : 'Belum ada event'} description={(params.q || params.status) ? 'Tidak ada event yang cocok dengan filter ini. Coba ubah kata kunci atau status, atau tekan Reset.' : 'Gunakan tombol Buat event untuk membuat event pertama.'}/></AdminCard>}
            </section> : <PermissionEmpty permission="event.manage"/>)}

            {mode === 'questions' && (canQuestions ? <section className="space-y-5">
                {missingQuestion ? <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4">Soal tidak ditemukan pada konteks ini. Pilih soal dari daftar; tidak ada perubahan yang disimpan.</div> : null}
                <AdminListToolbar
                    pathname={pathname}
                    program={program}
                    track={track}
                    search={activeFilters.q}
                    status={activeFilters.status}
                    statusOptions={DOMAIN_STATUS_OPTIONS.questions}
                    placeholder={DOMAIN_SEARCH_PLACEHOLDER.questions}
                    resultCount={pageSummary?.total ?? questions.length}
                    selects={[{
                        name: 'subject',
                        ariaLabel: 'Filter mapel',
                        placeholder: 'Semua mapel',
                        defaultValue: params.subject || '',
                        options: workspace.catalog.subjects.map((subject) => ({ value: subject.code, label: `${subject.code} · ${subject.name}` })),
                    }]}
                />
                <AdminCard className="overflow-hidden">
                    <div className="border-b border-slate-200 p-5"><AdminSectionHeading title="Daftar soal" description={pageSummary ? adminPageSummaryLabel(pageSummary, 'soal') : `${questions.length} soal pada context aktif.`}/></div>
                    {questions.length ? <div className="divide-y divide-slate-100">{questions.map((row) => {
                    const id = s(row.id)
                    const placeholder = isLegacyHistoryPlaceholder(row.source_type)
                    return <div key={id} className="flex flex-col gap-4 p-5 transition hover:bg-slate-50/70 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-extrabold text-slate-900">{s(row.question_code) || 'Tanpa kode'}</span><AdminBadge variant="blue">{subjectById.get(s(row.subject_id))?.code ?? '?'}</AdminBadge><AdminBadge>{{ single_choice: 'Pilihan tunggal', multiple_choice: 'Pilihan majemuk', category: 'Kategori' }[s(row.question_type)] || s(row.question_type)}</AdminBadge>{placeholder ? <AdminBadge variant="orange">Placeholder riwayat</AdminBadge> : <AdminStatusBadge status={row.status}/>}<span className="text-xs font-bold text-slate-500">v{s(row.version)}</span></div><p className="mt-2 line-clamp-2 max-w-4xl text-sm font-medium leading-6 text-slate-600">{placeholder ? 'Penampung riwayat attempt lama — tidak punya opsi dan tidak dapat diedit.' : s(row.stem)}</p></div><div className="flex shrink-0 flex-wrap gap-2">{placeholder ? <span className={`${adminSecondaryButtonClass} cursor-not-allowed opacity-50`} title="Placeholder riwayat tidak dapat diedit">Terkunci</span> : <Link className={adminSecondaryButtonClass} href={editHref('questions', id)} aria-label={`Edit soal ${s(row.question_code) || 'tanpa kode'}`}>Edit</Link>}</div></div>
                })}</div> : pageOutOfRange ? (
                    <PageOutOfRange lastPage={pageSummary?.totalPages ?? 1} href={adminPageHref(pathname, activeFilters, pageSummary?.totalPages ?? 1)} noun="soal"/>
                ) : <AdminEmptyState title="Tidak ada soal" description={(activeFilters.q || activeFilters.status || activeFilters.subject) ? 'Tidak ada soal yang cocok dengan filter ini. Coba ubah kata kunci, mapel, atau status, atau tekan Reset.' : 'Gunakan tombol Tambah soal untuk membuat soal pertama.'}/>}
                    {pageSummary && (questions.length > 0 || pageOutOfRange) ? (
                        <AdminPagination pathname={pathname} params={activeFilters} summary={pageSummary} noun="soal"/>
                    ) : null}
                </AdminCard>
            </section> : <PermissionEmpty permission="question.manage"/>)}

            {mode === 'commerce' && (canCommerce ? <section className="space-y-5">
                <AdminHint tone="amber">
                    Commerce monitor masih global lintas program. Filter per Program/Track belum diterapkan karena ownership berada pada order_items.
                </AdminHint>
                <section className="grid gap-3 sm:grid-cols-3"><AdminMetric label="Order terbaru" value={workspace.orders.length} helper="Snapshot workspace" icon={<Package size={18}/>} tone="blue"/><AdminMetric label="Payment terbaru" value={workspace.payments.length} helper="Snapshot workspace" icon={<CreditCard size={18}/>} tone="violet"/><AdminMetric label="Paid" value={workspace.orders.filter((row) => lower(row.status) === 'paid').length} helper="Order berstatus paid" icon={<CheckCircle2 size={18}/>} tone="green"/></section>
                <AdminCard className="overflow-hidden"><div className="border-b border-slate-200 p-5"><AdminSectionHeading title="Orders" description="50 order terbaru dan status pembayarannya."/></div>{workspace.orders.length ? <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className={adminTableHeadClass}><tr><AdminTh>Order</AdminTh><AdminTh>Status</AdminTh><AdminTh align="right">Total</AdminTh><AdminTh>User</AdminTh><AdminTh>Created</AdminTh></tr></thead><tbody className="divide-y divide-slate-100">{workspace.orders.map((row) => <tr key={s(row.id)} className="hover:bg-slate-50/70"><td className="px-5 py-3.5 font-extrabold text-slate-900">{s(row.order_number)}</td><td className="px-4 py-3.5"><AdminStatusBadge status={row.status}/></td><td className="px-4 py-3.5 text-right font-bold tabular-nums text-slate-700">{formatRupiah(row.total_amount)}</td><td className="px-4 py-3.5 font-mono text-xs text-slate-500">{s(row.user_id).slice(0, 8)}</td><td className="px-5 py-3.5 text-slate-500">{formatDateTime(row.created_at)}</td></tr>)}</tbody></table></div> : <AdminEmptyState title="Belum ada order" description="Order akan muncul otomatis saat peserta menyelesaikan checkout."/>}</AdminCard>
                <AdminCard className="overflow-hidden"><div className="border-b border-slate-200 p-5"><AdminSectionHeading title="Payments" description="50 payment terbaru dari provider."/></div>{workspace.payments.length ? <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className={adminTableHeadClass}><tr><AdminTh>Provider</AdminTh><AdminTh>Status</AdminTh><AdminTh align="right">Amount</AdminTh><AdminTh>Order</AdminTh><AdminTh>Method</AdminTh></tr></thead><tbody className="divide-y divide-slate-100">{workspace.payments.map((row) => <tr key={s(row.id)} className="hover:bg-slate-50/70"><td className="px-5 py-3.5 font-extrabold text-slate-900">{s(row.provider)}</td><td className="px-4 py-3.5"><AdminStatusBadge status={row.status}/></td><td className="px-4 py-3.5 text-right font-bold tabular-nums text-slate-700">{formatRupiah(row.amount)}</td><td className="px-4 py-3.5 font-mono text-xs text-slate-500">{s(row.order_id).slice(0, 8)}</td><td className="px-5 py-3.5 text-slate-500">{s(row.payment_method) || '—'}</td></tr>)}</tbody></table></div> : <AdminEmptyState title="Belum ada payment" description="Payment akan muncul otomatis setelah provider mengirim notifikasi."/>}</AdminCard>
            </section> : <PermissionEmpty permission="order.read / payment.manage"/>)}
        </AdminPage>
    )
}
