import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const activeSessionPage = readFileSync(
    resolve(__dirname, '../../app/cpns/dashboard/tryout/[sessionId]/page.tsx'),
    'utf8'
)
const resultPage = readFileSync(
    resolve(__dirname, '../../app/cpns/dashboard/tryout/[sessionId]/result/page.tsx'),
    'utf8'
)

describe('exam option ordering', () => {
    it('does not randomize or persist per-session option order in exam pages', () => {
        const source = `${activeSessionPage}\n${resultPage}`

        expect(source).not.toContain('option-randomizer')
        expect(source).not.toContain('getOptionOrderForSession')
        expect(source).not.toContain('orderOptionsById')
        expect(source).not.toContain('option_order')
    })
})
