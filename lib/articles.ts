import DOMPurify from 'isomorphic-dompurify'

export function slugifyArticleTitle(title: string): string {
    return title
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/-{2,}/g, '-')
}

export function estimateReadTime(content: string): string {
    const words = content
        .replace(/<[^>]*>/g, ' ')
        .trim()
        .split(/\s+/)
        .filter(Boolean).length
    return `${Math.max(1, Math.ceil(words / 200))} min read`
}

export function sanitizeArticleHtml(content: string): string {
    return DOMPurify.sanitize(content, {
        ALLOWED_TAGS: [
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
        ],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'title'],
    })
}

export function formatArticleDate(value: string | null | undefined): string {
    if (!value) return 'Draft'

    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(new Date(value))
}
