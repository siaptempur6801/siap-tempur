import { describe, expect, it } from 'vitest'
import { LATEX_SNIPPETS, compactLatexSnippets, insertLatexSnippet } from '@/lib/latex-snippets'

/**
 * Snippet rumus: setiap entri harus valid untuk `MathRenderer` (`$...$` inline
 * atau `$$...$$` blok), dan penyisipan harus menempatkan kursor di dalam `{}`
 * agar penulis langsung bisa mengetik.
 */
describe('snippet LaTeX', () => {
  it('setiap snippet punya label, judul, dan pembungkus $ yang seimbang', () => {
    for (const snippet of LATEX_SNIPPETS) {
      expect(snippet.label, snippet.title).not.toBe('')
      expect(snippet.title, snippet.label).not.toBe('')
      const dollars = (snippet.insert.match(/\$/g) ?? []).length
      expect(dollars === 2 || dollars === 4, `${snippet.title}: ${snippet.insert}`).toBe(true)
      expect(snippet.insert.startsWith('$'), snippet.title).toBe(true)
      expect(snippet.insert.endsWith('$'), snippet.title).toBe(true)
      expect(snippet.insert.replace(/\$/g, '').trim().length, snippet.title).toBeGreaterThan(0)
    }
  })

  it('toolbar ringkas hanya memuat snippet dasar', () => {
    const compact = compactLatexSnippets()
    expect(compact.length).toBeGreaterThanOrEqual(4)
    expect(compact.every((snippet) => !snippet.advanced)).toBe(true)
    expect(compact.map((snippet) => snippet.title)).toContain('Pecahan')
  })

  it('menyisipkan pecahan dan menempatkan kursor di dalam kurung pertama', () => {
    const snippet = LATEX_SNIPPETS.find((item) => item.title === 'Pecahan')!
    const result = insertLatexSnippet('Hitung', 6, 6, snippet)

    expect(result.value).toBe('Hitung $\\frac{}{}$')
    expect(result.value[result.cursor - 1]).toBe('{')
    expect(result.value[result.cursor]).toBe('}')
  })

  it('menyisipkan rumus blok dengan pembungkus $$', () => {
    const snippet = LATEX_SNIPPETS.find((item) => item.title === 'Integral')!
    const result = insertLatexSnippet('', 0, 0, snippet)

    expect(result.value.startsWith('$$')).toBe(true)
    expect(result.value.endsWith('$$')).toBe(true)
  })

  it('mengganti teks yang diseleksi', () => {
    const snippet = LATEX_SNIPPETS.find((item) => item.title === 'Pi')!
    const result = insertLatexSnippet('nilai x', 6, 7, snippet)

    expect(result.value).toBe('nilai $\\pi$')
  })
})
