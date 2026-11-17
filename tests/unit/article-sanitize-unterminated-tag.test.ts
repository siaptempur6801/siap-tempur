import { describe, expect, it } from 'vitest'

import { sanitizeArticleHtml, sanitizeHtmlAllowlist } from '@/lib/article-sanitize'

/**
 * Regresi audit 2026-11-17: tag yang tidak ditutup tidak cocok dengan pola tag
 * sanitizer, sehingga dulu lolos mentah. Saat HTML hasil sanitasi digabung dengan
 * markup sesudahnya (mis. `</div>` pembungkus), parser browser membentuknya
 * menjadi elemen beserta atribut event handler-nya.
 */
describe('sanitizeHtmlAllowlist — tag tidak tertutup', () => {
  it('meng-escape <img> tanpa > di akhir konten', () => {
    const output = sanitizeArticleHtml('<p>ok</p><img src=x onerror=alert(1) ')
    expect(output).toBe('<p>ok</p>&lt;img src=x onerror=alert(1) ')
    expect(output).not.toMatch(/<img/i)
  })

  it('meng-escape tag tidak tertutup yang diikuti komentar JS', () => {
    const output = sanitizeArticleHtml('<p>a</p><img src="https://x.test/y.png" onerror=alert(1)//')
    expect(output).not.toMatch(/<img/i)
    expect(output.startsWith('<p>a</p>&lt;img')).toBe(true)
  })

  it('tetap tidak menghasilkan elemen ketika dibungkus markup lain', () => {
    const wrapped = `<div>${sanitizeArticleHtml('<svg onload=alert(1) ')}</div>`
    expect(wrapped).toBe('<div>&lt;svg onload=alert(1) </div>')
  })

  it('mempertahankan teks perbandingan sebagai karakter yang dirender sama', () => {
    expect(sanitizeArticleHtml('<p>3 < 5 dan 7 > 2</p>')).toBe('<p>3 &lt; 5 dan 7 > 2</p>')
  })

  it('tidak mengubah markup yang valid', () => {
    const html =
      '<h2>Judul</h2><p>Teks <strong>tebal</strong> dan <a href="https://siaptempur.id/blog">tautan</a>.</p>'
    expect(sanitizeArticleHtml(html)).toBe(html)
  })

  it('tetap membuang atribut event handler dan URL javascript:', () => {
    expect(sanitizeArticleHtml('<a href="javascript:alert(1)" onclick="x()">x</a>')).toBe(
      '<a>x</a>',
    )
  })

  it('berlaku juga untuk allowlist renderer soal dengan style', () => {
    const output = sanitizeHtmlAllowlist(
      '<p style="color: red">x</p><span style="color:red" onmouseover=alert(1) ',
      new Set(['p', 'span']),
      new Set(['style']),
      { allowStyle: true },
    )
    expect(output).toBe(
      '<p style="color: red">x</p>&lt;span style="color:red" onmouseover=alert(1) ',
    )
  })
})
