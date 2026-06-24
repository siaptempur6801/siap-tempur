import { describe, expect, it } from 'vitest'
import { estimateReadTime, sanitizeArticleHtml, slugifyArticleTitle } from '../../lib/articles'

describe('article utilities', () => {
    it('creates URL-safe article slugs from titles', () => {
        expect(slugifyArticleTitle('Strategi Lulus SKD CPNS 2026!')).toBe('strategi-lulus-skd-cpns-2026')
    })

    it('strips unsafe HTML from article content', () => {
        const clean = sanitizeArticleHtml('<p>Aman</p><script>alert("xss")</script><a href="https://example.com" onclick="bad()">Link</a>')

        expect(clean).toContain('<p>Aman</p>')
        expect(clean).not.toContain('script')
        expect(clean).not.toContain('onclick')
    })

    it('estimates read time with a minimum of one minute', () => {
        expect(estimateReadTime('<p>Konten pendek</p>')).toBe('1 min read')
    })
})
