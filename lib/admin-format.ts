/**
 * Formatter & label bersama untuk seluruh halaman admin.
 *
 * Setiap halaman admin sebelumnya meng-copy fungsi yang sama (`fmt`, `fmtDate`,
 * `rupiah`, `number`, `statusVariant`, `localDateTime`) dengan bentuk yang
 * berbeda-beda. Modul ini menyatukannya agar nilai yang sama selalu tampil
 * dengan cara yang sama di semua halaman (`docs/ADMIN_UI_UX_STANDARD.md` §6-§8).
 */

const TIME_ZONE = 'Asia/Jakarta'

const dateTimeFormatter = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: TIME_ZONE,
})

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeZone: TIME_ZONE,
})

const numberFormatter = new Intl.NumberFormat('id-ID')

const rupiahFormatter = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
})

/** `19 Sep 2026, 14.05` — diteruskan ke tanggal tidak valid atau kosong → `—`. */
export function formatDateTime(value: unknown): string {
    if (value == null || value === '') return '—'
    const date = new Date(String(value))
    if (Number.isNaN(date.getTime())) return String(value)
    return dateTimeFormatter.format(date)
}

/** `19 Sep 2026` — untuk kedaluwarsa, tanggal terdaftar, dan sejenisnya. */
export function formatDate(value: unknown): string {
    if (value == null || value === '') return '—'
    const date = new Date(String(value))
    if (Number.isNaN(date.getTime())) return String(value)
    return dateFormatter.format(date)
}

/** `1.234` — jumlah baris, saldo token, dan statistik lainnya. */
export function formatNumber(value: unknown): string {
    const parsed = typeof value === 'number' ? value : Number(value ?? 0)
    return numberFormatter.format(Number.isFinite(parsed) ? parsed : 0)
}

/** `Rp1.234.567` — harga produk, pendapatan, dan jumlah order. */
export function formatRupiah(value: unknown): string {
    const parsed = typeof value === 'number' ? value : Number(value ?? 0)
    return rupiahFormatter.format(Number.isFinite(parsed) ? parsed : 0)
}

/** Monoton `1.234 — token` tanpa satuan; dipakai di sel tabel. */
export function formatAmountSigned(value: unknown): string {
    const parsed = typeof value === 'number' ? value : Number(value ?? 0)
    const text = numberFormatter.format(Math.abs(parsed))
    if (parsed > 0) return `+${text}`
    if (parsed < 0) return `-${text}`
    return text
}

/**
 * Nilai untuk `<input type="datetime-local">` dalam WIB.
 *
 * Database menyimpan UTC; input lokal mengharapkan WIB, jadi waktu digeser
 * +7 jam tanpa menambah dependency zona-waktu.
 */
export function formatLocalDateTimeInput(value: unknown): string {
    if (value == null || value === '') return ''
    const date = new Date(String(value))
    if (Number.isNaN(date.getTime())) return ''
    return new Date(date.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 16)
}

export type AdminStatusVariant = 'neutral' | 'blue' | 'green' | 'yellow' | 'orange' | 'red' | 'violet'

/**
 * Peta warna badge untuk status lintas domain.
 *
 * Green = berjalan/sukses, yellow = menunggu tindakan, violet = tahap akademik,
 * blue = tahap teknis/mendaftar, orange = perlu revisi/ditarik, red =
 * gagal/dicabut, neutral = darsip/selesai/draf mati.
 */
export function adminStatusVariant(value: unknown): AdminStatusVariant {
    const status = String(value ?? '').toLowerCase()
    switch (status) {
        case 'active':
        case 'published':
        case 'approved':
        case 'paid':
        case 'live':
        case 'completed':
            return 'green'
        case 'draft':
        case 'submitted':
        case 'editorial_review':
        case 'pending':
        case 'scheduled':
        case 'not_started':
            return 'yellow'
        case 'academic_review':
            return 'violet'
        case 'technical_qa':
        case 'registered':
        case 'in_progress':
            return 'blue'
        case 'revision_required':
        case 'withdrawn':
            return 'orange'
        case 'rejected':
        case 'failed':
        case 'cancelled':
        case 'expired':
        case 'revoked':
        case 'suspended':
            return 'red'
        case 'archived':
        case 'closed':
        case 'inactive':
            return 'neutral'
        default:
            return 'neutral'
    }
}

/**
 * Label manusiawi untuk status machine-readable (`docs/ADMIN_UI_UX_STANDARD.md` §8).
 * Label di sini hanya fallback; service domain yang punya label spesifik
 * (mis. `userStatusLabel`, `batchStatusLabel`) tetap dipakai bila ada.
 */
export function adminStatusLabel(value: unknown): string {
    const raw = String(value ?? '')
    const status = raw.toLowerCase()
    const labels: Record<string, string> = {
        draft: 'Draf',
        submitted: 'Editorial Review',
        editorial_review: 'Editorial Review',
        academic_review: 'Academic Review',
        technical_qa: 'Technical QA',
        revision_required: 'Perlu Revisi',
        approved: 'Disetujui',
        published: 'Terbit',
        rejected: 'Ditolak',
        active: 'Aktif',
        inactive: 'Nonaktif',
        suspended: 'Ditangguhkan',
        pending: 'Menunggu',
        scheduled: 'Terjadwal',
        live: 'Berlangsung',
        closed: 'Selesai',
        archived: 'Diarsipkan',
        cancelled: 'Dibatalkan',
        failed: 'Gagal',
        expired: 'Kedaluwarsa',
        revoked: 'Dicabut',
        registered: 'Terdaftar',
        completed: 'Selesai',
        withdrawn: 'Ditarik',
        not_started: 'Belum mulai',
        in_progress: 'Mengerjakan',
        paid: 'Lunas',
        // Status pembayaran Midtrans (sebelumnya tampil mentah dalam bahasa Inggris).
        settlement: 'Selesai',
        capture: 'Tertangkap',
        deny: 'Ditolak bank',
        expire: 'Kedaluwarsa',
        cancel: 'Dibatalkan',
        refund: 'Dana dikembalikan',
        partial_refund: 'Dana dikembalikan sebagian',
        chargeback: 'Sengketa bank',
    }
    return labels[status] || raw || '—'
}

/** Label tipe soal untuk daftar/detail admin. */
const QUESTION_TYPE_LABELS: Record<string, string> = {
    single_choice: 'Pilihan tunggal',
    multiple_choice: 'Pilihan majemuk',
    category: 'Kategori',
}

export function adminQuestionTypeLabel(value: unknown): string {
    const raw = String(value ?? '')
    if (!raw) return '—'
    return QUESTION_TYPE_LABELS[raw] ?? raw.replace(/_/g, ' ')
}

/** Label jenis produk untuk daftar admin. */
const PRODUCT_TYPE_LABELS: Record<string, string> = {
    TOKEN_PACK: 'Paket token',
    PASS: 'Langganan (pass)',
    EVENT_TICKET: 'Tiket event',
}

export function adminProductTypeLabel(value: unknown): string {
    const raw = String(value ?? '')
    if (!raw) return '—'
    return PRODUCT_TYPE_LABELS[raw] ?? raw.replace(/_/g, ' ').toLowerCase()
}

/** Label jenis entitas audit untuk `/admin/audit` (nilai filter tetap mentah). */
const ENTITY_TYPE_LABELS: Record<string, string> = {
    question: 'Soal',
    content_review: 'Review konten',
    article: 'Artikel',
    product: 'Produk',
    event: 'Event',
    exam: 'Ujian',
    order: 'Pesanan',
    payment: 'Pembayaran',
    organization: 'Instansi',
    organization_participant: 'Peserta instansi',
    organization_batch: 'Batch instansi',
    user: 'Pengguna',
    profile: 'Profil',
    role: 'Peran',
    wallet: 'Dompet',
    voucher: 'Voucher',
    settings: 'Pengaturan',
    system_setting: 'Pengaturan',
}

export function adminEntityTypeLabel(value: unknown): string {
    const raw = String(value ?? '')
    if (!raw) return '—'
    return ENTITY_TYPE_LABELS[raw] ?? raw.replace(/_/g, ' ')
}

/**
 * Label manusiawi untuk `audit_logs.action`.
 *
 * Nilai mentah tetap dipakai sebagai value filter (facets), tetapi tabel dan
 * riwayat audit menampilkannya lewat fungsi ini. Aksi yang belum dipetakan
 * ditampilkan dengan pemisah `_`/`.` diganti spasi supaya tidak tampak seperti
 * kode internal — dan tetap bisa dicari sebagai teks.
 */
const AUDIT_LABELS: Record<string, string> = {
    'question.content.created': 'Soal dibuat (draft)',
    'question.content.updated': 'Soal diperbarui (draft)',
    'question.workflow.submitted': 'Diajukan ke review',
    'question.workflow.published': 'Soal diterbitkan',
    'question.legacy_import.mapping_reviewed': 'Pemetaan soal legacy ditinjau',
    'content.review.created': 'Review dibuat',
    'content.review.assigned': 'Reviewer ditugaskan',
    'content.review.pending': 'Review dimulai',
    'content.review.approved': 'Review disetujui',
    'content.review.revision_required': 'Diminta revisi',
    'content.review.rejected': 'Review ditolak',
    'content.review.cancelled': 'Review dibatalkan',
    CREATE_QUESTION: 'Soal dibuat',
    UPDATE_QUESTION: 'Soal diperbarui',
    PUBLISH_QUESTION: 'Soal diterbitkan',
    ARCHIVE_QUESTION: 'Soal diarsipkan',
    REVISE_QUESTION: 'Soal dikembalikan ke draf',
    REMOVE_PARTICIPANT: 'Peserta dikeluarkan',
    CREATE_ARTICLE: 'Artikel dibuat',
    UPDATE_ARTICLE: 'Artikel diperbarui',
    PUBLISH_ARTICLE: 'Artikel diterbitkan',
    ARCHIVE_ARTICLE: 'Artikel diarsipkan',
    DELETE_ARTICLE: 'Artikel dihapus',
}

export function adminAuditLabel(action: unknown): string {
    const raw = String(action ?? '')
    if (!raw) return '—'
    return AUDIT_LABELS[raw] ?? raw.replace(/[._]+/g, ' ')
}
