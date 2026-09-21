import { describe, it, expect } from 'vitest'
import { serializeOptionRows, parseQuestionOptions } from '@/lib/question-options'
import { validateBankOptions, questionBankReturnUrl, questionBankSchema } from '@/lib/question-bank'

const options = [
    { key: 'A', content: 'Nilai |x|\n\\frac{1}{2} 😀', score: 1, isCorrect: true },
    { key: 'B', content: 'B', score: 0, isCorrect: false },
]
describe('Question Bank lossless payload and validation', () => {
    it('preserves formulas, newlines, unicode, null and zero through the database/editor boundary', () => {
        const raw = serializeOptionRows([{ option_key: 'A', content: options[0].content, score: 0, is_correct: null, image_url: 'https://example.org/x?q=a|b' }])
        expect(parseQuestionOptions(raw)[0]).toMatchObject({ content: options[0].content, score: 0, isCorrect: null, imageUrl: 'https://example.org/x?q=a|b' })
    })
    it('rejects malformed payload instead of generating replacement default answers', () => {
        for (const raw of ['[broken', '[{}]', '[null]', JSON.stringify([{ key: 'A', content: 'A', score: [] }])]) expect(() => parseQuestionOptions(raw)).toThrow()
    })
    it('accepts one correct single choice', () => expect(validateBankOptions('single_choice', JSON.stringify(options))).toHaveLength(2))
    it('rejects empty, duplicate, empty-content and invalid-score options', () => {
        for (const rows of [[], [options[0]], [options[0], options[0]], [options[0], { ...options[1], content: ' ' }], [options[0], { ...options[1], score: -1 }], [options[0], { ...options[1], score: 0.123 }]]) expect(() => validateBankOptions('single_choice', JSON.stringify(rows))).toThrow()
    })
    it('matches reviewer multiple choice rules', () => {
        expect(() => validateBankOptions('multiple_choice', JSON.stringify(options))).toThrow()
        const rows = [...options, { key: 'C', content: 'C', isCorrect: true }]
        expect(validateBankOptions('multiple_choice', JSON.stringify(rows))).toHaveLength(3)
        expect(() => validateBankOptions('multiple_choice', JSON.stringify(rows.map((o) => ({ ...o, isCorrect: true }))))).toThrow()
    })
    it('requires two category groups with two options and one correct answer each', () => {
        const rows = [...options.map((o) => ({ ...o, responseGroup: 'G1' })), ...options.map((o) => ({ ...o, key: `${o.key}2`, responseGroup: 'G2' }))]
        expect(validateBankOptions('category', JSON.stringify(rows))).toHaveLength(4)
        expect(() => validateBankOptions('category', JSON.stringify(rows.slice(0, 3)))).toThrow()
        expect(() => validateBankOptions('category', JSON.stringify(rows.slice(0, 2)))).toThrow()
    })
    it('rejects script, insecure and credential-containing image URLs', () => {
        for (const imageUrl of ['javascript:alert(1)', 'http://example.org/a.png', 'https://user:pass@example.org/a.png']) expect(() => validateBankOptions('single_choice', JSON.stringify([{ ...options[0], imageUrl }, options[1]]))).toThrow()
    })
    it('return URL always stays on Question Bank and preserves filters', () => {
        const form = new FormData()
        for (const [key, value] of Object.entries({ program: 'TKA', track: 'SMP', q: '|x|', status: 'draft', subject: 'MAT', page: '4' })) form.set(`return_${key}`, value)
        form.set('returnTo', 'https://evil.example')
        const url = new URL(questionBankReturnUrl(form, 'Tersimpan'), 'https://example.org')
        expect(url.pathname).toBe('/admin/content/questions')
        expect(url.searchParams.get('q')).toBe('|x|')
        expect(url.searchParams.get('page')).toBe('4')
        expect(url.searchParams.get('subject')).toBe('MAT')
    })
    it('requires optimistic version and matching context', () => {
        const input = { id: '', program: 'CPNS', track: 'SKD', subject: 'TIU', questionType: 'single_choice', stem: 'Q', difficulty: 'medium', explanation: '', sourceReference: '', cognitiveLevel: '', estimatedSeconds: '', stimulusId: '', knowledgeNodeId: '', changeReason: 'test', expectedVersion: 0, expectedUpdatedAt: '', options: JSON.stringify(options) }
        expect(questionBankSchema.safeParse(input).success).toBe(true)
        expect(questionBankSchema.safeParse({ ...input, track: 'SMP' }).success).toBe(false)
        expect(questionBankSchema.safeParse({ ...input, id: '438b18d9-0d22-4411-8c2b-e11ed6380720' }).success).toBe(false)
    })
})
