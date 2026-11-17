/**
 * CSV murni tanpa dependensi.
 *
 * ## Kenapa ditulis sendiri
 *
 * Repo ini belum punya pustaka CSV/XLSX, dan bulk import peserta (PRD §7.2.1)
 * hanya memerlukan CSV. Parser ini kecil, dapat diuji, dan tidak menambah
 * dependensi hanya untuk memisahkan koma.
 *
 * ## Yang ditangani
 *
 * - Field berkutip dengan koma, baris baru, dan kutip ganda (`""`) di dalamnya.
 * - Akhir baris `\r\n` maupun `\n`.
 * - BOM UTF-8 di awal berkas — Excel di Windows menambahkannya, dan tanpa
 *   penanganan ini kolom pertama akan terbaca `"\ufeffnama"`.
 * - Pemisah `,` DAN `;`. Excel dengan locale Indonesia menulis `;`, sehingga
 *   berkas yang diekspor dari Excel akan salah baca bila hanya `,` yang dikenali.
 *   Pemisah dideteksi dari baris header.
 *
 * Semua fungsi di sini murni: tidak menyentuh jaringan, berkas, maupun database,
 * sehingga `tests/unit/csv.test.ts` dapat menguji seluruh perilakunya.
 */

/** Deteksi pemisah dari baris header: mana yang lebih banyak di luar tanda kutip. */
export function detectDelimiter(text: string): ',' | ';' {
  const headerLine = stripBom(text).split(/\r?\n/, 1)[0] ?? ''
  let commas = 0
  let semicolons = 0
  let inQuotes = false

  for (let index = 0; index < headerLine.length; index += 1) {
    const char = headerLine[index]
    if (char === '"') {
      if (inQuotes && headerLine[index + 1] === '"') {
        index += 1
        continue
      }
      inQuotes = !inQuotes
      continue
    }
    if (inQuotes) continue
    if (char === ',') commas += 1
    else if (char === ';') semicolons += 1
  }

  return semicolons > commas ? ';' : ','
}

export function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
}

/**
 * Ubah teks CSV menjadi baris-baris sel.
 *
 * Mengembalikan array of array (bukan objek) karena baris bisa saja memiliki
 * jumlah kolom berbeda dari header — itu justru salah satu hal yang harus
 * dilaporkan sebagai kesalahan, bukan disembunyikan dengan mengisi `undefined`.
 */
export function parseCsvRows(text: string, delimiter?: ',' | ';'): string[][] {
  const source = stripBom(text)
  const sep = delimiter ?? detectDelimiter(source)
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]

    if (inQuotes) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          field += '"'
          index += 1
          continue
        }
        inQuotes = false
        continue
      }
      field += char
      continue
    }

    if (char === '"') {
      inQuotes = true
      continue
    }

    if (char === sep) {
      row.push(field)
      field = ''
      continue
    }

    if (char === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      continue
    }

    if (char === '\r') {
      // `\r\n` ditangani oleh cabang `\n`; `\r` sendirian juga akhir baris.
      if (source[index + 1] === '\n') continue
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      continue
    }

    field += char
  }

  // Baris terakhir tanpa newline tetap harus ikut.
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows.filter((candidate) => candidate.some((cell) => cell.trim() !== ''))
}

export type CsvRecord = { line: number; values: Record<string, string> }

/**
 * Ubah teks CSV menjadi record ber-key header.
 *
 * `line` adalah nomor baris 1-based DI BERKAS, termasuk baris header — supaya
 * pesan kesalahan menunjuk baris yang benar-benar dilihat pengguna di Excel.
 * Header dinormalkan (huruf kecil, spasi/`-` menjadi `_`) agar "Nama Lengkap",
 * "nama lengkap", dan "nama-lengkap" sama-sama dikenali.
 */
export function parseCsvRecords(text: string): {
  records: CsvRecord[]
  headers: string[]
  delimiter: ',' | ';'
} {
  const rows = parseCsvRows(text)
  if (rows.length === 0) return { records: [], headers: [], delimiter: detectDelimiter(text) }

  const headers = rows[0].map(normalizeHeader)
  const records: CsvRecord[] = []

  for (let index = 1; index < rows.length; index += 1) {
    const values: Record<string, string> = {}
    const cells = rows[index]
    for (let column = 0; column < headers.length; column += 1) {
      const key = headers[column]
      if (!key) continue
      values[key] = (cells[column] ?? '').trim()
    }
    records.push({ line: index + 1, values })
  }

  return { records, headers, delimiter: detectDelimiter(text) }
}

export function normalizeHeader(header: string): string {
  return stripBom(header)
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
}

/** Kutip satu sel bila perlu. */
function escapeCell(value: string): string {
  if (value === '') return ''
  if (/[",;\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

/** Susun CSV. `delimiter` sengaja dapat dipilih; default koma. */
export function toCsv(
  rows: Array<Array<string | number | null | undefined>>,
  delimiter: ',' | ';' = ',',
): string {
  return rows
    .map((row) => row.map((cell) => escapeCell(cell == null ? '' : String(cell))).join(delimiter))
    .join('\r\n')
}

/**
 * Susun CSV dari objek dengan urutan kolom yang ditentukan.
 *
 * Urutan kolom eksplisit dipakai supaya berkas yang diunduh selalu memiliki
 * susunan yang sama — penting untuk "file error yang bisa diunduh untuk
 * perbaikan" (PRD §7.2.1): pengguna memperbaiki berkas itu lalu mengunggahnya
 * kembali, jadi susunannya harus dapat diprediksi.
 */
export function toCsvWithColumns(
  rows: Array<Record<string, string | number | null | undefined>>,
  columns: readonly string[],
  delimiter: ',' | ';' = ',',
): string {
  const header = columns.map((column) => column)
  const body = rows.map((row) => columns.map((column) => row[column] ?? ''))
  return toCsv([header, ...body], delimiter)
}

/** Nama berkas yang aman dipakai di Content-Disposition. */
export function safeFileName(name: string): string {
  return (
    name
      .normalize('NFKD')
      .replace(/[^\w.-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80) || 'unduhan'
  )
}
