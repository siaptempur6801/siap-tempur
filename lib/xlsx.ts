/**
 * Penulis XLSX minimal tanpa dependensi.
 *
 * ## Kenapa ditulis sendiri
 *
 * PRD §6.6 menetapkan **XLSX sebagai format utama** export instansi, sedangkan
 * repo ini belum punya pustaka XLSX. Satu pustaka XLSX umumnya ~1 MB dan
 * menarik puluhan modul hanya untuk menulis empat sheet berisi teks dan angka.
 *
 * XLSX adalah arsip ZIP berisi beberapa berkas XML. Yang diperlukan di sini:
 * ZIP dengan entri STORED (tanpa kompresi) dan enam berkas XML kecil. Itu cukup
 * untuk menghasilkan berkas yang dibuka Excel, dan seluruhnya dapat diuji tanpa
 * jaringan maupun berkas contoh.
 *
 * ## Yang TIDAK didukung (dan tidak dibutuhkan)
 *
 * - Membaca XLSX. Export hanya menulis.
 * - Rumus, grafik, gambar, format bersyarat.
 * - Kompresi. Berkasnya lebih besar daripada perlu, tetapi isinya hanya beberapa
 *   ribu baris teks; sebagai gantinya tidak ada `zlib` maupun deflate yang perlu
 *   diuji.
 * - Gaya rumit. Hanya baris header yang dicetak tebal.
 *
 * ## Bentuk sel
 *
 * Angka ditulis sebagai `<v>` numerik, sisanya sebagai string inline. `null`
 * menjadi sel kosong — penting untuk export: peserta yang belum mengerjakan tidak
 * boleh tampil sebagai `0`, karena "belum ada nilai" dan "nilainya nol" berbeda.
 */

/** Panjang maksimum nama sheet di Excel. */
const MAX_SHEET_NAME = 31

export type XlsxSheet = {
  name: string
  columns: string[]
  rows: Array<Array<string | number | boolean | null | undefined>>
}

/* ------------------------------------------------------------------ XML helpers */

function escapeXml(value: string): string {
  return (
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
      // Karakter kontrol tidak sah di XML 1.0 dan membuat Excel menolak berkas.
      // Bisa muncul dari catatan bebas yang ditempel pengguna.
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
  )
}

/**
 * Nama sheet yang sah di Excel: maks 31 karakter, tanpa `[]:*?/\`, dan tidak
 * kosong. Nama ganda juga ditolak Excel, jadi pemanggil harus memastikan unik —
 * fungsi ini hanya menjamin bentuknya.
 */
export function safeSheetName(name: string, fallback = 'Sheet'): string {
  const cleaned = name
    .replace(/[[\]:*?/\\]/g, ' ')
    // Karakter terlarang diganti spasi, dan satu nama bisa memuat beberapa
    // sekaligus — tanpa merapikan, hasilnya berlubang spasi ganda.
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_SHEET_NAME)
    .trim()
  return cleaned || fallback
}

/** Referensi kolom A, B, … Z, AA, AB, … */
function columnLetter(index: number): string {
  let value = index + 1
  let letters = ''
  while (value > 0) {
    const remainder = (value - 1) % 26
    letters = String.fromCharCode(65 + remainder) + letters
    value = Math.floor((value - 1) / 26)
  }
  return letters
}

function cellXml(
  value: string | number | boolean | null | undefined,
  rowIndex: number,
  columnIndex: number,
): string {
  const ref = `${columnLetter(columnIndex)}${rowIndex}`

  if (value === null || value === undefined || value === '') return ''

  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<c r="${ref}"><v>${value}</v></c>`
  }

  if (typeof value === 'boolean') {
    return `<c r="${ref}" t="b"><v>${value ? 1 : 0}</v></c>`
  }

  return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(String(value))}</t></is></c>`
}

function sheetXml(sheet: XlsxSheet): string {
  const headerRow = `<row r="1">${sheet.columns
    .map(
      (column, index) =>
        `<c r="${columnLetter(index)}1" s="1" t="inlineStr"><is><t xml:space="preserve">${escapeXml(column)}</t></is></c>`,
    )
    .join('')}</row>`

  const bodyRows = sheet.rows
    .map((row, rowIndex) => {
      // Nomor baris Excel 1-based dan baris pertama adalah header.
      const excelRow = rowIndex + 2
      const cells = row.map((value, columnIndex) => cellXml(value, excelRow, columnIndex)).join('')
      return `<row r="${excelRow}">${cells}</row>`
    })
    .join('')

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${headerRow}${bodyRows}</sheetData></worksheet>`
}

/* -------------------------------------------------------------------- ZIP (STORED) */

/** Tabel CRC-32 (polinomial 0xEDB88320), dihitung sekali lalu dipakai ulang. */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let index = 0; index < 256; index += 1) {
    let value = index
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
    }
    table[index] = value >>> 0
  }
  return table
})()

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (let index = 0; index < bytes.length; index += 1) {
    crc = CRC_TABLE[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

type ZipEntry = { name: string; data: Uint8Array }

function utf8(text: string): Uint8Array {
  return new TextEncoder().encode(text)
}

/** Tanggal/waktu format MS-DOS. Nilai tetap dipakai agar berkas deterministik. */
function dosDateTime(date: Date): { time: number; date: number } {
  const time =
    (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2)
  const day = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
  return { time, date: day }
}

/**
 * Susun arsip ZIP dari entri STORED (tanpa kompresi).
 *
 * Struktur yang ditulis mengikuti spesifikasi PKZIP: local file header per entri,
 * lalu central directory, lalu end-of-central-directory. Tidak ada kompresi,
 * sehingga `compressedSize === uncompressedSize` dan metode 0.
 */
export function buildZip(entries: ZipEntry[], now = new Date()): Uint8Array {
  const { time, date } = dosDateTime(now)
  const chunks: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0

  for (const entry of entries) {
    const nameBytes = utf8(entry.name)
    const crc = crc32(entry.data)
    const size = entry.data.length

    const local = new Uint8Array(30 + nameBytes.length)
    const localView = new DataView(local.buffer)
    localView.setUint32(0, 0x04034b50, true) // signature
    localView.setUint16(4, 20, true) // versi minimum
    localView.setUint16(6, 0, true) // flag
    localView.setUint16(8, 0, true) // metode: STORED
    localView.setUint16(10, time, true)
    localView.setUint16(12, date, true)
    localView.setUint32(14, crc, true)
    localView.setUint32(18, size, true) // compressed
    localView.setUint32(22, size, true) // uncompressed
    localView.setUint16(26, nameBytes.length, true)
    localView.setUint16(28, 0, true) // extra length
    local.set(nameBytes, 30)
    chunks.push(local, entry.data)

    const centralEntry = new Uint8Array(46 + nameBytes.length)
    const centralView = new DataView(centralEntry.buffer)
    centralView.setUint32(0, 0x02014b50, true) // signature
    centralView.setUint16(4, 20, true) // versi pembuat
    centralView.setUint16(6, 20, true) // versi minimum
    centralView.setUint16(8, 0, true) // flag
    centralView.setUint16(10, 0, true) // metode
    centralView.setUint16(12, time, true)
    centralView.setUint16(14, date, true)
    centralView.setUint32(16, crc, true)
    centralView.setUint32(20, size, true)
    centralView.setUint32(24, size, true)
    centralView.setUint16(28, nameBytes.length, true)
    centralView.setUint16(30, 0, true) // extra
    centralView.setUint16(32, 0, true) // komentar
    centralView.setUint16(34, 0, true) // disk
    centralView.setUint16(36, 0, true) // atribut internal
    centralView.setUint32(38, 0, true) // atribut eksternal
    centralView.setUint32(42, offset, true) // offset local header
    centralEntry.set(nameBytes, 46)
    central.push(centralEntry)

    offset += local.length + size
  }

  const centralSize = central.reduce((sum, chunk) => sum + chunk.length, 0)
  const end = new Uint8Array(22)
  const endView = new DataView(end.buffer)
  endView.setUint32(0, 0x06054b50, true)
  endView.setUint16(8, entries.length, true)
  endView.setUint16(10, entries.length, true)
  endView.setUint32(12, centralSize, true)
  endView.setUint32(16, offset, true)

  const all = [...chunks, ...central, end]
  const total = all.reduce((sum, chunk) => sum + chunk.length, 0)
  const output = new Uint8Array(total)
  let cursor = 0
  for (const chunk of all) {
    output.set(chunk, cursor)
    cursor += chunk.length
  }
  return output
}

/* --------------------------------------------------------------------- workbook */

/**
 * Bangun berkas XLSX berisi satu atau lebih sheet.
 *
 * Kolom ditulis sebagai baris header yang dicetak tebal, dan lebar kolom
 * disesuaikan dengan isi terpanjangnya supaya berkasnya langsung terbaca tanpa
 * perlu menyesuaikan lebar manual — itu bagian dari "export yang siap pakai"
 * (§12).
 */
export function buildXlsx(sheets: XlsxSheet[], now = new Date()): Uint8Array {
  if (sheets.length === 0) throw new Error('XLSX harus berisi minimal satu sheet')

  const usedNames = new Set<string>()
  const normalized = sheets.map((sheet, index) => {
    let name = safeSheetName(sheet.name, `Sheet${index + 1}`)
    let suffix = 2
    // Excel menolak nama sheet yang duplikat.
    while (usedNames.has(name)) {
      const base = name.slice(0, MAX_SHEET_NAME - 3)
      name = `${base} (${suffix})`
      suffix += 1
    }
    usedNames.add(name)
    return { ...sheet, name }
  })

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${normalized
    .map(
      (_, index) =>
        `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
    )
    .join('')}</Types>`

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`

  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${normalized
    .map(
      (sheet, index) =>
        `<sheet name="${escapeXml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`,
    )
    .join('')}</sheets></workbook>`

  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${normalized
    .map(
      (_, index) =>
        `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`,
    )
    .join(
      '',
    )}<Relationship Id="rId${normalized.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`

  // Hanya dua gaya: 0 = biasa (wajib ada), 1 = header tebal.
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs></styleSheet>`

  const entries: ZipEntry[] = [
    { name: '[Content_Types].xml', data: utf8(contentTypes) },
    { name: '_rels/.rels', data: utf8(rootRels) },
    { name: 'xl/workbook.xml', data: utf8(workbook) },
    { name: 'xl/_rels/workbook.xml.rels', data: utf8(workbookRels) },
    { name: 'xl/styles.xml', data: utf8(styles) },
    ...normalized.map((sheet, index) => ({
      name: `xl/worksheets/sheet${index + 1}.xml`,
      data: utf8(sheetXml(sheet)),
    })),
  ]

  return buildZip(entries, now)
}

/** Nama berkas aman untuk diunduh. */
export function xlsxFileName(base: string, now = new Date()): string {
  const stamp = now.toISOString().slice(0, 10)
  const cleaned =
    base
      .normalize('NFKD')
      .replace(/[^\w.-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'export'
  return `${cleaned}-${stamp}.xlsx`
}
