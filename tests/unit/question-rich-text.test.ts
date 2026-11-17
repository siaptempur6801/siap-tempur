import { describe, expect, it } from 'vitest'
import { parseRichTextSegments, questionTextToEditorHtml } from '@/lib/question-rich-text'

/**
 * Editor visual menyimpan HTML (`data-latex`, `<img>`), sementara soal lama
 * memakai `$...$`/`[[image:...]]`. Tokenizer dan konverter adalah jembatannya:
 * renderer peserta memakai tokenizer, editor memakai konverter saat memuat.
 */
describe('parseRichTextSegments', () => {
    it('membaca format lama dan format editor dengan makna yang sama', () => {
        const legacy = parseRichTextSegments('Hitung $\\frac{1}{2}$ lalu [[image:https://x/a.png]]')
        expect(legacy.map((segment) => segment.kind)).toEqual(['text', 'math-inline', 'text', 'image'])

        const editor = parseRichTextSegments('<p>Hitung <span data-latex="\\frac{1}{2}"></span> lalu <img src="https://x/a.png" alt=""></p>')
        expect(editor.find((segment) => segment.kind === 'math-inline')).toMatchObject({ latex: '\\frac{1}{2}' })
        expect(editor.find((segment) => segment.kind === 'image')).toMatchObject({ url: 'https://x/a.png' })
    })

    it('mendukung rumus blok dan entitas HTML pada atribut', () => {
        expect(parseRichTextSegments('<div data-latex-block="x &lt; y"></div>')).toEqual([{ kind: 'math-block', latex: 'x < y' }])
    })

    it('teks tanpa token tetap satu segmen', () => {
        expect(parseRichTextSegments('Soal biasa')).toEqual([{ kind: 'text', value: 'Soal biasa' }])
    })

    it('menjaga token gambar lama tetap terbaca', () => {
        expect(parseRichTextSegments('[[image:https://x/b.png]]')).toEqual([{ kind: 'image', url: 'https://x/b.png', alt: '' }])
    })
})

describe('questionTextToEditorHtml', () => {
    it('mengubah rumus & gambar format lama menjadi node editor', () => {
        const html = questionTextToEditorHtml('Hitung $\\frac{1}{2}$\n\n[[image:https://x/a.png]]')
        expect(html).toContain('<p>Hitung <span data-latex="\\frac{1}{2}"></span></p>')
        expect(html).toContain('<img src="https://x/a.png" alt="">')
    })

    it('mempertahankan HTML lama dan menyanitasinya', () => {
        const html = questionTextToEditorHtml('<p>Halo <script>alert(1)</script><strong>dunia</strong></p>')
        expect(html).toContain('<strong>dunia</strong>')
        expect(html).not.toContain('script')
        expect(html).not.toContain('alert')
    })

    it('mengubah token di dalam HTML lama', () => {
        const html = questionTextToEditorHtml('<p>Hitung $x^2$</p>')
        expect(html).toBe('<p>Hitung <span data-latex="x^2"></span></p>')
    })

    it('mengubah daftar markdown menjadi list editor', () => {
        const html = questionTextToEditorHtml('- satu\n- dua')
        expect(html).toBe('<ul><li><p>satu</p></li><li><p>dua</p></li></ul>')
    })

    it('meng-escape teks polos agar tidak menjadi HTML liar', () => {
        expect(questionTextToEditorHtml('5 < 7 & benar')).toBe('<p>5 &lt; 7 &amp; benar</p>')
    })

    it('kosong tetap kosong', () => {
        expect(questionTextToEditorHtml('')).toBe('')
        expect(questionTextToEditorHtml('   ')).toBe('')
    })
})
