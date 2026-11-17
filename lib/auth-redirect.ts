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

/**
 * Halaman yang bisa dibuka **tanpa login**. Dipakai untuk menentukan tujuan tautan "Kembali"
 * pada halaman login/register: kalau `returnTo` menunjuk halaman yang butuh login, mengarahkan
 * pengguna ke sana hanya akan memantulkan mereka kembali ke halaman login (terasa seperti tombol
 * "Kembali" tidak berfungsi).
 */
const PUBLIC_AUTH_PATHS = new Set(['/', '/cpns', '/tka', '/login', '/register', '/forgot-password'])

const PUBLIC_AUTH_PREFIXES = [
  '/blog',
  '/syarat-ketentuan',
  '/kebijakan-privasi',
  '/kebijakan-pengembalian',
  '/auth/reset-password',
  // Halaman publik fitur CPNS (etalase sebelum masuk).
  '/cpns/twk',
  '/cpns/tiu',
  '/cpns/tkp',
  '/cpns/mini-tryout',
  '/cpns/drilling-materi',
  '/cpns/full-tryout',
  '/cpns/event',
]

function pathWithoutQuery(path: string) {
  return path.split('?')[0].split('#')[0]
}

/** Apakah sebuah path bisa dibuka tanpa login. */
export function isPublicAuthPath(path: string) {
  const clean = pathWithoutQuery(path)
  if (PUBLIC_AUTH_PATHS.has(clean)) return true
  return PUBLIC_AUTH_PREFIXES.some((prefix) => clean === prefix || clean.startsWith(`${prefix}/`))
}

/**
 * Tujuan tautan "Kembali" pada halaman login/register.
 *
 * `returnTo` dipakai hanya bila halamannya publik (mis. `/tka`, `/blog/...`). Bila halaman itu
 * butuh login (`/cpns/dashboard`, `/tka/smp`, `/admin`, `/onboarding`), kembalikan beranda supaya
 * pengguna tidak terpantul balik ke halaman login.
 */
export function resolveAuthBackHref(returnTo?: string | null) {
  const safeReturnTo = sanitizeAuthReturnTo(returnTo)
  return isPublicAuthPath(safeReturnTo) ? safeReturnTo : DEFAULT_AUTH_RETURN_TO
}
