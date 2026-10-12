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

export type AdminStatusVariant =
  'neutral' | 'blue' | 'green' | 'yellow' | 'orange' | 'red' | 'violet'

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
    case 'ready':
    case 'live':
    case 'completed':
      return 'green'
    case 'unavailable':
      return 'yellow'
    case 'blocked':
    case 'blocked_asset':
    case 'blocked_content':
      return 'red'
    case 'draft':
      return 'neutral'
    case 'submitted':
    case 'editorial_review':
    case 'pending':
    case 'not_started':
      return 'yellow'
    case 'academic_review':
      return 'violet'
    case 'scheduled':
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
    draft: 'Draft',
    ready: 'Siap',
    unavailable: 'Belum tersedia',
    blocked: 'Terblokir',
    blocked_asset: 'Aset terblokir',
    blocked_content: 'Konten terblokir',
    needs_review: 'Perlu ditinjau',
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
    closed: 'Berakhir',
    ended: 'Selesai',
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
  EVENT_TICKET: 'Tiket event',
}

export function adminProductTypeLabel(value: unknown): string {
  const raw = String(value ?? '')
  if (!raw) return '—'
  return PRODUCT_TYPE_LABELS[raw] ?? raw.replace(/_/g, ' ').toLowerCase()
}

/** Label tipe ujian untuk kartu dan form admin. */
const EXAM_TYPE_LABELS: Record<string, string> = {
  DRILL: 'Drill',
  DIAGNOSTIC: 'Diagnostik',
  MINI_TRYOUT: 'Mini Tryout',
  FULL_TRYOUT: 'Tryout',
  EVENT: 'Ujian event',
  REMEDIAL: 'Remedial',
}

export function adminExamTypeLabel(value: unknown): string {
  const raw = String(value ?? '')
  if (!raw) return '—'
  return EXAM_TYPE_LABELS[raw.toUpperCase()] ?? raw.replace(/_/g, ' ').toLowerCase()
}

/** Label jenis entitas audit untuk `/admin/settings/audit` (nilai filter tetap mentah). */
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
  organization_exam_assignment: 'Penugasan assessment',
  event_session: 'Sesi event',
  user: 'Pengguna',
  profile: 'Profil',
  role: 'Peran',
  wallet: 'Dompet',
  voucher: 'Voucher',
  feature_flag: 'Feature flag',
  certificate_template: 'Template sertifikat',
  track_period: 'Periode track',
  settings: 'Pengaturan',
  system_setting: 'Pengaturan',
}

export function adminEntityTypeLabel(value: unknown): string {
  const raw = String(value ?? '')
  if (!raw) return '—'
  const normalized = raw.toLowerCase().replace(/[\s-]+/g, '_')
  return ENTITY_TYPE_LABELS[raw] ?? ENTITY_TYPE_LABELS[normalized] ?? raw.replace(/_/g, ' ')
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
  'question workflow academic review': 'Review akademik dimulai',
  'question workflow approved': 'Review disetujui',
  'question workflow editorial review': 'Review editorial dimulai',
  'question workflow reviewer changed': 'Reviewer diperbarui',
  'question workflow technical qa': 'QA teknis dimulai',
  QUESTION_WORKFLOW_ACADEMIC_REVIEW: 'Review akademik dimulai',
  QUESTION_WORKFLOW_APPROVED: 'Review disetujui',
  QUESTION_WORKFLOW_EDITORIAL_REVIEW: 'Review editorial dimulai',
  QUESTION_WORKFLOW_REVIEWER_CHANGED: 'Reviewer diperbarui',
  QUESTION_WORKFLOW_TECHNICAL_QA: 'QA teknis dimulai',
  CREATE_PRODUCT: 'Produk dibuat',
  UPDATE_PRODUCT: 'Produk diperbarui',
  ARCHIVE_PRODUCT: 'Produk diarsipkan',
  CREATE_EVENT: 'Event dibuat',
  UPDATE_EVENT: 'Event diperbarui',
  ARCHIVE_EVENT: 'Event diarsipkan',
  CREATE_EVENT_SESSION: 'Sesi event dibuat',
  UPDATE_EVENT_SESSION: 'Sesi event diperbarui',
  DELETE_EVENT_SESSION: 'Sesi event dihapus',
  CREATE_EXAM: 'Assessment dibuat',
  UPDATE_EXAM: 'Assessment diperbarui',
  PUBLISH_EXAM: 'Assessment diaktifkan',
  ARCHIVE_EXAM: 'Assessment diarsipkan',
  CREATE_EXAM_SECTION: 'Bagian assessment ditambahkan',
  UPDATE_EXAM_SECTION: 'Bagian assessment diperbarui',
  CREATE_ORGANIZATION: 'Instansi dibuat',
  UPDATE_ORGANIZATION: 'Instansi diperbarui',
  DELETE_ORGANIZATION: 'Instansi dihapus',
  CREATE_BATCH: 'Batch dibuat',
  UPDATE_BATCH: 'Batch diperbarui',
  CREATE_ASSIGNMENT: 'Penugasan dibuat',
  UPDATE_ASSIGNMENT: 'Penugasan diperbarui',
  IMPORT_PARTICIPANTS: 'Peserta diimpor',
  REMOVE_PARTICIPANT: 'Peserta dikeluarkan',
  SET_PARTICIPANT_STATUS: 'Status peserta diperbarui',
  SET_ASSIGNMENT_ACTIVE: 'Status penugasan diperbarui',
  SET_TRACK_PERIOD_ACTIVE: 'Periode track diperbarui',
  SET_USER_STATUS: 'Status pengguna diperbarui',
  ROTATE_BATCH_INVITE: 'Kode undangan batch diperbarui',
  ADJUST_WALLET: 'Saldo token disesuaikan',
  UPSERT_VOUCHER: 'Voucher disimpan',
  LINK_EVENT_PRODUCT: 'Produk event diperbarui',
  UPSERT_CERTIFICATE_TEMPLATE: 'Template sertifikat disimpan',
  UPSERT_FEATURE_FLAG: 'Feature flag diperbarui',
  UPSERT_SYSTEM_SETTING: 'Pengaturan sistem diperbarui',
  DELETE_SYSTEM_SETTING: 'Pengaturan sistem dihapus',
  ASSIGN_USER_ROLE: 'Peran diberikan kepada pengguna',
  REVOKE_USER_ROLE: 'Peran dicabut dari pengguna',
  CREATE_QUESTION: 'Soal dibuat',
  UPDATE_QUESTION: 'Soal diperbarui',
  PUBLISH_QUESTION: 'Soal diterbitkan',
  ARCHIVE_QUESTION: 'Soal diarsipkan',
  REVISE_QUESTION: 'Soal dikembalikan ke draf',
  CREATE_ARTICLE: 'Artikel dibuat',
  UPDATE_ARTICLE: 'Artikel diperbarui',
  PUBLISH_ARTICLE: 'Artikel diterbitkan',
  ARCHIVE_ARTICLE: 'Artikel diarsipkan',
  DELETE_ARTICLE: 'Artikel dihapus',
}

export function adminAuditLabel(action: unknown): string {
  const raw = String(action ?? '')
  if (!raw) return '—'
  const normalized = raw
    .trim()
    .replace(/[\s.-]+/g, '_')
    .toUpperCase()
  return (
    AUDIT_LABELS[raw] ??
    AUDIT_LABELS[normalized] ??
    AUDIT_LABELS[raw.toLowerCase()] ??
    raw.replace(/[._]+/g, ' ')
  )
}
