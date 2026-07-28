import { describe, expect, it } from 'vitest'
import {
  ensureVisibleQuestionListMarkers,
  hasLegacyMarkdownFormatting,
  normalizeQuestionContentSpacing,
  normalizeQuestionRichText,
} from '@/lib/question-rich-text'

describe('question rich text normalization', () => {
  it('converts legacy TWK explanation markdown into structured rich text', () => {
    const legacyExplanation = [
      '**Jawaban benar: D. Jawaban paling tepat.**',
      '',
      '**Konsep yang diuji:** Gagasan utama paragraf',
      '',
      '**Langkah analisis:**',
      '',
      '- Tentukan kalimat yang paling umum.',
      '- Pastikan pilihan menaungi seluruh kalimat penjelas.',
      '',
      '**Pembahasan:** Kalimat pertama menyatakan inti pembahasan.',
    ].join('\n')

    expect(normalizeQuestionRichText(legacyExplanation)).toBe(
      [
        '<p><strong>Jawaban benar: D. Jawaban paling tepat.</strong></p>',
        '<p><strong>Konsep yang diuji:</strong> Gagasan utama paragraf</p>',
        '<p><strong>Langkah analisis:</strong></p>',
        '<ul style="list-style-type: disc; list-style-position: outside; padding-left: 1.5rem; margin: 0.5rem 0;"><li><p>Tentukan kalimat yang paling umum.</p></li><li><p>Pastikan pilihan menaungi seluruh kalimat penjelas.</p></li></ul>',
        '<p><strong>Pembahasan:</strong> Kalimat pertama menyatakan inti pembahasan.</p>',
      ].join('')
    )
  })

  it('escapes HTML-like input before applying supported markdown formatting', () => {
    const unsafeExplanation = [
      '**Jawaban benar:** <img src=x onerror=alert(1)>',
      '',
      '- Gunakan A & B.',
    ].join('\n')

    expect(normalizeQuestionRichText(unsafeExplanation)).toBe(
      '<p><strong>Jawaban benar:</strong> &lt;img src=x onerror=alert(1)&gt;</p>' +
      '<ul style="list-style-type: disc; list-style-position: outside; padding-left: 1.5rem; margin: 0.5rem 0;"><li><p>Gunakan A &amp; B.</p></li></ul>'
    )
  })

  it('keeps normalized rich HTML idempotent', () => {
    const richText = '<p><strong>Jawaban benar:</strong> D.</p><ul><li><p>Analisis opsi.</p></li></ul>'
    const normalized = normalizeQuestionRichText(richText)

    expect(hasLegacyMarkdownFormatting(richText)).toBe(false)
    expect(normalized).toContain('<ul style="list-style-type: disc;')
    expect(normalizeQuestionRichText(normalized)).toBe(normalized)
  })

  it('supports numbered legacy lists without changing their order', () => {
    const legacyExplanation = [
      '**Urutan analisis:**',
      '',
      '1. Baca stimulus.',
      '2) Bandingkan setiap opsi.',
    ].join('\n')

    expect(normalizeQuestionRichText(legacyExplanation)).toBe(
      '<p><strong>Urutan analisis:</strong></p>' +
      '<ol style="list-style-type: decimal; list-style-position: outside; padding-left: 1.5rem; margin: 0.5rem 0;"><li><p>Baca stimulus.</p></li><li><p>Bandingkan setiap opsi.</p></li></ol>'
    )
  })

  it('adds explicit markers to stored lists and remains idempotent', () => {
    const explanation = '<p><strong>Langkah analisis:</strong></p><ul><li><p>Analisis stimulus.</p></li></ul>'
    const normalized = ensureVisibleQuestionListMarkers(explanation)

    expect(normalized).toBe(
      '<p><strong>Langkah analisis:</strong></p>' +
      '<ul style="list-style-type: disc; list-style-position: outside; padding-left: 1.5rem; margin: 0.5rem 0;"><li><p>Analisis stimulus.</p></li></ul>'
    )
    expect(ensureVisibleQuestionListMarkers(normalized)).toBe(normalized)
  })

  it('renders numbered reading sentences on separate lines with one blank line before the prompt', () => {
    const richText = [
      '<p>(1) Kalimat pertama. (2) Kalimat kedua. (3) Kalimat ketiga.</p>',
      '<p><br></p>',
      '<p>Gagasan utama paragraf tersebut adalah...</p>',
    ].join('')

    expect(normalizeQuestionContentSpacing(richText)).toBe(
      '<p>(1) Kalimat pertama.<br>(2) Kalimat kedua.<br>(3) Kalimat ketiga.</p>' +
      '<p><br></p>' +
      '<p>Gagasan utama paragraf tersebut adalah...</p>'
    )
  })

  it('turns a legacy blank line into one visible blank paragraph', () => {
    const plainText = 'Bacaan tetap dalam satu paragraf.\n\nGagasan utama paragraf tersebut adalah...'

    expect(normalizeQuestionContentSpacing(plainText)).toBe(
      '<p>Bacaan tetap dalam satu paragraf.</p>' +
      '<p><br></p>' +
      '<p>Gagasan utama paragraf tersebut adalah...</p>'
    )
  })

  it('keeps single newlines as line breaks for enumerated statements', () => {
    const plainText = [
      'Perhatikan pernyataan berikut:',
      '1) Pernyataan pertama',
      '2) Pernyataan kedua',
      'Pernyataan yang tepat adalah...',
    ].join('\n')

    expect(normalizeQuestionContentSpacing(plainText)).toBe(
      '<p>Perhatikan pernyataan berikut:<br>1) Pernyataan pertama<br>2) Pernyataan kedua<br>Pernyataan yang tepat adalah...</p>'
    )
  })
})
