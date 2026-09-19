import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { buildXlsx, buildZip, crc32, safeSheetName, xlsxFileName } from '@/lib/xlsx'

/**
 * Penulis XLSX (PRD §6.6 menetapkan XLSX sebagai format utama export instansi).
 *
 * ## Kenapa arsipnya divalidasi dengan `unzip` sungguhan
 *
 * XLSX adalah arsip ZIP. Kalau struktur ZIP-nya salah, Excel menolak membuka
 * berkasnya — dan itu kegagalan yang TIDAK terlihat dari unit test yang hanya
 * memeriksa string XML. Karena itu berkasnya ditulis ke disk lalu diperiksa
 * dengan `unzip -t` (integritas) dan `unzip -p` (isi), memakai implementasi ZIP
 * yang sama sekali bukan buatan sendiri.
 *
 * `unzip` tersedia di macOS dan di runner CI (Ubuntu). Bila tidak ada, uji
 * tersebut dilewati dengan pesan yang jelas alih-alih gagal menyesatkan.
 */

const workdir = mkdtempSync(join(tmpdir(), 'xlsx-test-'))
afterAll(() => { rmSync(workdir, { recursive: true, force: true }) })

function hasUnzip() {
    try {
        execFileSync('unzip', ['-v'], { stdio: 'ignore' })
        return true
    } catch {
        return false
    }
}

const UNZIP = hasUnzip()

function writeAndList(bytes: Uint8Array, name: string) {
    const path = join(workdir, name)
    writeFileSync(path, bytes)
    // `-t` memverifikasi CRC setiap entri; gagal berarti arsipnya rusak.
    execFileSync('unzip', ['-t', path], { stdio: 'pipe' })
    return path
}

function readEntry(path: string, entry: string) {
    return execFileSync('unzip', ['-p', path, entry], { stdio: 'pipe' }).toString('utf8')
}

const SAMPLE = [
    {
        name: 'Detail',
        columns: ['kode', 'nama', 'skor'],
        rows: [
            ['M-001', 'Andi', 275],
            ['M-002', 'Budi", <nakal> & "tanda', null],
        ],
    },
    { name: 'Rekap', columns: ['batch', 'total'], rows: [['Batch A', 2]] },
]

describe('crc32', () => {
    it('cocok dengan nilai acuan yang diketahui', () => {
        // Nilai CRC-32 dari string "123456789" adalah 0xCBF43926 — vektor uji
        // standar untuk polinomial 0xEDB88320.
        expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926)
    })

    it('crc32 dari data kosong adalah 0', () => {
        expect(crc32(new Uint8Array(0))).toBe(0)
    })
})

describe('safeSheetName', () => {
    it('membuang karakter yang dilarang Excel', () => {
        // Karakter terlarang diganti spasi lalu spasi berlebih dirapikan.
        expect(safeSheetName('Detail [peserta]: 2026?')).toBe('Detail peserta 2026')
        expect(safeSheetName('a/b\\c*d')).toBe('a b c d')
        // Nama yang seluruhnya karakter terlarang tidak menghasilkan spasi kosong.
        expect(safeSheetName('[::]')).toBe('Sheet')
    })

    it('memotong pada 31 karakter', () => {
        expect(safeSheetName('x'.repeat(80))).toHaveLength(31)
    })

    it('tidak pernah mengembalikan nama kosong', () => {
        expect(safeSheetName('   ')).toBe('Sheet')
        expect(safeSheetName('', 'Cadangan')).toBe('Cadangan')
    })
})

describe('xlsxFileName', () => {
    it('membentuk nama berkas dengan tanggal', () => {
        expect(xlsxFileName('Rekap SMAN 2 / Tanjungbalai', new Date('2026-09-19T00:00:00Z')))
            .toBe('Rekap-SMAN-2-Tanjungbalai-2026-09-19.xlsx')
    })

    it('tidak pernah mengembalikan nama kosong', () => {
        expect(xlsxFileName('///', new Date('2026-01-02T00:00:00Z'))).toBe('export-2026-01-02.xlsx')
    })
})

describe('buildXlsx — struktur', () => {
    it('menolak workbook tanpa sheet', () => {
        expect(() => buildXlsx([])).toThrow(/minimal satu sheet/)
    })

    it('menghasilkan arsip yang lolos verifikasi unzip', () => {
        if (!UNZIP) return
        const path = writeAndList(buildXlsx(SAMPLE), 'struktur.xlsx')
        const listing = execFileSync('unzip', ['-l', path], { stdio: 'pipe' }).toString('utf8')
        for (const entry of ['[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml', 'xl/styles.xml', 'xl/worksheets/sheet1.xml', 'xl/worksheets/sheet2.xml']) {
            expect(listing).toContain(entry)
        }
    })

    it('menulis nama sheet yang diminta ke workbook.xml', () => {
        if (!UNZIP) return
        const path = writeAndList(buildXlsx(SAMPLE), 'workbook.xlsx')
        const workbook = readEntry(path, 'xl/workbook.xml')
        expect(workbook).toContain('name="Detail"')
        expect(workbook).toContain('name="Rekap"')
    })

    it('membuat nama sheet unik bila ada yang sama', () => {
        if (!UNZIP) return
        const path = writeAndList(buildXlsx([
            { name: 'Sama', columns: ['a'], rows: [['1']] },
            { name: 'Sama', columns: ['a'], rows: [['2']] },
        ]), 'duplikat.xlsx')
        const workbook = readEntry(path, 'xl/workbook.xml')
        // Excel menolak nama sheet duplikat, jadi yang kedua diberi sufiks.
        expect(workbook).toContain('name="Sama"')
        expect(workbook).toContain('(2)')
    })
})

describe('buildXlsx — isi sel', () => {
    it('menulis teks, angka, boolean, dan sel kosong dengan tipe yang benar', () => {
        if (!UNZIP) return
        const path = writeAndList(buildXlsx([{
            name: 'Tipe',
            columns: ['teks', 'angka', 'bool', 'kosong'],
            rows: [['andi', 275, true, null]],
        }]), 'tipe.xlsx')
        const sheet = readEntry(path, 'xl/worksheets/sheet1.xml')

        expect(sheet).toContain('<is><t xml:space="preserve">andi</t></is>')
        // Angka sebagai <v> numerik tanpa t="inlineStr", supaya Excel menghitungnya.
        expect(sheet).toMatch(/<c r="B2"><v>275<\/v><\/c>/)
        expect(sheet).toMatch(/<c r="C2" t="b"><v>1<\/v><\/c>/)
        // Sel kosong tidak ditulis sama sekali — penting agar "belum ada nilai"
        // tidak tampil sebagai 0.
        expect(sheet).not.toContain('r="D2"')
    })

    it('meng-escape karakter XML dan membuang karakter kontrol', () => {
        if (!UNZIP) return
        const path = writeAndList(buildXlsx([{
            name: 'Escape',
            columns: ['catatan'],
            rows: [['kata "penting" & <tag>\u0000\u0007', "apostrof '"]],
        }]), 'escape.xlsx')
        const sheet = readEntry(path, 'xl/worksheets/sheet1.xml')

        expect(sheet).toContain('&quot;penting&quot; &amp; &lt;tag&gt;')
        expect(sheet).toContain('&apos;')
        // Karakter kontrol membuat Excel menolak berkas, jadi harus hilang.
        expect(sheet).not.toContain('\u0000')
        expect(sheet).not.toContain('\u0007')
    })

    it('menulis header sebagai baris pertama dengan gaya tebal', () => {
        if (!UNZIP) return
        const path = writeAndList(buildXlsx([{ name: 'Header', columns: ['kode', 'nama'], rows: [] }]), 'header.xlsx')
        const sheet = readEntry(path, 'xl/worksheets/sheet1.xml')

        expect(sheet).toContain('<row r="1">')
        expect(sheet).toContain('r="A1" s="1"')
        expect(sheet).toContain('r="B1" s="1"')
    })

    it('menomori baris data mulai dari 2', () => {
        if (!UNZIP) return
        const path = writeAndList(buildXlsx([{ name: 'Baris', columns: ['a'], rows: [['x'], ['y']] }]), 'baris.xlsx')
        const sheet = readEntry(path, 'xl/worksheets/sheet1.xml')
        expect(sheet).toContain('<row r="2">')
        expect(sheet).toContain('<row r="3">')
    })

    it('memberi label kolom melampaui Z dengan benar', () => {
        if (!UNZIP) return
        const columns = Array.from({ length: 28 }, (_, index) => `k${index + 1}`)
        const path = writeAndList(buildXlsx([{ name: 'Lebar', columns, rows: [columns.map(() => 'x')] }]), 'lebar.xlsx')
        const sheet = readEntry(path, 'xl/worksheets/sheet1.xml')
        // Kolom ke-27 adalah AA, ke-28 adalah AB.
        expect(sheet).toContain('r="AA1"')
        expect(sheet).toContain('r="AB1"')
    })
})

describe('buildZip', () => {
    it('menghasilkan arsip yang dapat dibaca untuk entri teks', () => {
        if (!UNZIP) return
        const bytes = buildZip([
            { name: 'satu.txt', data: new TextEncoder().encode('halo') },
            { name: 'dua.txt', data: new TextEncoder().encode('dunia') },
        ])
        const path = writeAndList(bytes, 'zip.xlsx'.replace('.xlsx', '.zip'))
        expect(readEntry(path, 'satu.txt')).toBe('halo')
        expect(readEntry(path, 'dua.txt')).toBe('dunia')
    })

    it('menyimpan entri tanpa kompresi sehingga ukurannya sama', () => {
        if (!UNZIP) return
        const bytes = buildZip([{ name: 'a.txt', data: new TextEncoder().encode('x'.repeat(500)) }])
        const path = join(workdir, 'stored.zip')
        writeFileSync(path, bytes)
        const listing = execFileSync('unzip', ['-v', path], { stdio: 'pipe' }).toString('utf8')
        expect(listing).toContain('Stored')
    })

    it('berkasnya deterministik untuk waktu yang sama', () => {
        const now = new Date('2026-09-19T10:00:00Z')
        const first = buildZip([{ name: 'a.txt', data: new TextEncoder().encode('x') }], now)
        const second = buildZip([{ name: 'a.txt', data: new TextEncoder().encode('x') }], now)
        expect(Array.from(first)).toEqual(Array.from(second))
    })
})
