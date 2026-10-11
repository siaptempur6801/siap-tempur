function normalizeRole(role: string | null | undefined) {
  return role?.trim().toUpperCase() ?? ''
}

/**
 * Transitional compatibility helpers.
 * New authorization code must use AuthorizationService + permission codes.
 * These helpers remain while legacy admin/article routes are migrated.
 */
export function isAdminRole(role: string | null | undefined): boolean {
  const normalized = normalizeRole(role)
  return normalized === 'ADMIN' || normalized === 'SUPERADMIN' || normalized === 'SUPER_ADMIN'
}

export function isArticleWriterRole(role: string | null | undefined): boolean {
  const normalized = normalizeRole(role)
  return normalized === 'ARTICLE_WRITER' || normalized === 'CONTENT_EDITOR'
}

export function canAccessArticleAdmin(role: string | null | undefined): boolean {
  const normalized = normalizeRole(role)
  return (
    isAdminRole(role) ||
    normalized === 'CONTENT_EDITOR' ||
    normalized === 'CONTENT_REVIEWER' ||
    normalized === 'ARTICLE_WRITER'
  )
}

export function canPublishArticle(role: string | null | undefined): boolean {
  const normalized = normalizeRole(role)
  return isAdminRole(role) || normalized === 'CONTENT_REVIEWER'
}
