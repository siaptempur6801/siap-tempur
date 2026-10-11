import { adminHref } from './admin-routes'
/** Restrict action/Back destinations to local admin pages. Never accept an external redirect. */
export function adminReturnUrl(value: unknown, fallback: string): string {
  if (
    typeof value !== 'string' ||
    !value.startsWith('/admin') ||
    value.startsWith('//') ||
    /[\\\r\n]/.test(value)
  )
    return adminHref(fallback)
  try {
    const url = new URL(value, 'http://admin.local')
    return url.origin === 'http://admin.local' &&
      (url.pathname === '/admin' || url.pathname.startsWith('/admin/'))
      ? adminHref(`${url.pathname}${url.search}`)
      : adminHref(fallback)
  } catch {
    return adminHref(fallback)
  }
}
