import { describe, expect, it } from 'vitest'
import {
    insertAtSelection,
    questionImageExtension,
    questionImageMarkup,
    questionImagePath,
    validateQuestionImage,
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

describe('path & markup gambar', () => {
    it('menyimpan di folder pengguna dengan ekstensi dari tipe', () => {
        expect(questionImagePath('user-1', { type: 'image/jpeg' }, 'abc')).toBe('questions/user-1/abc.jpg')
        expect(questionImagePath('user-1', { type: 'image/png' }, 'abc')).toBe('questions/user-1/abc.png')
        expect(questionImagePath('user-1', { type: 'image/webp' }, 'abc')).toBe('questions/user-1/abc.webp')
    })

    it('jatuh ke ekstensi nama berkas bila tipe tak dikenal, tetap aman', () => {
        expect(questionImageExtension({ type: 'application/octet-stream', name: 'Foto.JPG' })).toBe('jpg')
        expect(questionImageExtension({ type: 'application/octet-stream', name: '../../evil.png' })).toBe('png')
        expect(questionImageExtension({ type: 'application/octet-stream' })).toBe('png')
    })

    it('markup yang dihasilkan dikenali MathRenderer', () => {
        expect(questionImageMarkup('https://example.org/a.png')).toBe('[[image:https://example.org/a.png]]')
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
