export type AppRole = 'user' | 'article_writer' | 'admin' | 'superadmin'

export function isAdminRole(role: string | null | undefined): boolean {
    return role === 'admin' || role === 'superadmin'
}

export function isArticleWriterRole(role: string | null | undefined): boolean {
    return role === 'article_writer'
}

export function canAccessArticleAdmin(role: string | null | undefined): boolean {
    return isAdminRole(role) || isArticleWriterRole(role)
}

export function canPublishArticle(role: string | null | undefined): boolean {
    return isAdminRole(role)
}
