/**
 * Membangun daftar isi (table of contents) dari HTML artikel blog.
 *
 * Isi artikel sudah disanitasi sebelum sampai ke sini (`sanitizeArticleHtml`), jadi kita hanya
 * perlu: memberi `id` pada setiap `<h2>` (menghormati `id` yang sudah ada), menambahkan
 * `scroll-margin-top` agar judul tidak tertutup header lengket, dan mengumpulkan daftar item
 * untuk navigasi. Slug dibuat unik supaya tautan tidak saling menimpa.
 */
export type ArticleTocItem = {
  id: string
  label: string
}

const HEADING_PATTERN = /<h2(\s[^>]*)?>([\s\S]*?)<\/h2>/gi
const HTML_TAG_PATTERN = /<[^>]+>/g
const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
}

function decodeEntities(value: string) {
  return value.replace(/&(?:amp|lt|gt|quot|#39|apos|nbsp);/g, (match) => ENTITIES[match] ?? match)
}

/** Ubah judul menjadi slug yang aman untuk `id` HTML. */
export function slugifyHeading(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
    .replace(/^-|-$/g, '')
}

function uniqueId(base: string, used: Set<string>) {
  const fallback = base.length > 0 ? base : 'bagian'
  if (!used.has(fallback)) {
    used.add(fallback)
    return fallback
  }
  let index = 2
  while (used.has(`${fallback}-${index}`)) index += 1
  const next = `${fallback}-${index}`
  used.add(next)
  return next
}

export function buildArticleToc(html: string): { html: string; items: ArticleTocItem[] } {
  const items: ArticleTocItem[] = []
  const used = new Set<string>()

  const withAnchors = html.replace(
    HEADING_PATTERN,
    (match, attributes: string | undefined, inner: string) => {
      const label = decodeEntities(inner.replace(HTML_TAG_PATTERN, '')).replace(/\s+/g, ' ').trim()
      const existingId = attributes?.match(/\sid=["']([^"']+)["']/i)?.[1]
      const id = uniqueId(existingId?.trim() || slugifyHeading(label), used)
      items.push({ id, label: label || id })

      const attrs = attributes ?? ''
      // `scroll-margin-top` inline supaya tidak bergantung pada kelas yang di-generate Tailwind.
      const withoutId = attrs.replace(/\sid=["'][^"']*["']/i, '')
      const withoutScrollMargin = withoutId.replace(/\sstyle=["'][^"']*["']/i, (styleAttr) =>
        styleAttr.replace(/["']$/, '; scroll-margin-top: 7rem"'),
      )
      const styleAttr = /\sstyle=["']/i.test(attrs)
        ? withoutScrollMargin
        : `${withoutScrollMargin} style="scroll-margin-top: 7rem"`

      return `<h2 id="${id}"${styleAttr}>${inner}</h2>`
    },
  )

  // Judul tanpa teks (mis. hanya gambar) tidak masuk daftar isi.
  return { html: withAnchors, items: items.filter((item) => item.label.length > 0) }
}
