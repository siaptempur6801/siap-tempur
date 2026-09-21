import { createAdminClient, createV2AdminClient } from '@/lib/utils/supabase/server'
import type { Json } from '@/types/database.types'
import { env } from '@/lib/env'
import { ADMIN_PAGE_SIZE, adminOffset, adminTotalPages } from '@/lib/admin-pagination'
import { chunkValues } from '@/lib/supabase-batch'
import { DEFAULT_TOKEN_WALLET_TYPE } from '@/src/repositories/wallet.repository'
import {
    catalogContextService,
    CPNS_SKD_CONTEXT,
    type ProgramTrackContext,
} from '@/src/services/catalog-context.service'

function slugify(value: string) {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

function nowIso() {
    return new Date().toISOString()
}

function sameId(left: unknown, right: unknown) {
    return String(left ?? '') === String(right ?? '')
}

function validPositive(value: number | null | undefined) {
    return value === null || value === undefined || (Number.isFinite(value) && value > 0)
}

function validNonNegative(value: number | null | undefined) {
    return value === null || value === undefined || (Number.isFinite(value) && value >= 0)
}

function contextOrDefault(context?: ProgramTrackContext) {
    return context ?? CPNS_SKD_CONTEXT
}

function normalizeEventFlyerUrl(value?: string | null) {
    if (!value) return null
    if (value.length > 1000) throw new Error('EVENT_FLYER_URL_INVALID')

    try {
        const url = new URL(value)
        const supabaseUrl = new URL(env.supabaseUrl())
        const bucketPrefix = '/storage/v1/object/public/event-flyers/'
        if (url.origin !== supabaseUrl.origin || !url.pathname.startsWith(bucketPrefix) || url.pathname === bucketPrefix) {
            throw new Error('EVENT_FLYER_URL_INVALID')
        }
        url.hash = ''
        return url.toString()
    } catch {
        throw new Error('EVENT_FLYER_URL_INVALID')
    }
}

/**
 * Domain data yang dapat dimuat workspace admin secara terpisah.
 *
 * Setiap tab admin hanya membutuhkan satu domain. Lihat `getWorkspaceData`.
 */
export type WorkspaceSection = 'products' | 'events' | 'exams' | 'questions' | 'commerce'

export const ALL_WORKSPACE_SECTIONS: readonly WorkspaceSection[] =
    ['products', 'events', 'exams', 'questions', 'commerce'] as const

/** Domain yang punya daftar berhalaman + pencarian di database. */
export type AdminDomainList = 'products' | 'events' | 'exams' | 'questions'

/**
 * Spesifikasi query per domain.
 *
 * Kolom pencarian ditulis eksplisit per domain: kolom `title` tidak ada di
 * product, dan `name` tidak ada di exam, sehingga daftar kolom tidak bisa
 * digeneralisasi tanpa menebak.
 */
const ADMIN_DOMAIN_LISTS: Record<AdminDomainList, {
    table: 'products' | 'events' | 'exams' | 'questions'
    select: string
    searchColumns: readonly string[]
    orderColumn: string
    orderAscending: boolean
}> = {
    products: {
        table: 'products',
        select: 'id, code, name, description, product_type, duration_days, status, created_at, updated_at',
        searchColumns: ['code', 'name', 'description'],
        orderColumn: 'updated_at',
        orderAscending: false,
    },
    events: {
        table: 'events',
        select: 'id, code, title, slug, event_type, description, flyer_image_url, registration_start, registration_end, starts_at, ends_at, status, created_at',
        searchColumns: ['code', 'title', 'slug'],
        orderColumn: 'starts_at',
        orderAscending: false,
    },
    exams: {
        table: 'exams',
        select: 'id, exam_type_id, title, slug, duration_seconds, attempt_limit, question_order, result_visibility, access_type, status, starts_at, ends_at, token_cost, updated_at',
        searchColumns: ['title', 'slug'],
        orderColumn: 'updated_at',
        orderAscending: false,
    },
    questions: {
        table: 'questions',
        select: 'id, question_code, subject_id, question_type, stem, difficulty, source_reference, status, version, author_id, reviewer_id, published_at, updated_at',
        searchColumns: ['question_code', 'stem'],
        orderColumn: 'updated_at',
        orderAscending: false,
    },
}

/**
 * Membersihkan nilai pencarian sebelum dipakai di dalam ekspresi `or` PostgREST.
 *
 * `or=(...)` memakai koma sebagai pemisah kondisi dan tanda kurung sebagai
 * pengelompok, jadi nilai yang mengandung keduanya bisa mengubah bentuk filter —
 * bukan sekadar gagal. Karakter liarnya juga dibuang supaya `%` yang diketik
 * admin tidak berubah menjadi wildcard tak terbatas.
 */
function escapePostgrestValue(value: string) {
    return value.replace(/[,()*%\\]/g, ' ').trim()
}

export class AdminV2Service {
    private async getCatalog(context?: ProgramTrackContext) {
        return catalogContextService.resolve(contextOrDefault(context))
    }

    async listCatalogContexts() {
        return catalogContextService.listActiveContexts()
    }

    /**
     * Memuat data workspace admin.
     *
     * `sections` membatasi domain mana yang benar-benar di-query. Setiap tab
     * admin hanya membutuhkan satu domain, jadi tanpa pembatasan ini membuka
     * tab "Products" ikut menarik 80 soal beserta seluruh opsinya (setiap opsi
     * memuat `content`) — payload dan kerja database yang tidak pernah dirender.
     *
     * Bila `sections` tidak diisi, SELURUH domain dimuat. Itu yang dibutuhkan
     * dashboard (`AdminOverview`), yang memang menampilkan metrik lintas domain.
     *
     * Nilai balik selalu memuat SEMUA kunci (dengan array kosong untuk domain
     * yang tidak diminta), supaya pemanggil tidak perlu menangani `undefined`.
     * Pemanggil yang memakai `sections` bertanggung jawab membaca
     * `loadedSections` sebelum menafsirkan array kosong sebagai "tidak ada data".
     */
    /**
     * Daftar satu domain secara berhalaman + pencarian di sisi database.
     *
     * ## Kenapa terpisah dari `getWorkspaceData`
     *
     * `getWorkspaceData` memuat SATU jendela tetap (soal 80, exam 80, event 50,
     * product 50) dan tidak pernah memberi tahu berapa total sebenarnya. Dua
     * akibatnya nyata:
     *
     * - **Data tidak terjangkau.** Produksi punya ribuan soal; Question Bank
     *   hanya bisa menampilkan 80 terbaru, dan tidak ada jalan menuju sisanya.
     * - **Pencarian berbohong.** Filter di klien berjalan atas baris yang sudah
     *   terpotong, sehingga mencari soal ke-500 menjawab "tidak ada" — jawaban
     *   yang salah, bukan sekadar kosong.
     *
     * Karena itu pencarian dan paginasi dilakukan di database, dan `total`
     * dihitung dengan `count: 'exact'` supaya UI dapat menyatakan posisinya
     * dengan jujur.
     */
    async listDomainPage(
        domain: AdminDomainList,
        options: { context?: ProgramTrackContext; search?: string | null; status?: string | null; subject?: string | null; page?: number | null; id?: string | null } = {},
    ) {
        const spec = ADMIN_DOMAIN_LISTS[domain]
        const admin = await createV2AdminClient()
        const catalog = await this.getCatalog(options.context)
        const search = (options.search ?? '').trim()
        const status = (options.status ?? '').trim()
        const subject = (options.subject ?? '').trim()
        // Hanya tabel yang punya kolom `subject_id` (questions) yang boleh
        // memakai filter ini; kode tak dikenal berarti filter tanpa hasil,
        // bukan error — admin salah mengetik kode masih melihat halaman.
        const subjectId = subject
            ? (catalog.subjects.find((row) => row.code.toLowerCase() === subject.toLowerCase())?.id ?? '00000000-0000-0000-0000-000000000000')
            : ''

        /** Filter yang berlaku untuk perhitungan total maupun pengambilan baris. */
        const applyFilters = <T extends { eq: (column: string, value: string) => T; or: (expression: string) => T }>(builder: T): T => {
            let query = builder
                .eq('program_id', catalog.program.id)
                .eq('track_id', catalog.track.id)
            // `id` dipakai untuk memuat satu baris di luar halaman yang sedang
            // tampil (mis. tautan edit lama), sehingga admin tidak pernah
            // menyimpan baris baru hanya karena barisnya tidak termuat. Sengaja
            // diperiksa sebagai nilai truthy: `''` akan menjadi `uuid = ''` dan
            // PostgREST menolaknya.
            if (options.id) query = query.eq('id', options.id)
            if (status) query = query.eq('status', status)
            if (subject && spec.table === 'questions') {
                query = (query as unknown as { eq: (column: string, value: string) => T }).eq('subject_id', subjectId) as T
            }
            if (search) {
                // Kolom pencarian ditentukan per domain supaya tidak menabrak
                // kolom yang tidak ada.
                query = query.or(spec.searchColumns.map((column) => `${column}.ilike.%${escapePostgrestValue(search)}%`).join(','))
            }
            return query
        }

        /**
         * Saat nomor halaman dari URL melewati jumlah baris, permintaan baris
         * TIDAK dijalankan sama sekali.
         *
         * PostgREST menolak `Range` di luar jumlah baris dengan **PGRST103
         * "Requested range not satisfiable"** — sebuah error, bukan array kosong.
         * Sebelumnya itu menjatuhkan seluruh halaman ke error boundary, dan
         * `redirect()` yang seharusnya merapikan nomor halaman tidak pernah
         * tercapai. Pagar ini membuat halaman terakhir tetap penting, tetapi
         * tidak pernah menjadi kegagalan.
         */
        let clampTo: number | null = null
        if (!options.id) {
            const total = await this.countDomainRows(domain, { context: options.context, search, status, subject: subject && spec.table === 'questions' ? subjectId : '' })
            const requested = Math.max(1, Math.floor(options.page ?? 1))
            const lastPage = adminTotalPages(total)
            if (requested > lastPage) return { rows: [], total, lastPage, clampTo: lastPage }
            clampTo = lastPage
        }

        const page = Math.max(1, Math.floor(options.page ?? 1))
        const from = adminOffset(page)
        const query = applyFilters(admin.from(spec.table).select(spec.select, { count: 'exact' }))

        const { data, count, error } = await query
            .order(spec.orderColumn, { ascending: spec.orderAscending })
            .range(from, from + ADMIN_PAGE_SIZE - 1)
        if (error) throw error

        return {
            rows: (data ?? []) as unknown as Array<Record<string, unknown>>,
            total: count ?? 0,
            lastPage: adminTotalPages(count ?? 0),
            clampTo,
        }
    }

    /**
     * Jumlah baris satu domain tanpa mengambil satu baris pun.
     *
     * `head: true` membuat PostgREST hanya mengirim header, sehingga biayanya
     * jauh lebih kecil daripada memuat data lalu menghitungnya di aplikasi.
     */
    private async countDomainRows(
        domain: AdminDomainList,
        options: { context?: ProgramTrackContext; search?: string; status?: string; subject?: string },
    ): Promise<number> {
        const spec = ADMIN_DOMAIN_LISTS[domain]
        const admin = await createV2AdminClient()
        const catalog = await this.getCatalog(options.context)

        let query = admin
            .from(spec.table)
            .select('id', { count: 'exact', head: true })
            .eq('program_id', catalog.program.id)
            .eq('track_id', catalog.track.id)
        if (options.status) query = query.eq('status', options.status)
        if (options.subject) {
            query = (query as unknown as { eq: (column: string, value: string) => typeof query }).eq('subject_id', options.subject) as typeof query
        }
        if (options.search) {
            query = query.or(spec.searchColumns.map((column) => `${column}.ilike.%${escapePostgrestValue(options.search!)}%`).join(','))
        }

        const { count, error } = await query
        if (error) throw error
        return count ?? 0
    }

    /**
     * Detail yang dibutuhkan daftar berhalaman, diambil hanya untuk baris yang
     * benar-benar tampil.
     *
     * Sebelumnya harga product, grant token, dan seluruh opsi soal ikut dimuat
     * untuk semua baris — membuka Question Bank menarik opsi dari 80 soal
     * sekaligus meski hanya 25 yang dirender.
     */
    async listProductPrices(productIds: readonly string[]) {
        return this.listRowsForIds('product_prices', 'id, product_id, amount, currency, status, starts_at, ends_at', 'product_id', productIds)
    }

    async listProductWalletGrants(productIds: readonly string[]) {
        // Tabel ini TIDAK punya kolom `id` — primary key-nya `(product_id, wallet_type)`.
        // Memilih `id` membuat PostgREST menolak dengan 42703 dan seluruh halaman
        // jatuh ke error boundary.
        return this.listRowsForIds('product_wallet_grants', 'product_id, wallet_type, amount', 'product_id', productIds)
    }

    async listQuestionOptions(questionIds: readonly string[]) {
        return this.listRowsForIds(
            'question_options',
            'id, question_id, option_key, content, is_correct, score, sort_order, response_group, response_group_order, image_url',
            'question_id',
            questionIds,
        )
    }

    /**
     * Query `IN` yang di-batch.
     *
     * Daftar id yang panjang membuat URL PostgREST melewati batas header server
     * (±16KB) dan permintaan gagal dengan `UND_ERR_HEADERS_OVERFLOW` — insiden
     * yang pernah menjatuhkan `/admin/assessment/exams`. Karena itu filter
     * dipecah memakai helper batching yang sudah ada.
     */
    private async listRowsForIds(
        table: 'product_prices' | 'product_wallet_grants' | 'question_options',
        select: string,
        column: 'product_id' | 'question_id',
        ids: readonly string[],
    ) {
        const unique = [...new Set(ids.filter(Boolean))]
        if (unique.length === 0) return [] as Array<Record<string, unknown>>
        // `untyped` dipakai karena `product_wallet_grants` belum ada di tipe
        // database yang di-generate, sedangkan tabelnya nyata dan sudah dipakai
        // `getWorkspaceData`. Menambahkannya ke tipe berarti regenerasi tipe
        // database — di luar cakupan perubahan ini.
        const admin = await createAdminClient()
        const rows: Array<Record<string, unknown>> = []
        for (const chunk of chunkValues(unique)) {
            const { data, error } = await admin.from(table).select(select).in(column, chunk)
            if (error) throw error
            rows.push(...((data ?? []) as unknown as Array<Record<string, unknown>>))
        }
        return rows
    }

    async getWorkspaceData(context?: ProgramTrackContext, sections?: readonly WorkspaceSection[]) {
        const wanted = new Set<WorkspaceSection>(sections ?? ALL_WORKSPACE_SECTIONS)
        const admin = await createV2AdminClient()
        const catalog = await this.getCatalog(context)
        const empty = Promise.resolve({ data: [], error: null })

        const [productsResult, eventsResult, examsResult, questionsResult, ordersResult, paymentsResult] = await Promise.all([
            wanted.has('products')
                ? admin
                    .from('products')
                    .select('id, code, name, description, product_type, duration_days, status, created_at, updated_at')
                    .eq('program_id', catalog.program.id)
                    .eq('track_id', catalog.track.id)
                    .order('updated_at', { ascending: false })
                    .limit(50)
                : empty,
            wanted.has('events')
                ? admin
                    .from('events')
                    .select('id, code, title, slug, event_type, description, flyer_image_url, registration_start, registration_end, starts_at, ends_at, status, created_at')
                    .eq('program_id', catalog.program.id)
                    .eq('track_id', catalog.track.id)
                    .order('starts_at', { ascending: false })
                    .limit(50)
                : empty,
            wanted.has('exams')
                ? admin
                    .from('exams')
                    .select('id, exam_type_id, title, slug, duration_seconds, attempt_limit, question_order, result_visibility, access_type, status, starts_at, ends_at, token_cost, updated_at')
                    .eq('program_id', catalog.program.id)
                    .eq('track_id', catalog.track.id)
                    .order('updated_at', { ascending: false })
                    .limit(80)
                : empty,
            wanted.has('questions')
                ? admin
                    .from('questions')
                    .select('id, question_code, subject_id, question_type, stem, difficulty, source_reference, status, version, author_id, reviewer_id, published_at, updated_at')
                    .eq('program_id', catalog.program.id)
                    .eq('track_id', catalog.track.id)
                    .order('updated_at', { ascending: false })
                    .limit(80)
                : empty,
            wanted.has('commerce')
                ? admin
                    .from('orders')
                    .select('id, order_number, user_id, status, subtotal, discount_amount, total_amount, currency, paid_at, created_at')
                    .order('created_at', { ascending: false })
                    .limit(50)
                : empty,
            wanted.has('commerce')
                ? admin
                    .from('payments')
                    .select('id, order_id, provider, provider_transaction_id, payment_method, amount, status, paid_at, created_at, updated_at')
                    .order('created_at', { ascending: false })
                    .limit(50)
                : empty,
        ])

        for (const result of [productsResult, eventsResult, examsResult, questionsResult, ordersResult, paymentsResult]) {
            if (result.error) throw result.error
        }

        const productIds = (productsResult.data ?? []).map((row) => row.id)
        const eventIds = (eventsResult.data ?? []).map((row) => row.id)
        const examIds = (examsResult.data ?? []).map((row) => row.id)
        const questionIds = (questionsResult.data ?? []).map((row) => row.id)
        const untyped = await createAdminClient()

        const [pricesResult, grantsResult, eventProductsResult, sessionsResult, sectionsResult, optionsResult] = await Promise.all([
            productIds.length
                ? admin.from('product_prices').select('id, product_id, currency, amount, starts_at, ends_at, status').in('product_id', productIds).order('starts_at', { ascending: false })
                : Promise.resolve({ data: [], error: null }),
            productIds.length
                ? untyped.from('product_wallet_grants').select('product_id, wallet_type, amount').in('product_id', productIds)
                : Promise.resolve({ data: [], error: null }),
            eventIds.length
                ? untyped.from('event_products').select('product_id, event_id, session_id, status').in('event_id', eventIds)
                : Promise.resolve({ data: [], error: null }),
            eventIds.length
                ? admin.from('event_sessions').select('id, event_id, exam_id, name, starts_at, ends_at, capacity, status').in('event_id', eventIds).order('starts_at', { ascending: true })
                : Promise.resolve({ data: [], error: null }),
            examIds.length
                ? admin.from('exam_sections').select('id, exam_id, subject_id, title, sort_order, question_count, duration_seconds, config').in('exam_id', examIds).order('sort_order', { ascending: true })
                : Promise.resolve({ data: [], error: null }),
            questionIds.length
                ? untyped.from('question_options').select('id, question_id, option_key, content, is_correct, score, sort_order, response_group, response_group_order').in('question_id', questionIds).order('sort_order', { ascending: true })
                : Promise.resolve({ data: [], error: null }),
        ])
        for (const result of [pricesResult, grantsResult, eventProductsResult, sessionsResult, sectionsResult, optionsResult]) {
            if (result.error) throw result.error
        }

        return {
            catalog,
            contexts: await this.listCatalogContexts(),
            /**
             * Domain mana yang benar-benar di-query. Tanpa ini, array kosong
             * menjadi ambigu: "tidak ada data" atau "tidak diminta"?
             */
            loadedSections: Array.from(wanted),
            products: productsResult.data ?? [],
            productPrices: pricesResult.data ?? [],
            productWalletGrants: grantsResult.data ?? [],
            events: eventsResult.data ?? [],
            eventProducts: eventProductsResult.data ?? [],
            eventSessions: sessionsResult.data ?? [],
            exams: examsResult.data ?? [],
            examSections: sectionsResult.data ?? [],
            questions: questionsResult.data ?? [],
            questionOptions: optionsResult.data ?? [],
            orders: ordersResult.data ?? [],
            payments: paymentsResult.data ?? [],
        }
    }

    async saveProduct(input: {
        id?: string | null
        code: string
        name: string
        description?: string | null
        productType: string
        durationDays?: number | null
        status: string
        price?: number | null
        currency?: string
        tokenGrant?: number | null
        context?: ProgramTrackContext
    }) {
        const admin = await createV2AdminClient()
        const catalog = await this.getCatalog(input.context)
        const code = input.code.trim().toUpperCase().replace(/[^A-Z0-9_]+/g, '_')
        if (!code || !input.name.trim()) throw new Error('PRODUCT_FIELDS_REQUIRED')
        if (!validNonNegative(input.price)) throw new Error('PRODUCT_PRICE_INVALID')
        if (!validNonNegative(input.tokenGrant)) throw new Error('TOKEN_GRANT_INVALID')
        if (!validPositive(input.durationDays)) throw new Error('PRODUCT_DURATION_INVALID')

        let productId = input.id ?? null
        if (productId) {
            const { data: current, error: currentError } = await admin
                .from('products')
                .select('id, program_id, track_id')
                .eq('id', productId)
                .maybeSingle()
            if (currentError) throw currentError
            if (!current || !sameId(current.program_id, catalog.program.id) || !sameId(current.track_id, catalog.track.id)) {
                throw new Error('PRODUCT_CATALOG_MISMATCH')
            }
            const { error } = await admin
                .from('products')
                .update({
                    code,
                    name: input.name.trim(),
                    description: input.description?.trim() || null,
                    product_type: input.productType,
                    duration_days: input.durationDays ?? null,
                    status: input.status,
                    updated_at: nowIso(),
                })
                .eq('id', productId)
            if (error) throw error
        } else {
            const { data, error } = await admin
                .from('products')
                .insert({
                    code,
                    name: input.name.trim(),
                    description: input.description?.trim() || null,
                    product_type: input.productType,
                    program_id: catalog.program.id,
                    track_id: catalog.track.id,
                    duration_days: input.durationDays ?? null,
                    status: input.status,
                })
                .select('id')
                .single()
            if (error) throw error
            productId = String(data.id)
        }

        if (input.price !== null && input.price !== undefined) {
            const { error: deactivateError } = await admin
                .from('product_prices')
                .update({ status: 'inactive', ends_at: nowIso() })
                .eq('product_id', productId)
                .in('status', ['active', 'ACTIVE'])
                .is('ends_at', null)
            if (deactivateError) throw deactivateError

            const { error: priceError } = await admin
                .from('product_prices')
                .insert({
                    product_id: productId,
                    currency: input.currency || 'IDR',
                    amount: input.price,
                    starts_at: nowIso(),
                    ends_at: null,
                    status: 'ACTIVE',
                })
            if (priceError) throw priceError
        }

        const untyped = await createAdminClient()

        // Tipe wallet token mengikuti program produk (CPNS → exam_token_cpns, TKA → exam_token_tka),
        // supaya grant token masuk ke saldo program yang benar.
        const { data: programRow } = await untyped
            .from('programs')
            .select('token_wallet_type')
            .eq('id', catalog.program.id)
            .maybeSingle()
        const programTokenWalletType =
            typeof programRow?.token_wallet_type === 'string' && programRow.token_wallet_type.length > 0
                ? programRow.token_wallet_type
                : DEFAULT_TOKEN_WALLET_TYPE

        if (input.tokenGrant !== null && input.tokenGrant !== undefined) {
            if (input.tokenGrant > 0) {
                const { error } = await untyped
                    .from('product_wallet_grants')
                    .upsert({
                        product_id: productId,
                        wallet_type: programTokenWalletType,
                        amount: input.tokenGrant,
                        config: {},
                    }, { onConflict: 'product_id,wallet_type' })
                if (error) throw error
            } else {
                const { error } = await untyped
                    .from('product_wallet_grants')
                    .delete()
                    .eq('product_id', productId)
                    .eq('wallet_type', programTokenWalletType)
                if (error) throw error
            }
        }

        return productId
    }

    async archiveProduct(productId: string) {
        const admin = await createV2AdminClient()
        const { error } = await admin
            .from('products')
            .update({ status: 'ARCHIVED', updated_at: nowIso() })
            .eq('id', productId)
        if (error) throw error
    }

    async saveEvent(input: {
        id?: string | null
        code: string
        title: string
        slug?: string | null
        description?: string | null
        flyerImageUrl?: string | null
        registrationStart?: string | null
        registrationEnd?: string | null
        startsAt: string
        endsAt: string
        status: string
        context?: ProgramTrackContext
    }) {
        const admin = await createV2AdminClient()
        const catalog = await this.getCatalog(input.context)
        const code = input.code.trim().toUpperCase().replace(/[^A-Z0-9_-]+/g, '-')
        const slug = slugify(input.slug || input.title)
        if (!code || !input.title.trim() || !slug) throw new Error('EVENT_FIELDS_REQUIRED')
        if (Date.parse(input.startsAt) >= Date.parse(input.endsAt)) throw new Error('EVENT_TIME_INVALID')
        if (input.registrationStart && input.registrationEnd && Date.parse(input.registrationStart) >= Date.parse(input.registrationEnd)) {
            throw new Error('EVENT_REGISTRATION_TIME_INVALID')
        }
        if (input.registrationEnd && Date.parse(input.registrationEnd) > Date.parse(input.endsAt)) {
            throw new Error('EVENT_REGISTRATION_TIME_INVALID')
        }

        const payload = {
            code,
            title: input.title.trim(),
            slug,
            event_type: 'tryout_akbar',
            program_id: catalog.program.id,
            track_id: catalog.track.id,
            description: input.description?.trim() || null,
            flyer_image_url: normalizeEventFlyerUrl(input.flyerImageUrl),
            registration_start: input.registrationStart || null,
            registration_end: input.registrationEnd || null,
            starts_at: input.startsAt,
            ends_at: input.endsAt,
            status: input.status,
        }

        if (input.id) {
            const { data: current, error: currentError } = await admin
                .from('events')
                .select('id, program_id, track_id')
                .eq('id', input.id)
                .maybeSingle()
            if (currentError) throw currentError
            if (!current || !sameId(current.program_id, catalog.program.id) || !sameId(current.track_id, catalog.track.id)) {
                throw new Error('EVENT_CATALOG_MISMATCH')
            }
            const { error } = await admin.from('events').update(payload).eq('id', input.id)
            if (error) throw error
            return input.id
        }

        const { data, error } = await admin.from('events').insert(payload).select('id').single()
        if (error) throw error
        return String(data.id)
    }

    async archiveEvent(eventId: string) {
        const admin = await createV2AdminClient()
        const { error } = await admin.from('events').update({ status: 'archived' }).eq('id', eventId)
        if (error) throw error
    }

    async saveEventSession(input: {
        id?: string | null
        eventId: string
        examId: string
        name: string
        startsAt: string
        endsAt: string
        capacity?: number | null
        status: string
        context?: ProgramTrackContext
    }) {
        if (!input.name.trim()) throw new Error('EVENT_SESSION_NAME_REQUIRED')
        if (Date.parse(input.startsAt) >= Date.parse(input.endsAt)) throw new Error('EVENT_SESSION_TIME_INVALID')
        if (!validPositive(input.capacity)) throw new Error('EVENT_SESSION_CAPACITY_INVALID')

        const admin = await createV2AdminClient()
        const catalog = await this.getCatalog(input.context)
        const eventType = catalog.examTypes.find((row) => row.code === 'EVENT')
        if (!eventType) throw new Error('EXAM_TYPE_INVALID')

        const [{ data: event, error: eventError }, { data: exam, error: examError }] = await Promise.all([
            admin.from('events').select('id, program_id, track_id, starts_at, ends_at').eq('id', input.eventId).maybeSingle(),
            admin.from('exams').select('id, program_id, track_id, exam_type_id').eq('id', input.examId).maybeSingle(),
        ])
        if (eventError) throw eventError
        if (examError) throw examError
        if (!event) throw new Error('EVENT_NOT_FOUND')
        if (!exam) throw new Error('EXAM_NOT_FOUND')
        if (!sameId(event.program_id, catalog.program.id) || !sameId(event.track_id, catalog.track.id)) throw new Error('EVENT_CATALOG_MISMATCH')
        if (!sameId(exam.program_id, event.program_id) || !sameId(exam.track_id, event.track_id)) throw new Error('EVENT_EXAM_MISMATCH')
        if (!sameId(exam.exam_type_id, eventType.id)) throw new Error('EVENT_EXAM_TYPE_REQUIRED')
        if (Date.parse(input.startsAt) < Date.parse(String(event.starts_at)) || Date.parse(input.endsAt) > Date.parse(String(event.ends_at))) {
            throw new Error('EVENT_SESSION_OUTSIDE_EVENT')
        }

        const payload = {
            event_id: input.eventId,
            exam_id: input.examId,
            name: input.name.trim(),
            starts_at: input.startsAt,
            ends_at: input.endsAt,
            capacity: input.capacity ?? null,
            status: input.status,
        }
        if (input.id) {
            const { error } = await admin.from('event_sessions').update(payload).eq('id', input.id)
            if (error) throw error
            return input.id
        }
        const { data, error } = await admin.from('event_sessions').insert(payload).select('id').single()
        if (error) throw error
        return String(data.id)
    }

    async linkEventProduct(input: { eventId: string; sessionId: string; productId: string; status?: string }) {
        const admin = await createV2AdminClient()
        const untyped = await createAdminClient()
        const [{ data: session, error: sessionError }, { data: event, error: eventError }, { data: product, error: productError }] = await Promise.all([
            admin.from('event_sessions').select('id, event_id').eq('id', input.sessionId).maybeSingle(),
            admin.from('events').select('id, program_id, track_id').eq('id', input.eventId).maybeSingle(),
            admin.from('products').select('id, program_id, track_id, status').eq('id', input.productId).maybeSingle(),
        ])
        if (sessionError) throw sessionError
        if (eventError) throw eventError
        if (productError) throw productError
        if (!session || !sameId(session.event_id, input.eventId)) throw new Error('EVENT_SESSION_MISMATCH')
        if (!event || !product) throw new Error('EVENT_PRODUCT_MISMATCH')
        if (!sameId(product.program_id, event.program_id) || !sameId(product.track_id, event.track_id)) throw new Error('EVENT_PRODUCT_MISMATCH')
        if (String(product.status).toLowerCase() === 'archived') throw new Error('EVENT_PRODUCT_ARCHIVED')

        const { error } = await untyped
            .from('event_products')
            .upsert({
                product_id: input.productId,
                event_id: input.eventId,
                session_id: input.sessionId,
                status: input.status ?? 'active',
            }, { onConflict: 'product_id' })
        if (error) throw error
    }

    async saveExam(input: {
        id?: string | null
        examTypeCode: string
        title: string
        slug?: string | null
        durationSeconds?: number | null
        attemptLimit?: number | null
        questionOrder: string
        resultVisibility: string
        accessType: string
        status: string
        tokenCost: number
        startsAt?: string | null
        endsAt?: string | null
        actorId: string
        context?: ProgramTrackContext
    }) {
        const admin = await createV2AdminClient()
        const catalog = await this.getCatalog(input.context)
        const examType = catalog.examTypes.find((row) => row.code === input.examTypeCode)
        if (!examType) throw new Error('EXAM_TYPE_INVALID')
        if (!input.title.trim()) throw new Error('EXAM_TITLE_REQUIRED')
        if (!validPositive(input.durationSeconds)) throw new Error('EXAM_DURATION_INVALID')
        if (!validPositive(input.attemptLimit)) throw new Error('EXAM_ATTEMPT_LIMIT_INVALID')
        if (!validNonNegative(input.tokenCost)) throw new Error('EXAM_TOKEN_COST_INVALID')
        if (input.startsAt && input.endsAt && Date.parse(input.startsAt) >= Date.parse(input.endsAt)) throw new Error('EXAM_TIME_INVALID')
        const slug = slugify(input.slug || input.title)
        if (!slug) throw new Error('EXAM_TITLE_REQUIRED')

        const payload = {
            program_id: catalog.program.id,
            track_id: catalog.track.id,
            exam_type_id: examType.id,
            title: input.title.trim(),
            slug,
            duration_seconds: input.durationSeconds ?? null,
            attempt_limit: input.attemptLimit ?? null,
            question_order: input.questionOrder,
            result_visibility: input.resultVisibility,
            access_type: input.accessType,
            status: input.status,
            starts_at: input.startsAt || null,
            ends_at: input.endsAt || null,
            token_cost: input.tokenCost,
            updated_at: nowIso(),
        }

        if (input.id) {
            const { data: current, error: currentError } = await admin
                .from('exams')
                .select('id, program_id, track_id')
                .eq('id', input.id)
                .maybeSingle()
            if (currentError) throw currentError
            if (!current || !sameId(current.program_id, catalog.program.id) || !sameId(current.track_id, catalog.track.id)) {
                throw new Error('EXAM_CATALOG_MISMATCH')
            }
            const { error } = await admin.from('exams').update(payload).eq('id', input.id)
            if (error) throw error
            return input.id
        }
        const { data, error } = await admin
            .from('exams')
            .insert({ ...payload, created_by: input.actorId })
            .select('id')
            .single()
        if (error) throw error
        return String(data.id)
    }

    async archiveExam(examId: string) {
        const admin = await createV2AdminClient()
        const { error } = await admin.from('exams').update({ status: 'archived', updated_at: nowIso() }).eq('id', examId)
        if (error) throw error
    }

    async saveExamSection(input: {
        id?: string | null
        examId: string
        subjectCode?: string | null
        title: string
        sortOrder: number
        questionCount?: number | null
        durationSeconds?: number | null
        passingScore?: number | null
        context?: ProgramTrackContext
    }) {
        const admin = await createV2AdminClient()
        const catalog = await this.getCatalog(input.context)
        const subject = input.subjectCode
            ? catalog.subjects.find((row) => row.code === input.subjectCode)
            : null
        if (input.subjectCode && !subject) throw new Error('SUBJECT_INVALID')
        if (!input.title.trim()) throw new Error('SECTION_TITLE_REQUIRED')
        if (!Number.isInteger(input.sortOrder) || input.sortOrder < 0) throw new Error('SECTION_SORT_ORDER_INVALID')
        if (!validPositive(input.questionCount)) throw new Error('SECTION_QUESTION_COUNT_INVALID')
        if (!validPositive(input.durationSeconds)) throw new Error('SECTION_DURATION_INVALID')
        if (!validNonNegative(input.passingScore)) throw new Error('SECTION_PASSING_SCORE_INVALID')

        const { data: exam, error: examError } = await admin
            .from('exams')
            .select('id, program_id, track_id')
            .eq('id', input.examId)
            .maybeSingle()
        if (examError) throw examError
        if (!exam || !sameId(exam.program_id, catalog.program.id) || !sameId(exam.track_id, catalog.track.id)) throw new Error('EXAM_NOT_FOUND')

        const payload = {
            exam_id: input.examId,
            subject_id: subject?.id ?? null,
            title: input.title.trim(),
            sort_order: input.sortOrder,
            question_count: input.questionCount ?? null,
            duration_seconds: input.durationSeconds ?? null,
            config: input.passingScore === null || input.passingScore === undefined
                ? {} as Json
                : { passing_score: input.passingScore } as Json,
        }
        if (input.id) {
            const { error } = await admin.from('exam_sections').update(payload).eq('id', input.id)
            if (error) throw error
            return input.id
        }
        const { data, error } = await admin.from('exam_sections').insert(payload).select('id').single()
        if (error) throw error
        return String(data.id)
    }

}

export const adminV2Service = new AdminV2Service()
