/**
 * Logika murni untuk panel review massal (`components/admin/ReviewBatchPanel.tsx`).
 *
 * Dipisah dari komponen supaya keputusan "langkah mana yang boleh dijalankan"
 * dapat diuji tanpa React maupun database. Ini bagian yang paling mudah salah:
 * kalau gating-nya keliru, tombol bisa memanggil RPC massal pada batch yang
 * belum siap, atau menyembunyikan tombol yang justru dibutuhkan.
 */

export type ReviewStage = 'editorial' | 'academic' | 'technical_qa'

export type BatchRow = {
    status: string
    reviewerId: string | null
    authorId: string | null
}

export type BatchSummary = {
    total: number
    byStatus: Record<string, number>
    /** Jumlah soal yang reviewer-nya benar-benar aktor ini (syarat RPC massal). */
    assignedToMe: number
    /** Soal pra-approval yang belum punya reviewer sah — inilah yang akan diklaim. */
    unassigned: number
    /** Sisa importer legacy: `reviewer_id` menunjuk author sendiri. */
    selfAssigned: number
    /** Tahap review terdalem yang sedang aktif, bila ada. */
    activeStage: ReviewStage | null
    /** Semua tahap yang muncul bersamaan (batch tidak seragam). */
    activeStages: ReviewStage[]
    /** Semua soal sudah terbit. */
    isDone: boolean
    /** Jumlah soal yang siap diterbitkan. */
    approved: number
    /** Masih ada soal yang perlu dikirim ke alur review. */
    needsPrepare: boolean
    /** Apakah ada sesuatu yang bisa dikerjakan pada langkah mana pun. */
    actionable: boolean
}

export const STATUS_ORDER = [
    'draft',
    'submitted',
    'editorial_review',
    'academic_review',
    'technical_qa',
    'revision_required',
    'approved',
    'published',
    'rejected',
] as const

export const STATUS_LABEL: Record<string, string> = {
    draft: 'Draft',
    submitted: 'Submitted',
    editorial_review: 'Editorial',
    academic_review: 'Akademik',
    technical_qa: 'QA Teknis',
    revision_required: 'Perlu revisi',
    approved: 'Approved',
    published: 'Terbit',
    rejected: 'Ditolak',
}

export const STAGE_LABEL: Record<ReviewStage, string> = {
    editorial: 'Editorial',
    academic: 'Akademik',
    technical_qa: 'QA Teknis',
}

/** Status soal -> tahap review yang sedang berjalan. */
const STAGE_BY_STATUS: Record<string, ReviewStage> = {
    submitted: 'editorial',
    editorial_review: 'editorial',
    academic_review: 'academic',
    technical_qa: 'technical_qa',
}

/** Urutan tahap; `submitted` dihitung sebagai editorial karena belum diklaim. */
const STAGE_PRIORITY: ReviewStage[] = ['editorial', 'academic', 'technical_qa']

/** Status yang berarti soal sudah masuk (atau pernah masuk) alur review. */
export const IN_REVIEW_STATUSES = new Set([
    'submitted',
    'editorial_review',
    'academic_review',
    'technical_qa',
])

/** Status yang boleh dikirim ke review oleh langkah 1. */
export const SUBMITTABLE_STATUSES = new Set(['draft', 'revision_required'])

/**
 * Kode batch review massal yang dikenal.
 *
 * Satu definisi untuk panel dan action: sebelumnya daftar ini ditulis terpisah
 * (`BATCH_CODE` di komponen, `BATCH_CODES` di action), sehingga menambah batch
 * baru bisa membuat panel menawarkan kode yang justru ditolak server.
 */
export const REVIEW_BATCH_CODES = ['cpns-full-tryout-1'] as const
export type ReviewBatchCode = (typeof REVIEW_BATCH_CODES)[number]
export const DEFAULT_REVIEW_BATCH_CODE: ReviewBatchCode = REVIEW_BATCH_CODES[0]

export function isReviewBatchCode(value: string): value is ReviewBatchCode {
    return (REVIEW_BATCH_CODES as readonly string[]).includes(value)
}

/**
 * Status setelah review selesai. `reviewer_id` memang dikosongkan di sini oleh
 * `publish_question`/`review_question_stage`, jadi soal pada status ini BUKAN
 * "belum ada reviewer" — menghitungnya begitu hanya membuat panel berisik.
 */
export const POST_REVIEW_STATUSES = new Set(['approved', 'published', 'rejected'])

/**
 * Semua tahap review yang muncul pada sekumpulan soal, terurut dari terdalem.
 *
 * Biasanya berisi satu tahap. Bila batch tidak seragam (mis. sebagian sudah
 * akademik, sebagian masih editorial) hasilnya berisi beberapa — dan itu penting
 * untuk dilaporkan apa adanya, bukan diratakan ke satu label.
 *
 * `submitted` dihitung sebagai editorial: soal sudah dikirim tetapi belum
 * diklaim reviewer, dan `claim_pilot_review_stage` menanganinya bersama
 * `editorial_review`.
 */
export function activeStagesFor(rows: BatchRow[]): ReviewStage[] {
    const present = new Set<ReviewStage>()
    for (const row of rows) {
        const stage = STAGE_BY_STATUS[row.status]
        if (stage) present.add(stage)
    }
    return STAGE_PRIORITY.filter((stage) => present.has(stage))
}

/** Tahap terdalem yang aktif — yang harus diselesaikan lebih dulu. */
export function activeStageFor(rows: BatchRow[]): ReviewStage | null {
    return activeStagesFor(rows)[0] ?? null
}

export function summarizeBatch(rows: BatchRow[], actorId: string): BatchSummary {
    const byStatus: Record<string, number> = {}
    for (const row of rows) byStatus[row.status] = (byStatus[row.status] ?? 0) + 1

    // Soal draft hasil importer legacy membawa `reviewer_id = author_id`: nilai
    // sisa yang tidak berarti karena soal belum pernah masuk review.
    // `submit_question_for_review` mengosongkannya. Tanpa menghitungnya sebagai
    // "belum ada reviewer", panel akan melaporkan 0 padahal belum ada satu pun
    // reviewer yang sah.
    let assignedToMe = 0
    let unassigned = 0
    let selfAssigned = 0
    for (const row of rows) {
        const postReview = POST_REVIEW_STATUSES.has(row.status)
        if (row.reviewerId === null) {
            if (!postReview) unassigned += 1
            continue
        }
        if (row.reviewerId === row.authorId) {
            if (!postReview) {
                selfAssigned += 1
                unassigned += 1
            }
            continue
        }
        if (row.reviewerId === actorId) assignedToMe += 1
    }

    const total = rows.length
    const approved = byStatus.approved ?? 0
    const published = byStatus.published ?? 0
    const activeStages = activeStagesFor(rows)
    const needsPrepare = rows.some((row) => SUBMITTABLE_STATUSES.has(row.status))

    return {
        total,
        byStatus,
        assignedToMe,
        unassigned,
        selfAssigned,
        activeStage: activeStages[0] ?? null,
        activeStages,
        isDone: total > 0 && published === total,
        approved,
        needsPrepare,
        actionable: needsPrepare || activeStages.length > 0 || approved > 0,
    }
}

/**
 * Langkah berikutnya yang paling masuk akal, dipakai untuk menonjolkan panduan.
 * Tidak pernah dipakai untuk menyembunyikan tombol — operator tetap boleh
 * menjalankan langkah mana pun yang izinnya dimiliki.
 *
 * `unassigned > 0` SENGAJA tidak mengarahkan ke langkah 1: langkah 2 sudah
 * mengklaim sendiri (`claim_pilot_review_stage` lalu
 * `bulk_review_pilot_stage`), jadi setiap tahap cukup satu klik. Mengarahkan
 * operator bolak-balik 1-2-1-2 hanya menambah klik tanpa menambah kendali —
 * keputusan tetap harus diklik eksplisit di langkah 2.
 */
export function nextStep(summary: BatchSummary): 1 | 2 | 3 | null {
    if (summary.isDone) return null
    if (summary.needsPrepare) return 1
    if (summary.activeStages.length > 0) return 2
    if (summary.approved > 0) return 3
    return null
}
