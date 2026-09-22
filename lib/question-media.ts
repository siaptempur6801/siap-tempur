/**
 * Unggah gambar soal & opsi.
 *
 * Bagian murni (validasi, path, markup, penyisipan di kursor) dipisah dari
 * komponen agar dapat diuji tanpa browser maupun jaringan; komponen hanya
 * mengurus pemilihan berkas dan panggilan storage.
 */

export const QUESTION_IMAGE_BUCKET = 'question-images'
export const QUESTION_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif'
export const QUESTION_IMAGE_MAX_BYTES = 2 * 1024 * 1024
/** Batas berkas sebelum dikompres (foto ponsel/screenshot sering >2 MB). */
export const QUESTION_IMAGE_MAX_INPUT_BYTES = 8 * 1024 * 1024
/** Di bawah ini tidak perlu dikompres. */
export const QUESTION_IMAGE_COMPRESS_THRESHOLD = 512 * 1024
/** Sisi terpanjang setelah dikompres. */
export const QUESTION_IMAGE_MAX_DIMENSION = 1600

const MIME_EXTENSIONS: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
}

/** Pesan kesalahan untuk berkas yang tidak memenuhi syarat, atau null bila lolos. */
export function validateQuestionImage(file: { size: number; type: string }): string | null {
    if (!MIME_EXTENSIONS[file.type]) return 'Format gambar harus JPG, PNG, WebP, atau GIF.'
    if (file.size > QUESTION_IMAGE_MAX_BYTES) return 'Ukuran gambar maksimal 2 MB.'
    if (file.size <= 0) return 'Berkas gambar kosong.'
    return null
}

/**
 * Validasi berkas MENTAH sebelum dikompres.
 *
 * Batasnya lebih longgar (8 MB) karena hasil kompresi biasanya jauh di bawah
 * 2 MB; yang divalidasi ketat adalah berkas final yang benar-benar diunggah.
 */
export function validateQuestionImageInput(file: { size: number; type: string }): string | null {
    if (!MIME_EXTENSIONS[file.type]) return 'Format gambar harus JPG, PNG, WebP, atau GIF.'
    if (file.size > QUESTION_IMAGE_MAX_INPUT_BYTES) return 'Ukuran gambar maksimal 8 MB sebelum dikompres.'
    if (file.size <= 0) return 'Berkas gambar kosong.'
    return null
}

/** Faktor skala agar sisi terpanjang tidak melewati `maxDimension` (tidak pernah >1). */
export function compressionScale(width: number, height: number, maxDimension = QUESTION_IMAGE_MAX_DIMENSION): number {
    const longest = Math.max(width, height)
    if (!Number.isFinite(longest) || longest <= 0) return 1
    return Math.min(1, maxDimension / longest)
}

/** Nama berkas hasil kompresi (selalu WebP agar transparansi tetap aman). */
export function compressedFileName(name: string): string {
    const base = name.replace(/\.[^.]*$/, '').replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 60) || 'gambar'
    return `${base}.webp`
}

/** GIF dilewati agar animasinya tidak hilang; sisanya dikompres bila besar. */
export function shouldCompressQuestionImage(file: { size: number; type: string }): boolean {
    return file.type !== 'image/gif' && file.size > QUESTION_IMAGE_COMPRESS_THRESHOLD
}

export function questionImageExtension(file: { name?: string; type: string }): string {
    const fromMime = MIME_EXTENSIONS[file.type]
    if (fromMime) return fromMime
    const fromName = file.name?.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') ?? ''
    return fromName || 'png'
}

/** Path penyimpanan: `questions/<uid>/<uuid>.<ext>` — folder per pengguna. */
export function questionImagePath(userId: string, file: { name?: string; type: string }, uniqueId: string): string {
    return `questions/${userId}/${uniqueId}.${questionImageExtension(file)}`
}

/** Markup yang dirender `MathRenderer` untuk gambar. */
export function questionImageMarkup(url: string): string {
    return `[[image:${url}]]`
}

/**
 * Menyisipkan teks pada posisi kursor/selection sebuah textarea.
 *
 * Dipakai tombol "Sisipkan gambar"/"rumus" agar teks masuk di tempat penulis
 * menulis, bukan selalu di akhir. `cursorBack` menggeser kursor mundur dari
 * akhir sisipan — dipakai snippet rumus agar kursor berhenti di dalam `{}`.
 */
export function insertAtSelection(value: string, selectionStart: number, selectionEnd: number, insertion: string, cursorBack = 0): { value: string; cursor: number } {
    const start = Math.max(0, Math.min(selectionStart, value.length))
    const end = Math.max(start, Math.min(selectionEnd, value.length))
    const before = value.slice(0, start)
    const after = value.slice(end)
    const needsLeadingSpace = before.length > 0 && !/\s$/.test(before) && !before.endsWith('>')
    const prefix = needsLeadingSpace ? ' ' : ''
    const next = `${before}${prefix}${insertion}${after}`
    const cursor = Math.max(before.length + prefix.length, before.length + prefix.length + insertion.length - Math.max(0, cursorBack))
    return { value: next, cursor }
}
