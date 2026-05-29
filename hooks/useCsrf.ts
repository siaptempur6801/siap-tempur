'use client'

/**
 * Reads the CSRF token cookie and returns it.
 * Use this value as X-CSRF-Token header when calling server actions directly.
 */
export function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null

  const match = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]*)/)
  return match ? match[1] : null
}

/**
 * Returns headers object with CSRF token for use with fetch() or server action calls.
 */
export function csrfHeaders(): Record<string, string> {
  const token = getCsrfToken()
  return token ? { 'x-csrf-token': token } : {}
}
