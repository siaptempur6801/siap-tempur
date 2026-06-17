import { describe, expect, it } from 'vitest'
import { MINI_TRYOUT_PRODUCTS, MINI_TRYOUT_TYPES, SUBJECTS, TRYOUT_TOKEN_COST, getMiniTryoutProduct, isMiniTryoutType } from '@/lib/constants'

describe('mini tryout config', () => {
    it('defines exactly the three SKD mini tryout products in display order', () => {
        expect(MINI_TRYOUT_TYPES).toEqual(['TWK', 'TIU', 'TKP'])
        expect(MINI_TRYOUT_PRODUCTS.map((product) => product.type)).toEqual(MINI_TRYOUT_TYPES)
    })

    it('uses subject metadata for question count, max score, and passing grade', () => {
        MINI_TRYOUT_PRODUCTS.forEach((product) => {
            const subject = SUBJECTS[product.type]

            expect(product.questionCount).toBe(subject.fullMark / 5)
            expect(product.maxScore).toBe(subject.fullMark)
            expect(product.passingGrade).toBe(subject.passing)
            expect(TRYOUT_TOKEN_COST).toBe(1)
            expect(product.tokenCost).toBe(TRYOUT_TOKEN_COST)
        })
    })

    it('guards mini tryout type input at runtime', () => {
        expect(isMiniTryoutType('TWK')).toBe(true)
        expect(isMiniTryoutType('SKB')).toBe(false)
        expect(getMiniTryoutProduct('TIU')?.title).toBe('Mini Tryout TIU')
        expect(getMiniTryoutProduct('')).toBeNull()
    })
})
