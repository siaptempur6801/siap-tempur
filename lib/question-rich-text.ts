import { escapeHtml } from '@/lib/article-sanitize'

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
