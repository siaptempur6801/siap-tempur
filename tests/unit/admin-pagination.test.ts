import { describe, expect, it } from 'vitest'
import {
  ADMIN_MAX_PAGE,
  ADMIN_PAGE_SIZE,
  adminOffset,
  adminPageHref,
  adminPageSummary,
  adminPageSummaryLabel,
  adminTotalPages,
  parseAdminPage,
} from '@/lib/admin-pagination'

/**
 * Paginasi daftar admin.
 *
 * Sebelum modul ini ada, seluruh daftar admin memuat satu jendela tetap dan
 * diam tentang sisanya — dan `/admin/users` mencetak "100 dari N" tanpa satu pun
 * cara menuju sisanya. Yang lebih berbahaya: pencarian disaring di klien atas
 * baris yang sudah terpotong, sehingga mencari pengguna ke-400 selalu menjawab
 * "tidak ada".
 */

describe('parseAdminPage', () => {
  it('menerima nomor halaman yang wajar', () => {
    expect(parseAdminPage('1')).toBe(1)
    expect(parseAdminPage('7')).toBe(7)
  })

  it('jatuh ke halaman 1 untuk nilai kosong, nol, negatif, atau bukan angka', () => {
    expect(parseAdminPage(undefined)).toBe(1)
    expect(parseAdminPage('')).toBe(1)
    expect(parseAdminPage('0')).toBe(1)
    expect(parseAdminPage('-5')).toBe(1)
    expect(parseAdminPage('abc')).toBe(1)
    expect(parseAdminPage('1e9')).toBe(1)
  })

  it('menerima nilai dari query string berulang dengan mengambil yang pertama', () => {
    expect(parseAdminPage(['3', '99'])).toBe(3)
  })

  /**
   * Nomor halaman datang dari pengguna dan dipakai sebagai offset database.
   * Nilai raksasa akan memaksa PostgREST memindai jauh ke dalam tabel.
   */
  it('membatasi nomor halaman agar offset tidak liar', () => {
    expect(parseAdminPage('999999999')).toBe(ADMIN_MAX_PAGE)
  })
})

describe('offset & total halaman', () => {
  it('offset halaman pertama nol', () => {
    expect(adminOffset(1)).toBe(0)
    expect(adminOffset(2)).toBe(ADMIN_PAGE_SIZE)
    expect(adminOffset(4, 10)).toBe(30)
  })

  it('total halaman dibulatkan ke atas', () => {
    expect(adminTotalPages(0)).toBe(1)
    expect(adminTotalPages(1)).toBe(1)
    expect(adminTotalPages(ADMIN_PAGE_SIZE)).toBe(1)
    expect(adminTotalPages(ADMIN_PAGE_SIZE + 1)).toBe(2)
    expect(adminTotalPages(120, 50)).toBe(3)
  })
})

describe('adminPageSummary', () => {
  it('menyatakan rentang baris yang sedang tampil', () => {
    const summary = adminPageSummary(2, 25, 120)
    expect(summary).toMatchObject({
      from: 26,
      to: 50,
      shown: 25,
      total: 120,
      page: 2,
      totalPages: 5,
      capped: true,
    })
  })

  it('halaman terakhir tidak lagi capped', () => {
    const summary = adminPageSummary(5, 20, 120)
    expect(summary.capped).toBe(false)
    expect(summary.to).toBe(120)
  })

  it('daftar kosong tidak melaporkan rentang palsu', () => {
    const summary = adminPageSummary(1, 0, 0)
    expect(summary).toMatchObject({ from: 0, to: 0, capped: false, totalPages: 1 })
  })

  /**
   * Kasus yang dulu mustahil terlihat: filter cocok 3 baris pada halaman 4.
   * Tanpa `shown`, rentangnya akan dilaporkan sebagai 76–100 — angka palsu.
   */
  it('halaman kosong di tengah rentang tidak mengarang rentang', () => {
    const summary = adminPageSummary(4, 0, 10)
    expect(summary.from).toBe(0)
    expect(summary.to).toBe(0)
  })
})

describe('adminPageSummaryLabel', () => {
  it('menyebut posisi dan total', () => {
    expect(adminPageSummaryLabel(adminPageSummary(1, 25, 120), 'soal')).toBe(
      'Menampilkan 1–25 dari 120 soal. Halaman 1 dari 5.',
    )
  })

  it('tidak menyebut halaman bila seluruh data muat dalam satu halaman', () => {
    expect(adminPageSummaryLabel(adminPageSummary(1, 12, 12), 'product')).toBe(
      'Menampilkan 1–12 dari 12 product.',
    )
  })

  it('membedakan "belum ada data" dari "halaman ini kosong"', () => {
    expect(adminPageSummaryLabel(adminPageSummary(1, 0, 0), 'soal')).toBe('Belum ada soal.')
    expect(adminPageSummaryLabel(adminPageSummary(4, 0, 10), 'soal')).toBe(
      'Tidak ada soal pada halaman 4.',
    )
  })

  it('memakai bentuk jamak yang diberikan, dan bentuk tunggal untuk satu baris', () => {
    expect(adminPageSummaryLabel(adminPageSummary(1, 7, 7), 'product', 'produk')).toBe(
      'Menampilkan 1–7 dari 7 produk.',
    )
    expect(adminPageSummaryLabel(adminPageSummary(1, 1, 1), 'product', 'produk')).toBe(
      'Menampilkan 1–1 dari 1 product.',
    )
  })
})

describe('adminPageHref', () => {
  it('mempertahankan konteks dan filter saat berpindah halaman', () => {
    const href = adminPageHref(
      '/admin/content/questions',
      { program: 'CPNS', track: 'SKD', q: 'twk', status: 'draft' },
      3,
    )
    expect(href).toBe('/admin/content/questions?program=CPNS&track=SKD&q=twk&status=draft&page=3')
  })

  it('halaman 1 tidak menulis parameter page agar URL tetap bersih', () => {
    expect(adminPageHref('/admin/commerce/products', { program: 'CPNS', track: 'SKD' }, 1)).toBe(
      '/admin/commerce/products?program=CPNS&track=SKD',
    )
  })

  it('membuang filter kosong', () => {
    expect(adminPageHref('/admin/users', { q: '', role: '', status: 'active' }, 2)).toBe(
      '/admin/users?status=active&page=2',
    )
  })

  it('page dari filter tidak bisa menimpa nomor halaman tujuan', () => {
    expect(adminPageHref('/admin/users', { page: '9', status: 'active' }, 2)).toBe(
      '/admin/users?status=active&page=2',
    )
  })

  it('tetap mengembalikan pathname bila tidak ada parameter sama sekali', () => {
    expect(adminPageHref('/admin/users', {}, 1)).toBe('/admin/users')
  })
})
