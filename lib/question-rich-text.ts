import { escapeHtml, sanitizeHtmlAllowlist } from '@/lib/article-sanitize'

const LEGACY_BOLD_PATTERN = /\*\*(.+?)\*\*/g
const LEGACY_BULLET_PATTERN = /^\s*[-*]\s+(.+)$/
const LEGACY_NUMBERED_PATTERN = /^\s*\d+[.)]\s+(.+)$/
const HTML_PARAGRAPH_PATTERN = /<p>([\s\S]*?)<\/p>/gi
const NUMBERED_SENTENCE_PATTERN = /^\s*\(\d+\)/
const UNORDERED_LIST_STYLE = 'list-style-type: disc; list-style-position: outside; padding-left: 1.5rem; margin: 0.5rem 0;'
const ORDERED_LIST_STYLE = 'list-style-type: decimal; list-style-position: outside; padding-left: 1.5rem; margin: 0.5rem 0;'

export function hasLegacyMarkdownFormatting(value: string) {
  return (
    /\*\*[^*\n]+\*\*/.test(value) ||
    /(^|\n)\s*[-*]\s+\S/.test(value) ||
    /(^|\n)\s*\d+[.)]\s+\S/.test(value)
  )
}

function normalizeInlineMarkdown(value: string) {
  return escapeHtml(value.trim()).replace(LEGACY_BOLD_PATTERN, '<strong>$1</strong>')
}

export function ensureVisibleQuestionListMarkers(value: string) {
  return value
    .replace(/<ul(\s[^>]*)?>/gi, (openingTag, attributes = '') => (
      /\sstyle\s*=/i.test(openingTag)
        ? openingTag
        : `<ul${attributes} style="${UNORDERED_LIST_STYLE}">`
    ))
    .replace(/<ol(\s[^>]*)?>/gi, (openingTag, attributes = '') => (
      /\sstyle\s*=/i.test(openingTag)
        ? openingTag
        : `<ol${attributes} style="${ORDERED_LIST_STYLE}">`
    ))
}

export function normalizeQuestionRichText(value: string) {
  if (!value) {
    return value
  }

  if (!hasLegacyMarkdownFormatting(value)) {
    return ensureVisibleQuestionListMarkers(value)
  }

  const html: string[] = []
  let paragraphLines: string[] = []
  let listItems: string[] = []
  let listType: 'ul' | 'ol' | null = null

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return

    html.push(`<p>${normalizeInlineMarkdown(paragraphLines.join(' '))}</p>`)
    paragraphLines = []
  }

  const flushList = () => {
    if (!listType || listItems.length === 0) return

    const items = listItems
      .map((item) => `<li><p>${normalizeInlineMarkdown(item)}</p></li>`)
      .join('')

    html.push(`<${listType}>${items}</${listType}>`)
    listItems = []
    listType = null
  }

  for (const line of value.trim().split(/\r?\n/)) {
    if (!line.trim()) {
      flushParagraph()
      flushList()
      continue
    }

    const bulletMatch = line.match(LEGACY_BULLET_PATTERN)
    const numberedMatch = line.match(LEGACY_NUMBERED_PATTERN)
    const nextListType = bulletMatch ? 'ul' : numberedMatch ? 'ol' : null

    if (nextListType) {
      flushParagraph()

      if (listType && listType !== nextListType) {
        flushList()
      }

      listType = nextListType
      listItems = [...listItems, (bulletMatch || numberedMatch)![1]]
      continue
    }

    flushList()
    paragraphLines = [...paragraphLines, line.trim()]
  }

  flushParagraph()
  flushList()

  return ensureVisibleQuestionListMarkers(html.join(''))
}

function normalizeHtmlQuestionParagraphs(value: string) {
  const paragraphMatches = [...value.matchAll(HTML_PARAGRAPH_PATTERN)]
  const contentOutsideParagraphs = value.replace(HTML_PARAGRAPH_PATTERN, '').trim()

  if (paragraphMatches.length === 0 || contentOutsideParagraphs) {
    return value
  }

  let numberedSentences: string[] = []
  let normalizedParagraphs: string[] = []

  const splitSequentialNumberedSentences = (paragraphContent: string) => {
    let remainingContent = paragraphContent
    let expectedNumber = 2
    let sentences: string[] = []

    while (expectedNumber <= 99) {
      const separator = new RegExp(`\\s+(?=\\(${expectedNumber}\\)\\s)`)
      const separatorMatch = separator.exec(remainingContent)

      if (!separatorMatch) break

      sentences = [
        ...sentences,
        remainingContent.slice(0, separatorMatch.index).trim(),
      ]
      remainingContent = remainingContent.slice(separatorMatch.index).trim()
      expectedNumber += 1
    }

    return [...sentences, remainingContent]
  }

  const flushNumberedSentences = () => {
    if (numberedSentences.length === 0) return

    normalizedParagraphs = [
      ...normalizedParagraphs,
      `<p>${numberedSentences.join('<br>')}</p>`,
    ]
    numberedSentences = []
  }

  for (const paragraphMatch of paragraphMatches) {
    const paragraphContent = paragraphMatch[1].trim()

    if (NUMBERED_SENTENCE_PATTERN.test(paragraphContent)) {
      numberedSentences = [
        ...numberedSentences,
        ...splitSequentialNumberedSentences(paragraphContent),
      ]
      continue
    }

    flushNumberedSentences()

    if (!paragraphContent || /^<br\s*\/?>$/i.test(paragraphContent)) {
      const previousParagraph = normalizedParagraphs.at(-1)
      if (previousParagraph !== '<p><br></p>') {
        normalizedParagraphs = [...normalizedParagraphs, '<p><br></p>']
      }
      continue
    }

    normalizedParagraphs = [
      ...normalizedParagraphs,
      `<p>${paragraphContent}</p>`,
    ]
  }

  flushNumberedSentences()
  return normalizedParagraphs.join('')
}

export function normalizeQuestionContentSpacing(value: string) {
  if (!value) return value

  if (/<\/?[a-z][^>]*>/i.test(value)) {
    return normalizeHtmlQuestionParagraphs(value)
  }

  if (!/\r?\n/.test(value)) {
    return value
  }

  const paragraphs = value
    .trim()
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n+/)
    .map((paragraph) => (
      `<p>${paragraph
        .split('\n')
        .map((line) => escapeHtml(line.trim()))
        .join('<br>')}</p>`
    ))

  return paragraphs.join('<p><br></p>')
}

/**
 * Tokenizer teks soal untuk renderer.
 *
 * Satu fungsi menangani DUA format yang hidup berdampingan:
 *   - format lama: `$...$`, `$$...$$`, `[[image:url]]`, `[[spacer:...]]`
 *   - format editor visual: `<span data-latex="...">`, `<div data-latex-block="...">`,
 *     `<img src="...">`
 *
 * Renderer peserta dan pratinjau memakai fungsi yang sama, sehingga soal lama
 * (teks polos/markdown/HTML) dan soal baru (HTML editor) tampil sama.
 */
export type RichTextSegment =
  | { kind: 'text'; value: string }
  | { kind: 'image'; url: string; alt: string }
  | { kind: 'spacer'; size: 'sm' | 'md' | 'lg' }
  | { kind: 'math-inline'; latex: string }
  | { kind: 'math-block'; latex: string }

export function decodeHtmlEntities(value: string) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

/** Membaca satu atribut dari potongan tag HTML mentah (nilai di-decode). */
export function readHtmlAttribute(tag: string, name: string) {
  const match = tag.match(new RegExp(`${name}\\s*=\\s*"([^"]*)"`, 'i'))
  return match ? decodeHtmlEntities(match[1]) : ''
}

const SEGMENT_PATTERN = /(\[\[image:[^\]]+\]\]|\[\[spacer:(?:sm|md|lg)\]\]|\$\$[\s\S]*?\$\$|\$[\s\S]*?\$|<span[^>]*data-latex="[^"]*"[^>]*>\s*<\/span>|<div[^>]*data-latex-block="[^"]*"[^>]*>\s*<\/div>|<img[^>]*>)/g

export function parseRichTextSegments(value: string): RichTextSegment[] {
  if (!value) return []
  return value.split(SEGMENT_PATTERN).flatMap((part): RichTextSegment[] => {
    if (!part) return []
    if (part.startsWith('[[image:') && part.endsWith(']]')) {
      return [{ kind: 'image', url: part.slice('[[image:'.length, -2).trim(), alt: '' }]
    }
    if (part.startsWith('[[spacer:') && part.endsWith(']]')) {
      const size = part.slice('[[spacer:'.length, -2)
      return [{ kind: 'spacer', size: size === 'sm' || size === 'lg' ? size : 'md' }]
    }
    if (part.startsWith('$$') && part.endsWith('$$')) return [{ kind: 'math-block', latex: part.slice(2, -2) }]
    if (part.startsWith('$') && part.endsWith('$')) return [{ kind: 'math-inline', latex: part.slice(1, -1) }]
    if (part.startsWith('<span')) return [{ kind: 'math-inline', latex: readHtmlAttribute(part, 'data-latex') }]
    if (part.startsWith('<div')) return [{ kind: 'math-block', latex: readHtmlAttribute(part, 'data-latex-block') }]
    if (part.startsWith('<img')) return [{ kind: 'image', url: readHtmlAttribute(part, 'src'), alt: readHtmlAttribute(part, 'alt') }]
    return [{ kind: 'text', value: part }]
  })
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replace(/`/g, '&#96;')
}

const TOKEN_PATTERN = /(\$\$[\s\S]*?\$\$|\$[^$\n]*?\$|\[\[image:[^\]]+\]\]|\[\[spacer:(?:sm|md|lg)\]\])/g

function isLegacyToken(part: string) {
  return /^\$\$[\s\S]*\$\$$/.test(part)
    || /^\$[^$\n]*\$$/.test(part)
    || /^\[\[image:[^\]]+\]\]$/.test(part)
    || /^\[\[spacer:(?:sm|md|lg)\]\]$/.test(part)
}

function tokenToEditorHtml(token: string) {
  if (token.startsWith('$$')) return `<div data-latex-block="${escapeAttribute(token.slice(2, -2))}"></div>`
  if (token.startsWith('$')) return `<span data-latex="${escapeAttribute(token.slice(1, -1))}"></span>`
  if (token.startsWith('[[image:')) return `<img src="${escapeAttribute(token.slice('[[image:'.length, -2).trim())}" alt="">`
  return '<p></p>'
}

/** Mengubah satu baris teks: token jadi node HTML, sisanya di-escape. */
function lineToEditorHtml(line: string) {
  return line.split(TOKEN_PATTERN).map((part) => {
    if (!part) return ''
    return isLegacyToken(part) ? tokenToEditorHtml(part) : escapeHtml(part)
  }).join('')
}

const EDITOR_HTML_PATTERN = /<(p|ul|ol|li|strong|em|img|span|div|br|h1|h2|h3|s|u|mark)\b/i

/**
 * Menyiapkan nilai tersimpan untuk editor visual.
 *
 * Nilai yang sudah HTML (soal lama ber-`<p>`, atau soal yang pernah disimpan
 * editor) disanitasi setelah token rumus/gambar dikonversi. Teks polos diubah
 * menjadi paragraf/daftar dengan token menjadi node HTML dan teks di-escape.
 */
export function questionTextToEditorHtml(value: string): string {
  if (!value?.trim()) return ''

  if (EDITOR_HTML_PATTERN.test(value)) {
    const withTokens = value
      .split(TOKEN_PATTERN)
      .map((part) => (part && isLegacyToken(part) ? tokenToEditorHtml(part) : part))
      .join('')
    return sanitizeEditorHtml(withTokens)
  }

  const lines = value.replace(/\r\n?/g, '\n').split('\n')
  const blocks: string[] = []
  let listType: 'ul' | 'ol' | null = null
  let listItems: string[] = []
  let paragraphLines: string[] = []

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return
    blocks.push(`<p>${paragraphLines.join('<br>')}</p>`)
    paragraphLines = []
  }
  const flushList = () => {
    if (!listType || listItems.length === 0) return
    blocks.push(`<${listType}>${listItems.map((item) => `<li><p>${item}</p></li>`).join('')}</${listType}>`)
    listItems = []
    listType = null
  }

  for (const line of lines) {
    const trimmed = line.trim()
    const bullet = trimmed.match(/^[-*]\s+(.+)$/)
    const numbered = trimmed.match(/^\d+[.)]\s+(.+)$/)
    const nextListType = bullet ? 'ul' : numbered ? 'ol' : null

    if (!trimmed) {
      flushParagraph()
      flushList()
      continue
    }
    if (nextListType) {
      flushParagraph()
      if (listType && listType !== nextListType) flushList()
      listType = nextListType
      listItems = [...listItems, lineToEditorHtml((bullet || numbered)![1])]
      continue
    }
    flushList()
    if (/^\[\[image:[^\]]+\]\]$/.test(trimmed)) {
      // Gambar berdiri sendiri sebagai blok, bukan di dalam paragraf.
      flushParagraph()
      blocks.push(tokenToEditorHtml(trimmed))
      continue
    }
    paragraphLines = [...paragraphLines, lineToEditorHtml(trimmed)]
  }
  flushParagraph()
  flushList()

  return sanitizeEditorHtml(blocks.join(''))
}

const EDITOR_ALLOWED_TAGS = new Set(['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'mark', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'hr', 'span', 'div', 'img'])
const EDITOR_ALLOWED_ATTRS = new Set(['style', 'src', 'alt', 'data-latex', 'data-latex-block'])

/** Sanitasi HTML editor dengan allowlist yang sama dengan renderer soal. */
export function sanitizeEditorHtml(value: string) {
  return sanitizeHtmlAllowlist(value, EDITOR_ALLOWED_TAGS, EDITOR_ALLOWED_ATTRS, { allowStyle: true })
}
