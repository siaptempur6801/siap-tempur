import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import QuestionOptionsEditor from '@/components/admin/QuestionOptionsEditor'

/**
 * UX tipe `category`.
 *
 * `responseGroup` wajib untuk tipe kategori, tetapi sebelumnya tersembunyi di
 * balik `<details>` "Pengaturan lanjutan" — admin harus menebak tempatnya, dan
 * validasi baru muncul setelah submit. Kontraknya: pada tipe kategori field
 * wajib itu tampil langsung; pada tipe lain ia tetap menjadi pengaturan lanjutan.
 */
const categoryOptions = JSON.stringify([
    { key: 'A', content: 'A', score: 1, isCorrect: true, responseGroup: 'G1' },
    { key: 'B', content: 'B', isCorrect: false, responseGroup: 'G1' },
    { key: 'C', content: 'C', isCorrect: false, responseGroup: 'G2' },
    { key: 'D', content: 'D', isCorrect: true, responseGroup: 'G2' },
])

describe('QuestionOptionsEditor tipe kategori', () => {
    it('menampilkan field kategori tanpa harus membuka pengaturan lanjutan', () => {
        const html = renderToStaticMarkup(<QuestionOptionsEditor defaultValue={categoryOptions} questionType="category"/>)
        expect(html).not.toContain('<details')
        expect(html).toContain('Response group (wajib)')
        expect(html).toContain('Minimal dua kelompok')
        expect(html).toMatch(/aria-label="Response group A"[^>]*required/)
    })

    it('tetap menyembunyikan field lanjutan pada tipe non-kategori', () => {
        const html = renderToStaticMarkup(<QuestionOptionsEditor defaultValue={categoryOptions} questionType="multiple_choice"/>)
        expect(html).toContain('<details')
        expect(html).toContain('Pengaturan lanjutan')
        expect(html).not.toContain('Response group (wajib)')
    })
})
