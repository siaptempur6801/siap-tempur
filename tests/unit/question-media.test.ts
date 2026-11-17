import { describe, expect, it } from 'vitest'
import {
  compressedFileName,
  compressionScale,
  insertAtSelection,
  questionImageExtension,
  questionImageMarkup,
  questionImagePath,
  shouldCompressQuestionImage,
  validateQuestionImage,
  validateQuestionImageInput,
} from '@/lib/question-media'

/**
 * Unggah gambar soal: validasi, path per pengguna, dan penyisipan markup di
 * kursor. Bagian ini murni supaya perilakunya dapat diuji tanpa browser.
 */
describe('validateQuestionImage', () => {
  it('menerima tipe yang didukung di bawah 2 MB', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp', 'image/gif']) {
      expect(validateQuestionImage({ size: 1024, type }), type).toBeNull()
    }
  })

  it('menolak tipe lain, berkas terlalu besar, dan berkas kosong', () => {
    expect(validateQuestionImage({ size: 1024, type: 'image/svg+xml' })).toContain('JPG')
    expect(validateQuestionImage({ size: 3 * 1024 * 1024, type: 'image/png' })).toContain('2 MB')
    expect(validateQuestionImage({ size: 0, type: 'image/png' })).toContain('kosong')
  })
})

describe('kompresi gambar (bagian murni)', () => {
  it('berkas mentah boleh sampai 8 MB — hasil kompresi yang divalidasi ketat', () => {
    expect(validateQuestionImageInput({ size: 5 * 1024 * 1024, type: 'image/jpeg' })).toBeNull()
    expect(validateQuestionImageInput({ size: 9 * 1024 * 1024, type: 'image/jpeg' })).toContain(
      '8 MB',
    )
    expect(validateQuestionImageInput({ size: 1024, type: 'application/pdf' })).toContain('JPG')
  })

  it('skala hanya mengecil dan tidak pernah melewati sisi terpanjang', () => {
    expect(compressionScale(3200, 1600)).toBe(0.5)
    expect(compressionScale(1600, 3200)).toBe(0.5)
    expect(compressionScale(800, 600)).toBe(1)
    expect(compressionScale(1600, 1600)).toBe(1)
    expect(compressionScale(0, 0)).toBe(1)
  })

  it('nama hasil kompresi aman dan berekstensi webp', () => {
    expect(compressedFileName('Foto Soal (1).PNG')).toBe('Foto-Soal--1-.webp')
    expect(compressedFileName('')).toBe('gambar.webp')
    // Nama berbahaya tidak boleh membawa path apa pun.
    const sanitized = compressedFileName('../../etc/passwd')
    expect(sanitized.endsWith('.webp')).toBe(true)
    expect(sanitized).not.toContain('/')
    expect(sanitized).not.toContain('..')
  })

  it('GIF tidak dikompres agar animasinya tidak hilang; gambar kecil dilewati', () => {
    expect(shouldCompressQuestionImage({ size: 2 * 1024 * 1024, type: 'image/gif' })).toBe(false)
    expect(shouldCompressQuestionImage({ size: 100 * 1024, type: 'image/png' })).toBe(false)
    expect(shouldCompressQuestionImage({ size: 2 * 1024 * 1024, type: 'image/png' })).toBe(true)
  })
})

describe('path & markup gambar', () => {
  it('menyimpan di folder pengguna dengan ekstensi dari tipe', () => {
    expect(questionImagePath('user-1', { type: 'image/jpeg' }, 'abc')).toBe(
      'questions/user-1/abc.jpg',
    )
    expect(questionImagePath('user-1', { type: 'image/png' }, 'abc')).toBe(
      'questions/user-1/abc.png',
    )
    expect(questionImagePath('user-1', { type: 'image/webp' }, 'abc')).toBe(
      'questions/user-1/abc.webp',
    )
  })

  it('jatuh ke ekstensi nama berkas bila tipe tak dikenal, tetap aman', () => {
    expect(questionImageExtension({ type: 'application/octet-stream', name: 'Foto.JPG' })).toBe(
      'jpg',
    )
    expect(
      questionImageExtension({ type: 'application/octet-stream', name: '../../evil.png' }),
    ).toBe('png')
    expect(questionImageExtension({ type: 'application/octet-stream' })).toBe('png')
  })

  it('markup yang dihasilkan dikenali MathRenderer', () => {
    expect(questionImageMarkup('https://example.org/a.png')).toBe(
      '[[image:https://example.org/a.png]]',
    )
  })
})

describe('insertAtSelection', () => {
  it('menyisipkan di posisi kursor dan mengembalikan kursor setelah sisipan', () => {
    const result = insertAtSelection('Halo dunia', 5, 5, '[[image:u]]')
    expect(result.value).toBe('Halo [[image:u]]dunia')
    expect(result.cursor).toBe('Halo '.length + '[[image:u]]'.length)
  })

  it('mengganti teks yang diseleksi', () => {
    const result = insertAtSelection('Halo dunia', 5, 10, '[[image:u]]')
    expect(result.value).toBe('Halo [[image:u]]')
  })

  it('menambah spasi hanya bila perlu', () => {
    expect(insertAtSelection('Halo', 4, 4, '[[image:u]]').value).toBe('Halo [[image:u]]')
    expect(insertAtSelection('Halo ', 5, 5, '[[image:u]]').value).toBe('Halo [[image:u]]')
    expect(insertAtSelection('', 0, 0, '[[image:u]]').value).toBe('[[image:u]]')
  })

  it('mengaman-kan posisi di luar panjang teks', () => {
    expect(insertAtSelection('abc', 99, 99, 'X').value).toBe('abc X')
    expect(insertAtSelection('abc', -1, -1, 'X').value).toBe('Xabc')
  })
})
