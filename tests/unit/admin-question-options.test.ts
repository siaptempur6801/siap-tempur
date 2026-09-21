import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
    parseQuestionOptions,
    serializeOptionRows,
} from '@/lib/question-options'

/** JSON is the canonical lossless editor transport. Legacy pipe payloads remain
 * readable for already-open forms during rollout. Both Question Bank and Review
 * Workspace use this contract, including images, null scores and category groups.
 */

const repoRoot = resolve(__dirname, '../..')

function source(relativePath: string) {
    return readFileSync(resolve(repoRoot, relativePath), 'utf8')
}

describe('parseQuestionOptions', () => {
    it('membaca tujuh field, termasuk imageUrl', () => {
        const [option] = parseQuestionOptions('A|Ibu kota Indonesia|5|true|GEO|1|https://contoh.test/a.png')
        expect(option).toEqual({
            key: 'A',
            content: 'Ibu kota Indonesia',
            score: 5,
            isCorrect: true,
            sortOrder: 1,
            responseGroup: 'GEO',
            responseGroupOrder: 1,
            imageUrl: 'https://contoh.test/a.png',
        })
    })

    it('mempertahankan imageUrl meski field group kosong', () => {
        const [option] = parseQuestionOptions('B|Pilihan B||false|||https://contoh.test/b.png')
        expect(option.imageUrl).toBe('https://contoh.test/b.png')
        expect(option.responseGroup).toBeNull()
    })

    it('field yang tidak ada menjadi null, bukan string "undefined"', () => {
        const [option] = parseQuestionOptions('A|Pilihan A|1|true')
        expect(option.imageUrl).toBeNull()
        expect(option.responseGroup).toBeNull()
        expect(option.responseGroupOrder).toBeNull()
    })

    it('skor kosong berarti null sedangkan 0 tetap 0', () => {
        const [tanpaSkor] = parseQuestionOptions('A|Pilihan A||true')
        const [nol] = parseQuestionOptions('A|Pilihan A|0|true')
        expect(tanpaSkor.score).toBeNull()
        expect(nol.score).toBe(0)
    })

    it('isCorrect kosong berarti null, dan varian "ya"/"1" dianggap benar', () => {
        expect(parseQuestionOptions('A|Pilihan A|1|')[0].isCorrect).toBeNull()
        expect(parseQuestionOptions('A|Pilihan A|1|ya')[0].isCorrect).toBe(true)
        expect(parseQuestionOptions('A|Pilihan A|1|1')[0].isCorrect).toBe(true)
        expect(parseQuestionOptions('A|Pilihan A|1|false')[0].isCorrect).toBe(false)
    })

    it('sortOrder mengikuti urutan baris', () => {
        const options = parseQuestionOptions('A|satu|1|true\nB|dua|0|false\nC|tiga|0|false')
        expect(options.map((option) => option.sortOrder)).toEqual([1, 2, 3])
    })

    it('payload kosong menghasilkan daftar kosong', () => {
        expect(parseQuestionOptions('')).toEqual([])
        expect(parseQuestionOptions('   \n  ')).toEqual([])
    })

    it('menolak baris tanpa kunci atau isi', () => {
        expect(() => parseQuestionOptions('|Tanpa kunci|1|true')).toThrow('OPTION_LINE_1_INVALID')
        expect(() => parseQuestionOptions('A|satu|1|true\nB||0|false')).toThrow('OPTION_LINE_2_INVALID')
    })

    it('menolak skor dan group order yang bukan angka wajar', () => {
        expect(() => parseQuestionOptions('A|satu|abc|true')).toThrow('OPTION_SCORE_1_INVALID')
        expect(() => parseQuestionOptions('A|satu|1|true|GEO|0')).toThrow('OPTION_GROUP_ORDER_1_INVALID')
        expect(() => parseQuestionOptions('A|satu|1|true|GEO|1.5')).toThrow('OPTION_GROUP_ORDER_1_INVALID')
    })
})

describe('serializeOptionRows', () => {
    it('menyusun payload JSON dari baris question_options', () => {
        const raw = serializeOptionRows([
            {
                option_key: 'A',
                content: 'Ibu kota Indonesia',
                score: 5,
                is_correct: true,
                response_group: 'GEO',
                response_group_order: 1,
                image_url: 'https://contoh.test/a.png',
            },
        ])
        expect(parseQuestionOptions(raw)[0]).toMatchObject({ key: 'A', content: 'Ibu kota Indonesia', score: 5, isCorrect: true, responseGroup: 'GEO', responseGroupOrder: 1, imageUrl: 'https://contoh.test/a.png' })
    })

    it('null dipertahankan sebagai null', () => {
        const raw = serializeOptionRows([
            { option_key: 'B', content: 'Pilihan B', score: null, is_correct: false, response_group: null, response_group_order: null, image_url: null },
        ])
        expect(parseQuestionOptions(raw)[0]).toMatchObject({ key: 'B', score: null, responseGroup: null, imageUrl: null })
    })

    it('baris kosong menghasilkan array kosong', () => {
        expect(parseQuestionOptions(serializeOptionRows([]))).toEqual([])
    })
})

describe('round-trip editor ↔ server', () => {
    /**
     * Inilah yang dulu gagal: editor menulis tujuh field, server membaca enam.
     * Round-trip membuktikan tidak ada field yang hilang di antaranya.
     */
    it('opsi yang diserialkan editor kembali utuh setelah di-parse server', () => {
        const raw = serializeOptionRows([
            { option_key: 'a', content: 'Pilihan A', score: 1, is_correct: true, response_group: 'GEO', response_group_order: 2, image_url: 'https://contoh.test/a.png' },
            { option_key: 'b', content: 'Pilihan B', score: 0, is_correct: false, response_group: null, response_group_order: null, image_url: null },
        ])
        const options = parseQuestionOptions(raw)

        expect(options).toHaveLength(2)
        expect(options[0]).toMatchObject({
            key: 'A',
            content: 'Pilihan A',
            score: 1,
            isCorrect: true,
            responseGroup: 'GEO',
            responseGroupOrder: 2,
            imageUrl: 'https://contoh.test/a.png',
        })
        expect(options[1]).toMatchObject({
            key: 'B',
            score: 0,
            isCorrect: false,
            imageUrl: null,
        })
    })
})

describe('Question Bank memakai editor terstruktur', () => {
    const workspace = source('components/admin/QuestionBankForm.tsx')

    it('merender QuestionOptionsEditor', () => {
        expect(workspace).toMatch(/import\s+QuestionOptionsEditor\s+from\s+'@\/components\/admin\/QuestionOptionsEditor'/)
        expect(workspace).toContain('<QuestionOptionsEditor')
    })

    /**
     * Textarea lama bernama `options` berisi contoh `A|Pilihan A|1|true` di
     * placeholder-nya. Kehadirannya kembali berarti admin diminta menulis format
     * storage lagi.
     */
    it('tidak lagi meminta admin menulis format pipe secara manual', () => {
        expect(workspace).not.toContain('name="options"')
        expect(workspace).not.toContain('Format opsi:')
        expect(workspace).not.toContain('A|Pilihan A|1|true')
    })

    it('nilai awal editor memakai serializer bersama, bukan format lokal', () => {
        expect(workspace).toContain('serializeOptionRows(')
    })
})
