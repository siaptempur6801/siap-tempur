/**
 * Paginasi daftar admin.
 *
 * ## Kenapa ini ada
 *
 * Semua daftar admin sebelumnya memuat satu jendela tetap lalu **diam tentang
 * sisanya**: soal 80 baris terbaru, exam 80, product/event 50, artikel tanpa
 * batas sama sekali. Halaman `/admin/users` bahkan sudah mencetak "100 dari N"
 * tanpa satu pun cara menuju sisanya — admin melihat angka 428 pengguna dan
 * tidak bisa menemukan 328 di antaranya.
 *
 * Lebih buruk lagi untuk pencarian: `q` disaring di klien atas baris yang sudah
 * terpotong, sehingga mencari pengguna ke-400 selalu menjawab "tidak ada" —
 * jawaban yang salah, bukan sekadar kosong.
 *
 * Modul ini menyatukan tiga hal yang sebelumnya ditulis ulang per halaman:
 * membaca nomor halaman dari URL, menyusun tautan halaman yang mempertahankan
 * filter, dan kalimat "menampilkan X–Y dari Z". Ia bebas dependensi supaya bisa
 * diuji langsung.
 */

/** Jumlah baris per halaman untuk seluruh daftar admin. */
export const ADMIN_PAGE_SIZE = 25

/**
 * Batas atas nomor halaman yang diterima dari URL.
 *
 * Nomor halaman datang dari pengguna. Offset raksasa (mis. `?page=999999999`)
 * akan dikirim apa adanya ke database dan memaksa PostgREST memindai jauh ke
 * dalam tabel. Batas ini murni penjagaan biaya, bukan batas fungsional: 10.000
 * halaman × 25 baris = 250.000 baris, jauh di atas kebutuhan operasional.
 */
export const ADMIN_MAX_PAGE = 10_000

/** Nomor halaman dari query string, selalu ≥1 dan tidak melewati batas. */
export function parseAdminPage(value: string | string[] | undefined): number {
    const raw = Array.isArray(value) ? value[0] : value
    const parsed = Number.parseInt(String(raw ?? ''), 10)
    if (!Number.isFinite(parsed) || parsed < 1) return 1
    return Math.min(parsed, ADMIN_MAX_PAGE)
}

/** Offset database untuk halaman ke-`page`. */
export function adminOffset(page: number, pageSize = ADMIN_PAGE_SIZE): number {
    return (Math.max(1, page) - 1) * pageSize
}

export function adminTotalPages(total: number, pageSize = ADMIN_PAGE_SIZE): number {
    if (!Number.isFinite(total) || total <= 0) return 1
    return Math.max(1, Math.ceil(total / pageSize))
}

export type AdminPageSummary = {
    /** Jumlah baris yang benar-benar ditampilkan di halaman ini. */
    shown: number
    /** Indeks baris pertama pada halaman ini (1-based); 0 bila tidak ada baris. */
    from: number
    /** Indeks baris terakhir pada halaman ini (1-based); 0 bila tidak ada baris. */
    to: number
    total: number
    page: number
    totalPages: number
    /** Benar bila masih ada baris yang belum ditampilkan. */
    capped: boolean
}

/**
 * Ringkasan halaman.
 *
 * `capped` yang membedakan "ini memang seluruh datanya" dari "ini baru
 * sepotong" — pembeda yang sebelumnya tidak ada di UI mana pun.
 */
export function adminPageSummary(page: number, shown: number, total: number, pageSize = ADMIN_PAGE_SIZE): AdminPageSummary {
    const totalPages = adminTotalPages(total, pageSize)
    const from = shown === 0 ? 0 : adminOffset(page, pageSize) + 1
    const to = shown === 0 ? 0 : from + shown - 1
    return { shown, from, to, total, page, totalPages, capped: total > to }
}

/** Kalimat status daftar, dipakai sebagai deskripsi section. */
export function adminPageSummaryLabel(summary: AdminPageSummary, noun: string, plural = noun): string {
    const word = (count: number) => (count === 1 ? noun : plural)
    if (summary.total === 0) return `Belum ada ${noun}.`
    if (summary.shown === 0) return `Tidak ada ${noun} pada halaman ${summary.page}.`
    const range = `Menampilkan ${summary.from}–${summary.to} dari ${summary.total} ${word(summary.total)}.`
    if (!summary.capped) return range
    return `${range} Halaman ${summary.page} dari ${summary.totalPages}.`
}

/**
 * Menyusun tautan yang mempertahankan seluruh filter yang sedang aktif.
 *
 * Nilai kosong dibuang supaya URL tetap bersih, dan `page` selalu ditulis
 * terakhir agar tidak bisa tertimpa filter.
 */
export function adminPageHref(
    pathname: string,
    current: Record<string, string | undefined>,
    page: number,
): string {
    const query = new URLSearchParams()
    for (const [key, value] of Object.entries(current)) {
        if (key === 'page') continue
        if (value === undefined || value === '') continue
        query.set(key, value)
    }
    if (page > 1) query.set('page', String(page))
    const search = query.toString()
    return search ? `${pathname}?${search}` : pathname
}
