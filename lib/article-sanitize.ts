const ARTICLE_ALLOWED_TAGS = new Set([
  'a',
  'blockquote',
  'br',
  'code',
  'em',
  'h2',
  'h3',
  'h4',
  'li',
  'ol',
  'p',
  'pre',
  'strong',
  'ul',
  'img',
  's',
  'u',
])

const ARTICLE_ALLOWED_ATTRS = new Set(['href', 'target', 'rel', 'src', 'alt', 'title'])

function isSafeHtmlUrl(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return false
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) return true

  try {
    const url = new URL(trimmed)
    return url.protocol === 'https:' || url.protocol === 'http:' || url.protocol === 'mailto:'
  } catch {
    return false
  }
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeHtmlAttribute(value: string) {
  return escapeHtml(value).replace(/`/g, '&#96;')
}

export function sanitizeHtmlAllowlist(
  content: string,
  allowedTags: Set<string>,
  allowedAttrs: Set<string>,
  options: { allowStyle?: boolean } = {},
) {
  const withoutDangerousBlocks = content
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(
      /<\s*(script|style|iframe|object|embed|link|meta|base|form|input|button|textarea|select|svg|math)\b[\s\S]*?<\s*\/\s*\1\s*>/gi,
      '',
    )

  // Teks di antara tag dikeluarkan apa adanya, kecuali `<`. Tanpa escape ini,
  // tag yang tidak ditutup (`<img src=x onerror=…` tanpa `>`) tidak cocok dengan
  // pola tag, lolos sebagai teks, lalu dibentuk menjadi elemen oleh parser HTML
  // browser saat digabung dengan markup sesudahnya. `&lt;` dirender identik.
  const escapeStrayAngles = (text: string) => text.replace(/</g, '&lt;')
  const tagPattern = /<\/?([a-zA-Z][a-zA-Z0-9-]*)([^>]*)>/g
  let output = ''
  let lastIndex = 0
  for (const match of withoutDangerousBlocks.matchAll(tagPattern)) {
    const index = match.index ?? 0
    output += escapeStrayAngles(withoutDangerousBlocks.slice(lastIndex, index))
    output += sanitizeTag(match[0], match[1], match[2])
    lastIndex = index + match[0].length
  }
  return output + escapeStrayAngles(withoutDangerousBlocks.slice(lastIndex))

  function sanitizeTag(rawTag: string, rawName: string, rawAttrs: string) {
    const tagName = rawName.toLowerCase()
    if (!allowedTags.has(tagName)) return ''

    if (rawTag.startsWith('</')) {
      return `</${tagName}>`
    }

    const attrs: string[] = []
    const attrPattern =
      /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*(?:=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g
    for (const match of rawAttrs.matchAll(attrPattern)) {
      const attrName = match[1].toLowerCase()
      const attrValue = match[3] ?? match[4] ?? match[5] ?? ''

      if (attrName.startsWith('on')) continue
      if (!allowedAttrs.has(attrName)) continue
      if ((attrName === 'href' || attrName === 'src') && !isSafeHtmlUrl(attrValue)) continue
      if (
        attrName === 'style' &&
        (!options.allowStyle || /url\s*\(|expression\s*\(/i.test(attrValue))
      )
        continue

      attrs.push(`${attrName}="${escapeHtmlAttribute(attrValue)}"`)
    }

    return `<${tagName}${attrs.length ? ` ${attrs.join(' ')}` : ''}>`
  }
}

export function sanitizeArticleHtml(content: string): string {
  return sanitizeHtmlAllowlist(content, ARTICLE_ALLOWED_TAGS, ARTICLE_ALLOWED_ATTRS)
}
