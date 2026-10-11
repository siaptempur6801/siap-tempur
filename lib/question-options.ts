/** Lossless JSON transport shared by Question Bank and Review Workspace.
 * Legacy pipe payloads remain readable for forms opened before deployment.
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

/**
 * Kontrak URL gambar opsi — cermin regex di RPC `mutate_question_bank`:
 * `^https://[^/@[:space:]]+([/:?#][^[:space:]]*)?$`
 *
 * Sebelumnya sisi aplikasi memakai `/^https:\/\//i` + `new URL()`, yang menerima
 * hal berbeda dari SQL: skema huruf besar (`HTTPS://`) dan spasi/tab di path
 * (URL parser menghapusnya). Akibatnya form menerima nilai yang lalu ditolak RPC
 * dengan pesan generik. Pola ini menyamakan sisi aplikasi dengan SQL.
 *
 * Catatan asimetri yang diketahui: regex SQL bisa "mundur" (`user` + `:pass@host`)
 * sehingga URL berkredensial ikut cocok di sana. Sisi aplikasi sengaja **lebih
 * ketat** — memeriksa authority secara terpisah — karena arah drift yang
 * berbahaya adalah "form menerima, RPC menolak". Memperketat SQL menuntut
 * migration baru; belum dilakukan.
 */
const HTTPS_IMAGE_PATTERN = /^https:\/\/[^/@\s]+(?:[/:?#][^\s]*)?$/

export function isHttpsImageUrl(value: string): boolean {
  if (!HTTPS_IMAGE_PATTERN.test(value)) return false
  const authority = value.slice('https://'.length).split(/[/?#]/, 1)[0]
  return !authority.includes('@')
}

export function serializeOptionRows(rows: Array<Record<string, unknown>>): string {
  return JSON.stringify(
    rows.map((row) => ({
      key: row.option_key,
      content: row.content,
      score: row.score,
      isCorrect: row.is_correct,
      responseGroup: row.response_group,
      responseGroupOrder: row.response_group_order,
      imageUrl: row.image_url,
    })),
  )
}

export function parseQuestionOptions(raw: string): QuestionOptionInput[] {
  if (!raw.trim()) return []
  if (raw.length > 300_000) throw new Error('QUESTION_OPTIONS_TOO_LARGE')
  if (!raw.trimStart().startsWith('[')) return parseLegacyQuestionOptions(raw)
  let rows: unknown
  try {
    rows = JSON.parse(raw)
  } catch {
    throw new Error('QUESTION_OPTIONS_INVALID')
  }
  if (!Array.isArray(rows) || rows.length > 100) throw new Error('QUESTION_OPTIONS_INVALID')
  return rows.map((value: unknown, index) => {
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new Error('QUESTION_OPTIONS_INVALID')
    const row = value as Record<string, unknown>
    if (typeof row.key !== 'string' || typeof row.content !== 'string')
      throw new Error('QUESTION_OPTIONS_INVALID')
    const number = (value: unknown, code: string) => {
      if (value === null || value === undefined || value === '') return null
      if (typeof value !== 'number' && typeof value !== 'string') throw new Error(code)
      const parsed = Number(value)
      if (!Number.isFinite(parsed)) throw new Error(code)
      return parsed
    }
    const score = number(row.score, 'QUESTION_OPTION_SCORE_INVALID')
    const order = number(row.responseGroupOrder, 'QUESTION_RESPONSE_GROUP_ORDER_INVALID')
    if (order !== null && (!Number.isInteger(order) || order < 1))
      throw new Error('QUESTION_RESPONSE_GROUP_ORDER_INVALID')
    if (row.isCorrect !== undefined && row.isCorrect !== null && typeof row.isCorrect !== 'boolean')
      throw new Error('QUESTION_OPTIONS_INVALID')
    const optionalText = (value: unknown) => {
      if (value == null || value === '') return null
      if (typeof value !== 'string') throw new Error('QUESTION_OPTIONS_INVALID')
      return value
    }
    return {
      key: row.key.trim().toUpperCase(),
      content: row.content,
      score,
      isCorrect: row.isCorrect == null ? null : (row.isCorrect as boolean),
      sortOrder: index + 1,
      responseGroup: optionalText(row.responseGroup),
      responseGroupOrder: order,
      imageUrl: optionalText(row.imageUrl),
    }
  })
}

const TRUE_TOKENS = ['true', '1', 'yes', 'ya']
function parseLegacyQuestionOptions(raw: string): QuestionOptionInput[] {
  if (!raw.trim()) return []
  const rows = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  return rows.map((line, index) => {
    const [keyRaw, contentRaw, scoreRaw, correctRaw, groupRaw, groupOrderRaw, imageUrlRaw] = line
      .split('|')
      .map((part) => part.trim())
    if (!keyRaw || !contentRaw) throw new Error(`OPTION_LINE_${index + 1}_INVALID`)
    const score = scoreRaw === '' || scoreRaw === undefined ? null : Number(scoreRaw)
    if (score !== null && !Number.isFinite(score))
      throw new Error(`OPTION_SCORE_${index + 1}_INVALID`)
    const correct = correctRaw?.toLowerCase()
    const isCorrect = correct === undefined || correct === '' ? null : TRUE_TOKENS.includes(correct)
    const responseGroupOrder =
      groupOrderRaw === '' || groupOrderRaw === undefined ? null : Number(groupOrderRaw)
    if (
      responseGroupOrder !== null &&
      (!Number.isInteger(responseGroupOrder) || responseGroupOrder < 1)
    ) {
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
