import { describe, expect, it } from 'vitest'
import { estimateReadTime, slugifyArticleTitle } from '../../lib/articles'
import { sanitizeArticleHtml } from '../../lib/article-sanitize'

describe('article utilities', () => {
    it('creates URL-safe article slugs from titles', () => {
        expect(slugifyArticleTitle('Strategi Lulus SKD CPNS 2026!')).toBe('strategi-lulus-skd-cpns-2026')
    })

    it('strips unsafe HTML from article content', () => {
        const clean = sanitizeArticleHtml('<p>Aman</p><script>alert("xss")</script><a href="https://example.com" onclick="bad()">Link</a><img src="javascript:alert(1)" onerror="bad()" alt="x" />')

        expect(clean).toContain('<p>Aman</p>')
        expect(clean).toContain('<a href="https://example.com">Link</a>')
        expect(clean).not.toContain('script')
        expect(clean).not.toContain('onclick')
        expect(clean).not.toContain('onerror')
        expect(clean).not.toContain('javascript:')
    })

    it('estimates read time with a minimum of one minute', () => {
        expect(estimateReadTime('<p>Konten pendek</p>')).toBe('1 min read')
    })
})
