import DOMPurify from 'isomorphic-dompurify'

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
