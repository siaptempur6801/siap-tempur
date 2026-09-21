import { z } from 'zod'
import { parseQuestionOptions } from '@/lib/question-options'

const optionalId = z.union([z.uuid(), z.literal('')]).transform((v) => v || null)

/**
 * Timestamp ISO 8601 yang benar-benar dikirim Postgres (`to_jsonb(timestamptz)`),
 * mis. `2026-09-21T06:26:21.123456+00:00`.
 *
 * Sebelumnya token concurrency hanya diuji `Date.parse()`, yang menerima format
 * longgar seperti `21 Sep 2026` — lolos di aplikasi lalu gagal saat di-cast ke
 * `timestamptz` di RPC, dan admin hanya melihat pesan generik. Pola ini adalah
 * format tunggal yang boleh masuk; sisanya ditolak sebelum menyentuh database.
 */
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}(?::?\d{2})?)$/
export function isIsoTimestamp(value: string) {
    return ISO_TIMESTAMP.test(value) && Number.isFinite(Date.parse(value))
}

export const questionBankSchema = z.object({
    id: optionalId,
    program: z.enum(['CPNS', 'TKA']), track: z.enum(['SKD', 'SD', 'SMP', 'SMA']),
    subject: z.string().trim().min(1).max(30),
    questionType: z.enum(['single_choice', 'multiple_choice', 'category']),
    stem: z.string().min(1).max(50000).refine((v) => !!v.trim(), 'Pertanyaan wajib diisi.'),
    difficulty: z.enum(['easy', 'medium', 'hard']),
    explanation: z.string().max(50000), sourceReference: z.string().max(2000),
    cognitiveLevel: z.string().max(100),
    estimatedSeconds: z.union([z.literal(''), z.coerce.number().int().min(1).max(86400)]),
    stimulusId: optionalId, knowledgeNodeId: optionalId,
    changeReason: z.string().trim().min(1, 'Alasan perubahan wajib diisi.').max(2000),
    expectedVersion: z.coerce.number().int().min(0), expectedUpdatedAt: z.string().trim().max(60),
    options: z.string().max(300000),
}).superRefine((v, ctx) => {
    if ((v.program === 'CPNS') !== (v.track === 'SKD')) ctx.addIssue({ code: 'custom', path: ['track'], message: 'Program dan jenjang tidak cocok.' })
    if (v.id && (v.expectedVersion < 1 || !isIsoTimestamp(v.expectedUpdatedAt))) ctx.addIssue({ code: 'custom', path: ['expectedVersion'], message: 'Versi soal tidak valid. Muat ulang soal.' })
})

/** Payload tindakan workflow (`publish`/`archive`/`revise`) dari form tersembunyi. */
export const questionBankWorkflowSchema = z.object({
    id: z.uuid(), program: z.enum(['CPNS', 'TKA']), track: z.enum(['SKD', 'SD', 'SMP', 'SMA']),
    expectedVersion: z.coerce.number().int().min(1), expectedUpdatedAt: z.string().trim().max(60).refine(isIsoTimestamp, 'Versi soal tidak valid. Muat ulang soal.'),
    operation: z.enum(['publish', 'archive', 'revise']), changeReason: z.string().trim().min(1).max(2000),
})

export type QuestionBankValues = z.input<typeof questionBankSchema>
export type QuestionBankState = { error?: string; fields?: Record<string, string>; conflict?: boolean }

/**
 * Field identitas yang dikirim sebagai input tersembunyi dan tidak dapat diedit
 * admin. Kegagalannya tidak boleh dipetakan ke `fields`: form hanya menandai
 * input yang terlihat, sehingga error itu akan tampil sebagai "Periksa isian
 * yang ditandai" tanpa satu pun tanda di layar — jalan buntu.
 */
const QUESTION_BANK_IDENTITY_FIELDS = new Set(['id', 'program', 'track', 'expectedVersion', 'expectedUpdatedAt'])

/**
 * Memetakan isu zod menjadi state form Question Bank.
 *
 * Isu pada field yang terlihat menjadi `fields` (ditampilkan di dekat input);
 * isu identitas tersembunyi menjadi pesan tingkat atas yang meminta muat ulang.
 */
export function questionBankFieldErrors(issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>): QuestionBankState {
    const fields: Record<string, string> = {}
    let identityMessage: string | null = null
    for (const issue of issues) {
        const key = String(issue.path[0] ?? '')
        if (QUESTION_BANK_IDENTITY_FIELDS.has(key)) identityMessage ??= issue.message
        else if (key && !fields[key]) fields[key] = issue.message
    }
    const hasFields = Object.keys(fields).length > 0
    if (identityMessage) return { error: 'Versi atau konteks soal tidak valid. Muat ulang halaman, lalu coba lagi.', ...(hasFields ? { fields } : {}) }
    return { error: 'Periksa isian yang ditandai.', fields }
}
export type QuestionBankChoice = { id: string; subject_id: string; name?: string; title?: string; content?: string; image_url?: string | null }
export type QuestionBankDetail = {
    question: Record<string, unknown> | null; options: Record<string, unknown>[];
    explanation: string; knowledgeNodeId: string;
    stimuli: QuestionBankChoice[]; knowledgeNodes: QuestionBankChoice[];
    versions: { version: number; change_reason: string; created_at: string }[];
}

export function validateBankOptions(type: string, raw: string) {
    const options = parseQuestionOptions(raw)
    if (options.length < 2 || options.length > 100) throw new Error('Gunakan 2–100 opsi jawaban.')
    const keys = options.map((o) => o.key)
    if (keys.some((key) => !/^[A-Z0-9_-]{1,16}$/.test(key)) || new Set(keys).size !== keys.length) throw new Error('Kode opsi harus unik, 1–16 huruf/angka, tanda - atau _.')
    for (const o of options) {
        if (!o.content.trim() || o.content.length > 20000) throw new Error('Isi setiap opsi wajib diisi, maksimal 20.000 karakter.')
        if (o.score !== null && (o.score < 0 || o.score > 99999999.99 || Math.abs(o.score * 100 - Math.round(o.score * 100)) > 0.00001)) throw new Error('Skor harus positif atau nol, maksimal dua angka desimal.')
        if (o.responseGroup && o.responseGroup.length > 200) throw new Error('Nama kategori terlalu panjang.')
        if (o.imageUrl && (o.imageUrl.length > 2000 || !/^https:\/\//i.test(o.imageUrl))) throw new Error('URL gambar harus menggunakan https.')
        if (o.imageUrl) { try { const url = new URL(o.imageUrl); if (url.username || url.password) throw new Error() } catch { throw new Error('URL gambar tidak valid.') } }
    }
    const correct = options.filter((o) => o.isCorrect === true).length
    if (type === 'single_choice' && correct !== 1) throw new Error('Pilihan tunggal harus memiliki tepat satu jawaban benar.')
    if (type === 'multiple_choice' && (options.length < 3 || correct < 2 || correct >= options.length)) throw new Error('Pilihan majemuk membutuhkan minimal tiga opsi dan minimal dua jawaban benar, tetapi tidak semuanya benar.')
    if (type === 'category') {
        const groups = new Set(options.map((o) => o.responseGroup?.trim()))
        if (groups.has(undefined) || groups.has('') || groups.size < 2) throw new Error('Kategori membutuhkan minimal dua kelompok; isi kategori pada setiap opsi.')
        for (const group of groups) {
            const rows = options.filter((o) => o.responseGroup?.trim() === group)
            if (rows.length < 2 || rows.filter((o) => o.isCorrect === true).length !== 1) throw new Error('Setiap kategori membutuhkan minimal dua opsi dan tepat satu jawaban benar.')
        }
    }
    return options
}

export function questionBankReturnUrl(form: FormData, message?: string) {
    const q = new URLSearchParams()
    for (const key of ['program', 'track', 'q', 'status', 'subject', 'page']) {
        const value = form.get(`return_${key}`)
        if (typeof value === 'string' && value.length <= 300) q.set(key, value)
    }
    if (message) q.set('ok', message)
    return `/admin/content/questions?${q}`
}
