import { escapeLikePattern } from '@/lib/admin-query-pattern'
import { escapePostgrestValue } from '@/lib/postgrest-filter'
import { createAdminClient, createV2AdminClient } from '@/lib/utils/supabase/server'
import { ADMIN_PAGE_SIZE, adminOffset, adminTotalPages } from '@/lib/admin-pagination'
import { chunkValues } from '@/lib/supabase-batch'
import { type ProgramTrackContext } from '@/src/services/catalog-context.service'
import { getAdminCatalog } from '@/src/services/admin-service-utils'

/** Domain yang punya daftar berhalaman + pencarian di database. */
type AdminDomainList = 'products' | 'questions'

const ADMIN_DOMAIN_LISTS: Record<
  AdminDomainList,
  {
    table: 'products' | 'questions'
    select: string
    searchColumns: readonly string[]
    orderColumn: string
    orderAscending: boolean
    statusCase: 'upper' | 'lower'
  }
> = {
  products: {
    table: 'products',
    select:
      'id, code, name, description, product_type, duration_days, status, created_at, updated_at',
    searchColumns: ['code', 'name', 'description'],
    orderColumn: 'updated_at',
    orderAscending: false,
    statusCase: 'upper',
  },
  questions: {
    table: 'questions',
    select:
      'id, question_code, subject_id, question_type, stem, difficulty, source_type, source_reference, status, version, author_id, reviewer_id, published_at, updated_at',
    searchColumns: ['question_code', 'stem'],
    orderColumn: 'updated_at',
    orderAscending: false,
    statusCase: 'lower',
  },
}

class AdminWorkspaceService {
  async listDomainPage(
    domain: AdminDomainList,
    options: {
      context?: ProgramTrackContext
      search?: string | null
      status?: string | null
      subject?: string | null
      material?: string
      submaterial?: string
      review?: string
      stage?: string | null
      reviewer?: string | null
      page?: number | null
      id?: string | null
    } = {},
  ) {
    const spec = ADMIN_DOMAIN_LISTS[domain]
    const admin = await createV2AdminClient()
    const catalog = await getAdminCatalog(options.context)
    const search = (options.search ?? '').trim()
    const status = (options.status ?? '').trim()
    const subject = (options.subject ?? '').trim()
    // Hanya tabel yang punya kolom `subject_id` (questions) yang boleh
    // memakai filter ini; kode tak dikenal berarti filter tanpa hasil,
    // bukan error — admin salah mengetik kode masih melihat halaman.
    const subjectId = subject
      ? (catalog.subjects.find((row) => row.code.toLowerCase() === subject.toLowerCase())?.id ??
        '00000000-0000-0000-0000-000000000000')
      : ''

    if (domain === 'questions') {
      const { data, error } = await admin.rpc('admin_question_page', {
        p_program_id: catalog.program.id,
        p_track_id: catalog.track.id,
        p_search: escapeLikePattern(search),
        p_status: status,
        p_subject_id: subjectId || null,
        p_node_id: options.submaterial || options.material || null,
        p_review: options.review || '',
        p_stage: options.stage || '',
        p_reviewer: options.reviewer || '',
        p_page: options.id ? 1 : Math.max(1, Math.floor(options.page ?? 1)),
        p_id: options.id || null,
      })
      if (error) throw error
      if (!data) throw new Error('Question page unavailable')
      return data as unknown as {
        rows: Array<Record<string, unknown>>
        total: number
        lastPage: number
        clampTo: number | null
      }
    }

    /** Filter yang berlaku untuk perhitungan total maupun pengambilan baris. */
    const applyFilters = <
      T extends { eq: (column: string, value: string) => T; or: (expression: string) => T },
    >(
      builder: T,
    ): T => {
      let query = builder.eq('program_id', catalog.program.id).eq('track_id', catalog.track.id)
      // `id` dipakai untuk memuat satu baris di luar halaman yang sedang
      // tampil (mis. tautan edit lama), sehingga admin tidak pernah
      // menyimpan baris baru hanya karena barisnya tidak termuat. Sengaja
      // diperiksa sebagai nilai truthy: `''` akan menjadi `uuid = ''` dan
      // PostgREST menolaknya.
      if (options.id) query = query.eq('id', options.id)
      if (status)
        query = query.eq('status', spec.statusCase === 'upper' ? status.toUpperCase() : status)
      if (subject && spec.table === 'questions') {
        query = (query as unknown as { eq: (column: string, value: string) => T }).eq(
          'subject_id',
          subjectId,
        ) as T
      }
      if (search) {
        // Kolom pencarian ditentukan per domain supaya tidak menabrak
        // kolom yang tidak ada.
        query = query.or(
          spec.searchColumns
            .map((column) => `${column}.ilike.%${escapePostgrestValue(search)}%`)
            .join(','),
        )
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
    const clampTo: number | null = null
    if (!options.id) {
      const counted = await applyFilters(
        admin.from(spec.table).select('id', { count: 'exact', head: true }),
      )
      if (counted.error) throw counted.error
      const total = counted.count || 0
      const requested = Math.max(1, Math.floor(options.page ?? 1))
      const lastPage = adminTotalPages(total)
      if (requested > lastPage) return { rows: [], total, lastPage, clampTo: lastPage }
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
   * Detail yang dibutuhkan daftar berhalaman, diambil hanya untuk baris yang
   * benar-benar tampil.
   *
   * Sebelumnya harga product, grant token, dan seluruh opsi soal ikut dimuat
   * untuk semua baris — membuka Question Bank menarik opsi dari 80 soal
   * sekaligus meski hanya 25 yang dirender.
   */
  async listProductPrices(productIds: readonly string[]) {
    return this.listRowsForIds(
      'product_prices',
      'id, product_id, amount, currency, status, starts_at, ends_at',
      'product_id',
      productIds,
    )
  }

  async listProductWalletGrants(productIds: readonly string[]) {
    // Tabel ini TIDAK punya kolom `id` — primary key-nya `(product_id, wallet_type)`.
    // Memilih `id` membuat PostgREST menolak dengan 42703 dan seluruh halaman
    // jatuh ke error boundary.
    return this.listRowsForIds(
      'product_wallet_grants',
      'product_id, wallet_type, amount',
      'product_id',
      productIds,
    )
  }

  /**
   * Query `IN` yang di-batch.
   *
   * Daftar id yang panjang membuat URL PostgREST melewati batas header server
   * (±16KB) dan permintaan gagal dengan `UND_ERR_HEADERS_OVERFLOW` — insiden
   * yang pernah menjatuhkan `/admin/assessments`. Karena itu filter
   * dipecah memakai helper batching yang sudah ada.
   */
  private async listRowsForIds(
    table: 'product_prices' | 'product_wallet_grants',
    select: string,
    column: 'product_id',
    ids: readonly string[],
  ) {
    const unique = [...new Set(ids.filter(Boolean))]
    if (unique.length === 0) return [] as Array<Record<string, unknown>>
    const admin = await createAdminClient()
    const rows: Array<Record<string, unknown>> = []
    for (const chunk of chunkValues(unique)) {
      const { data, error } = await admin.from(table).select(select).in(column, chunk)
      if (error) throw error
      rows.push(...((data ?? []) as unknown as Array<Record<string, unknown>>))
    }
    return rows
  }
}

export const adminWorkspaceService = new AdminWorkspaceService()
