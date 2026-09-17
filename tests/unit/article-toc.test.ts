import { describe, expect, it } from 'vitest'
import { buildArticleToc, slugifyHeading } from '@/lib/article-toc'

describe('daftar isi artikel', () => {
    it('membuat slug ramah URL dari judul', () => {
        expect(slugifyHeading('Apa Itu Tes Wawasan Kebangsaan?')).toBe('apa-itu-tes-wawasan-kebangsaan')
        expect(slugifyHeading('  Tips & Trik: TIU 2026  ')).toBe('tips-trik-tiu-2026')
        expect(slugifyHeading('!!!')).toBe('')
    })

    it('memberi id + scroll margin pada setiap h2 dan mengumpulkan item', () => {
        const html = '<p>Intro</p><h2>Bagian Pertama</h2><p>Isi</p><h2>Bagian Kedua</h2>'
        const result = buildArticleToc(html)

        expect(result.items.map((item) => item.label)).toEqual(['Bagian Pertama', 'Bagian Kedua'])
        expect(result.items.map((item) => item.id)).toEqual(['bagian-pertama', 'bagian-kedua'])
        expect(result.html).toContain('<h2 id="bagian-pertama" style="scroll-margin-top: 7rem">Bagian Pertama</h2>')
    })

    it('menghormati id yang sudah ada dan menjaga atribut lain', () => {
        const html = '<h2 id="sudah-ada" class="judul">Judul</h2>'
        const result = buildArticleToc(html)

        expect(result.items).toEqual([{ id: 'sudah-ada', label: 'Judul' }])
        expect(result.html).toContain('id="sudah-ada"')
        expect(result.html).toContain('class="judul"')
        expect(result.html.match(/id=/g)).toHaveLength(1)
    })

    it('membuat id unik bila judul sama muncul lebih dari sekali', () => {
        const result = buildArticleToc('<h2>Latihan</h2><h2>Latihan</h2><h2>Latihan</h2>')
        expect(result.items.map((item) => item.id)).toEqual(['latihan', 'latihan-2', 'latihan-3'])
    })

    it('mengabaikan markup di dalam judul saat menyusun label', () => {
        const result = buildArticleToc('<h2>Strategi <strong>TIU</strong> &amp; TKP</h2>')
        expect(result.items[0].label).toBe('Strategi TIU & TKP')
        expect(result.items[0].id).toBe('strategi-tiu-tkp')
    })

    it('tidak mengubah h3 dan tidak menambah item untuknya', () => {
        const result = buildArticleToc('<h3>Sub Bagian</h3>')
        expect(result.items).toHaveLength(0)
        expect(result.html).toBe('<h3>Sub Bagian</h3>')
    })
})
