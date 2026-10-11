import { describe, expect, it } from 'vitest'
import {
  detectDelimiter,
  normalizeHeader,
  parseCsvRecords,
  parseCsvRows,
  safeFileName,
  stripBom,
  toCsv,
  toCsvWithColumns,
} from '@/lib/csv'

/**
 * CSV untuk bulk import peserta (PRD §7.2.1).
 *
 * Parser ini ditulis sendiri karena repo belum punya pustaka CSV, jadi seluruh
 * perilaku tepinya dikunci di sini — terutama yang membuat berkas dari Excel
 * gagal terbaca: BOM UTF-8, pemisah `;`, kutip ganda, dan baris baru di dalam sel.
 */

describe('detectDelimiter', () => {
  it('memilih koma untuk CSV biasa', () => {
    expect(detectDelimiter('nama,email\nA,a@b.c')).toBe(',')
  })

  it('memilih titik koma untuk berkas ekspor Excel locale Indonesia', () => {
    // Excel ber-locale Indonesia menulis `;`. Tanpa deteksi ini seluruh baris
    // akan terbaca sebagai SATU kolom, dan importnya gagal tanpa alasan jelas.
    expect(detectDelimiter('nama;email\nA;a@b.c')).toBe(';')
  })

  it('mengabaikan pemisah yang berada di dalam tanda kutip', () => {
    expect(detectDelimiter('"nama; lengkap",email\n"A; B",a@b.c')).toBe(',')
  })

  it('menangani baris header kosong', () => {
    expect(detectDelimiter('')).toBe(',')
  })
})

describe('stripBom', () => {
  it('membuang BOM UTF-8 di awal berkas', () => {
    // Excel di Windows menambahkan BOM. Tanpa ini kolom pertama terbaca
    // "\ufeffnama" dan header tidak pernah cocok.
    expect(stripBom('\ufeffnama,email')).toBe('nama,email')
    expect(parseCsvRecords('\ufeffnama,email\nA,a@b.c').records[0].values.nama).toBe('A')
  })

  it('tidak mengubah teks tanpa BOM', () => {
    expect(stripBom('nama')).toBe('nama')
  })
})

describe('parseCsvRows', () => {
  it('memisahkan baris dan kolom', () => {
    expect(parseCsvRows('a,b\nc,d')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ])
  })

  it('menangani CRLF', () => {
    expect(parseCsvRows('a,b\r\nc,d')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ])
  })

  it('menangani field berkutip berisi koma', () => {
    expect(parseCsvRows('a,"b,c"')).toEqual([['a', 'b,c']])
  })

  it('menangani kutip ganda yang di-escape', () => {
    expect(parseCsvRows('a,"kata ""penting"""')).toEqual([['a', 'kata "penting"']])
  })

  it('menangani baris baru di dalam field berkutip', () => {
    // Alamat sering ditulis dua baris. Ini yang paling sering membuat parser
    // naif menghasilkan baris palsu.
    expect(parseCsvRows('a,"baris1\nbaris2",c')).toEqual([['a', 'baris1\nbaris2', 'c']])
  })

  it('membuang baris yang seluruhnya kosong', () => {
    expect(parseCsvRows('a,b\n\n,\nc,d')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ])
  })

  it('tetap membaca baris terakhir tanpa newline', () => {
    expect(parseCsvRows('a,b\nc,d')).toHaveLength(2)
    expect(parseCsvRows('a,b\nc,d\n')).toHaveLength(2)
  })

  it('menghormati pemisah yang diberikan', () => {
    expect(parseCsvRows('a;b', ';')).toEqual([['a', 'b']])
    expect(parseCsvRows('a;b', ',')).toEqual([['a;b']])
  })
})

describe('normalizeHeader', () => {
  it('menyamakan variasi penulisan header', () => {
    // Pengguna menulis header dengan cara berbeda-beda; ketiganya harus
    // menunjuk kolom yang sama.
    expect(normalizeHeader('Nama Lengkap')).toBe('nama_lengkap')
    expect(normalizeHeader('nama lengkap')).toBe('nama_lengkap')
    expect(normalizeHeader('nama-lengkap')).toBe('nama_lengkap')
    expect(normalizeHeader('  NAMA_LENGKAP  ')).toBe('nama_lengkap')
  })

  it('membuang karakter yang tidak bisa dipakai sebagai key', () => {
    expect(normalizeHeader('Email (utama)')).toBe('email_utama')
  })
})

describe('parseCsvRecords', () => {
  it('memetakan baris ke header dan menomori baris sesuai berkas', () => {
    const { records, headers } = parseCsvRecords('nama,email\nAndi,a@b.c\nBudi,b@b.c')

    expect(headers).toEqual(['nama', 'email'])
    // Nomor baris 1-based DI BERKAS termasuk header, supaya pesan kesalahan
    // menunjuk baris yang benar-benar dilihat pengguna di Excel.
    expect(records[0].line).toBe(2)
    expect(records[1].line).toBe(3)
    expect(records[0].values).toEqual({ nama: 'Andi', email: 'a@b.c' })
  })

  it('mengisi kolom yang kurang dengan string kosong, bukan undefined', () => {
    const { records } = parseCsvRecords('nama,email,hp\nAndi,a@b.c')
    expect(records[0].values).toEqual({ nama: 'Andi', email: 'a@b.c', hp: '' })
  })

  it('mengabaikan kolom berlebih tanpa header', () => {
    const { records } = parseCsvRecords('nama\nAndi,nilai,ekstra')
    expect(records[0].values).toEqual({ nama: 'Andi' })
  })

  it('memangkas spasi di sekitar nilai', () => {
    const { records } = parseCsvRecords('nama, email\n  Andi  ,  a@b.c  ')
    expect(records[0].values).toEqual({ nama: 'Andi', email: 'a@b.c' })
  })

  it('mengembalikan kosong untuk berkas tanpa data', () => {
    expect(parseCsvRecords('nama,email').records).toEqual([])
    expect(parseCsvRecords('').records).toEqual([])
  })

  it('membaca berkas ekspor Excel bertitik koma dengan BOM', () => {
    const { records } = parseCsvRecords('\ufeffNama;Email\r\nAndi;a@b.c\r\n')
    expect(records).toEqual([{ line: 2, values: { nama: 'Andi', email: 'a@b.c' } }])
  })
})

describe('toCsv', () => {
  it('mengutip sel yang memuat pemisah, kutip, atau baris baru', () => {
    expect(
      toCsv([
        ['a', 'b,c'],
        ['d', 'e"f'],
        ['g', 'h\ni'],
      ]),
    ).toBe('a,"b,c"\r\nd,"e""f"\r\ng,"h\ni"')
  })

  it('tidak mengutip sel biasa', () => {
    expect(toCsv([['a', 'b']])).toBe('a,b')
  })

  it('menulis sel kosong sebagai kosong, bukan tanda kutip', () => {
    expect(toCsv([['a', null, undefined, '']])).toBe('a,,,')
  })

  it('dapat memakai titik koma', () => {
    expect(toCsv([['a', 'b']], ';')).toBe('a;b')
  })

  it('bolak-balik tetap sama untuk nilai yang rumit', () => {
    const rows = [
      ['nama', 'catatan'],
      ['Andi', 'baris1\nbaris2, "kutip"'],
    ]
    expect(parseCsvRows(toCsv(rows))).toEqual(rows)
  })
})

describe('toCsvWithColumns', () => {
  it('menjaga urutan kolom yang diminta', () => {
    // Urutan tetap penting: berkas error diunduh, diperbaiki, lalu diunggah
    // kembali — susunannya harus dapat diprediksi.
    const csv = toCsvWithColumns([{ nama: 'Andi', email: 'a@b.c' }], ['email', 'nama', 'catatan'])
    expect(csv).toBe('email,nama,catatan\r\na@b.c,Andi,')
  })

  it('mengisi kolom yang tidak ada dengan kosong', () => {
    expect(toCsvWithColumns([{ nama: 'A' }], ['nama', 'hp'])).toBe('nama,hp\r\nA,')
  })
})

describe('safeFileName', () => {
  it('membuang karakter yang tidak aman untuk nama berkas', () => {
    expect(safeFileName('Rekap Instansi/SMAN 2: Tanjungbalai')).toBe(
      'Rekap-Instansi-SMAN-2-Tanjungbalai',
    )
  })

  it('mempertahankan huruf, angka, titik, dan tanda hubung', () => {
    expect(safeFileName('peserta-batch_2026.csv')).toBe('peserta-batch_2026.csv')
  })

  it('tidak pernah mengembalikan nama kosong', () => {
    expect(safeFileName('///')).toBe('unduhan')
    expect(safeFileName('')).toBe('unduhan')
  })
})
