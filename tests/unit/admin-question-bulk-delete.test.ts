import { describe, expect, it } from 'vitest'
import { normalizeBulkQuestionIds } from '../../lib/admin-question-bulk-delete'

describe('normalizeBulkQuestionIds', () => {
    it('deduplicates and trims submitted question ids', () => {
        expect(normalizeBulkQuestionIds([' q-1 ', 'q-2', 'q-1', '', '   '])).toEqual(['q-1', 'q-2'])
    })

    it('limits bulk deletion to one admin page worth of questions', () => {
        const ids = Array.from({ length: 105 }, (_, index) => `q-${index + 1}`)

        expect(normalizeBulkQuestionIds(ids)).toHaveLength(100)
    })
})
