import { describe, expect, it } from 'vitest'
import { calculateMaxScore, calculateResponseScore } from '@/src/domain/question-response'

const option = (id: string, isCorrect: boolean, score = 1, responseGroup: string | null = null) => ({
    id,
    isCorrect,
    score,
    responseGroup,
})

describe('question response scoring', () => {
    it('keeps single choice behavior', () => {
        const options = [option('a', true, 5), option('b', false, 0)]
        expect(calculateResponseScore({ questionType: 'single_choice', options, selectedOptionIds: ['a'], maxScore: 5 }))
            .toMatchObject({ score: 5, isCorrect: true, answered: true })
        expect(calculateResponseScore({ questionType: 'single_choice', options, selectedOptionIds: ['b'], maxScore: 5 }))
            .toMatchObject({ score: 0, isCorrect: false, answered: true })
    })

    it('requires exact set for multiple choice', () => {
        const options = [
            option('a', true),
            option('b', true),
            option('c', false, 0),
            option('d', false, 0),
        ]
        expect(calculateMaxScore({ questionType: 'multiple_choice', options })).toBe(2)
        expect(calculateResponseScore({ questionType: 'multiple_choice', options, selectedOptionIds: ['a', 'b'] }))
            .toMatchObject({ score: 2, isCorrect: true })
        expect(calculateResponseScore({ questionType: 'multiple_choice', options, selectedOptionIds: ['a'] }))
            .toMatchObject({ score: 0, isCorrect: false })
        expect(calculateResponseScore({ questionType: 'multiple_choice', options, selectedOptionIds: ['a', 'b', 'c'] }))
            .toMatchObject({ score: 0, isCorrect: false })
    })

    it('scores category questions one selection per response group', () => {
        const options = [
            option('g1-true', true, 1, 'Statement 1'),
            option('g1-false', false, 0, 'Statement 1'),
            option('g2-true', false, 0, 'Statement 2'),
            option('g2-false', true, 1, 'Statement 2'),
            option('g3-true', true, 1, 'Statement 3'),
            option('g3-false', false, 0, 'Statement 3'),
        ]
        expect(calculateMaxScore({ questionType: 'category', options })).toBe(3)
        expect(calculateResponseScore({
            questionType: 'category',
            options,
            selectedOptionIds: ['g1-true', 'g2-false', 'g3-true'],
        })).toMatchObject({ score: 3, maxScore: 3, isCorrect: true })
        expect(calculateResponseScore({
            questionType: 'category',
            options,
            selectedOptionIds: ['g1-true', 'g2-true', 'g3-true'],
        })).toMatchObject({ score: 2, maxScore: 3, isCorrect: false })
    })
})
