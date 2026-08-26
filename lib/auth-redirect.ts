const DEFAULT_AUTH_RETURN_TO = '/'

export function sanitizeAuthReturnTo(returnTo?: string | null) {
    if (!returnTo) return DEFAULT_AUTH_RETURN_TO

    const trimmed = returnTo.trim()
    if (!trimmed) return DEFAULT_AUTH_RETURN_TO
    if (!trimmed.startsWith('/')) return DEFAULT_AUTH_RETURN_TO
    if (trimmed.startsWith('//')) return DEFAULT_AUTH_RETURN_TO
    if (trimmed.includes('\\')) return DEFAULT_AUTH_RETURN_TO

    return trimmed
}

export function resolvePostLoginRedirect(returnTo?: string | null) {
    const safeReturnTo = sanitizeAuthReturnTo(returnTo)
    return safeReturnTo === '/cpns' ? '/cpns/dashboard' : safeReturnTo
}
