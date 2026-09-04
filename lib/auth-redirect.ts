const DEFAULT_AUTH_RETURN_TO = '/'
export const LOGOUT_SUCCESS_PARAM = 'logout'

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
    if (safeReturnTo === '/') return '/onboarding'
    return safeReturnTo === '/cpns' ? '/cpns/dashboard' : safeReturnTo
}

export function resolvePostLogoutRedirect(returnTo?: string | null) {
    const safeReturnTo = sanitizeAuthReturnTo(returnTo)
    const target = new URL(safeReturnTo, 'https://siaptempur.local')
    target.searchParams.set(LOGOUT_SUCCESS_PARAM, 'success')
    return `${target.pathname}${target.search}${target.hash}`
}
