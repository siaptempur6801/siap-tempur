/**
 * Serialisasi & parsing opsi soal.
 *
 * Format baris (7 field, dipisah `|`):
 *
 *     key | content | score | isCorrect | responseGroup | groupOrder | imageUrl
 *
 * Format ini adalah **kontrak tersimpan**: `QuestionOptionsEditor` menulisnya ke
 * sebuah `<input type="hidden" name="options">`, dan server action membacanya
 * kembali. Dua sisi itu dulu hidup di berkas berbeda tanpa satu pun test yang
 * mengikat keduanya, dan akibatnya nyata:
 *
 * 1. `app/actions/admin-v2.ts` hanya membaca ENAM field, sehingga `imageUrl`
 *    yang dikirim editor dibuang tanpa pesan apa pun. Gambar opsi hilang saat
 *    disimpan dari Question Bank, meskipun jalur Content Workspace sudah lama
 *    menyimpannya (`app/actions/content-review.ts`).
 * 2. Question Bank sendiri masih memakai textarea mentah berisi
 *    `A|Teks|1|true`, sehingga admin harus menulis format storage — dilarang
 *    `docs/ADMIN_UI_UX_STANDARD.md` §7.
 *
 * Modul ini menjadikan format itu satu-satunya sumber kebenaran untuk kedua sisi.
 * Ia sengaja bebas dependensi (tanpa React, tanpa Supabase) supaya dapat diuji
 * langsung oleh unit test.
 */

export type QuestionOptionInput = {
    key: string
    content: string
    isCorrect: boolean | null
    score: number | null
    sortOrder: number
    responseGroup: string | null
    responseGroupOrder: number | null
    imageUrl: string | null
}

/** Nilai yang diterima sebagai "benar" pada field isCorrect. */
const TRUE_TOKENS = ['true', '1', 'yes', 'ya']

/**
 * Menyusun satu baris payload opsi.
 *
 * `|` dibuang dari field yang mungkin memuatnya (teks opsi, group, URL) karena
 * karakter itu adalah pemisah dan tidak bisa di-escape. Ini perilaku yang sama
 * dengan editor.
 */
export function serializeQuestionOption(option: {
    key: unknown
    content: unknown
    score: unknown
    isCorrect: unknown
    responseGroup?: unknown
    responseGroupOrder?: unknown
    imageUrl?: unknown
}): string {
    const text = (value: unknown) => (value === null || value === undefined ? '' : String(value))
    return [
        text(option.key).trim().toUpperCase(),
        text(option.content).replace(/\r?\n/g, ' ').replace(/\|/g, '/'),
        text(option.score).trim(),
        option.isCorrect === true || text(option.isCorrect).toLowerCase() === 'true' ? 'true' : 'false',
        text(option.responseGroup).replace(/\|/g, '/'),
        text(option.responseGroupOrder).trim(),
        text(option.imageUrl).replace(/\|/g, '/'),
    ].join('|')
}

/**
 * Menyusun payload `options` dari baris `question_options` hasil query.
 *
 * `null` diserialkan sebagai field kosong — bukan `"null"` — karena parser
 * memperlakukan field kosong sebagai `null` kembali. `score` 0 tetap `"0"`;
 * ia berbeda arti dari "tanpa skor".
 */
export function serializeOptionRows(rows: Array<Record<string, unknown>>): string {
    const text = (value: unknown) => (value === null || value === undefined ? '' : String(value))
    return rows.map((row) => [
        text(row.option_key),
        text(row.content).replace(/\r?\n/g, ' '),
        row.score == null ? '' : text(row.score),
        row.is_correct == null ? '' : String(Boolean(row.is_correct)),
        text(row.response_group),
        row.response_group_order == null ? '' : text(row.response_group_order),
        text(row.image_url),
    ].join('|')).join('\n')
}

/**
 * Membaca payload opsi dari `<input name="options">`.
 *
 * Melempar `OPTION_LINE_<n>_INVALID` bila baris ke-n tidak punya kunci atau isi;
 * pesan itu diterjemahkan ke bahasa manusia oleh pemanggil.
 */
export function parseQuestionOptions(raw: string): QuestionOptionInput[] {
    if (!raw.trim()) return []
    const rows = raw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)

    return rows.map((line, index) => {
        const [keyRaw, contentRaw, scoreRaw, correctRaw, groupRaw, groupOrderRaw, imageUrlRaw] = line.split('|').map((part) => part.trim())
        if (!keyRaw || !contentRaw) throw new Error(`OPTION_LINE_${index + 1}_INVALID`)
        const score = scoreRaw === '' || scoreRaw === undefined ? null : Number(scoreRaw)
        if (score !== null && !Number.isFinite(score)) throw new Error(`OPTION_SCORE_${index + 1}_INVALID`)
        const correct = correctRaw?.toLowerCase()
        const isCorrect = correct === undefined || correct === ''
            ? null
            : TRUE_TOKENS.includes(correct)
        const responseGroupOrder = groupOrderRaw === '' || groupOrderRaw === undefined ? null : Number(groupOrderRaw)
        if (responseGroupOrder !== null && (!Number.isInteger(responseGroupOrder) || responseGroupOrder < 1)) {
            throw new Error(`OPTION_GROUP_ORDER_${index + 1}_INVALID`)
        }
        return {
            key: keyRaw.toUpperCase(),
            content: contentRaw,
            score,
            isCorrect,
            sortOrder: index + 1,
            responseGroup: groupRaw || null,
            responseGroupOrder,
            imageUrl: imageUrlRaw || null,
        }
    })
}
