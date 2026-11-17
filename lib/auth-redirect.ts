const DEFAULT_AUTH_RETURN_TO = '/'
export const LOGOUT_SUCCESS_PARAM = 'logout'

const AUTH_RETURN_TO_PROBE_ORIGIN = 'https://siaptempur.local'

// Karakter kontrol ASCII (termasuk tab/CR/LF) dibuang oleh parser URL WHATWG,
// sehingga `/\t/evil.com` berubah menjadi `//evil.com` → redirect ke host lain.
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/

/**
 * Hanya terima path internal. `unknown` karena nilai ini datang dari query string
 * (bisa berupa array bila parameter diulang) atau dari payload klien.
 */
export function sanitizeAuthReturnTo(returnTo?: unknown) {
  if (typeof returnTo !== 'string') return DEFAULT_AUTH_RETURN_TO

  const trimmed = returnTo.trim()
  if (!trimmed) return DEFAULT_AUTH_RETURN_TO
  if (!trimmed.startsWith('/')) return DEFAULT_AUTH_RETURN_TO
  if (trimmed.startsWith('//')) return DEFAULT_AUTH_RETURN_TO
  if (trimmed.includes('\\')) return DEFAULT_AUTH_RETURN_TO
  if (CONTROL_CHARACTERS.test(trimmed)) return DEFAULT_AUTH_RETURN_TO

  // Lapisan terakhir: pastikan hasil resolusi tetap berada di origin sendiri.
  try {
    const resolved = new URL(trimmed, AUTH_RETURN_TO_PROBE_ORIGIN)
    if (resolved.origin !== AUTH_RETURN_TO_PROBE_ORIGIN) return DEFAULT_AUTH_RETURN_TO
  } catch {
    return DEFAULT_AUTH_RETURN_TO
  }

  return trimmed
}

export function resolvePostLoginRedirect(returnTo?: unknown) {
  const safeReturnTo = sanitizeAuthReturnTo(returnTo)
  if (safeReturnTo === '/') return '/onboarding'
  return safeReturnTo === '/cpns' ? '/cpns/dashboard' : safeReturnTo
}

export function resolvePostLogoutRedirect(returnTo?: unknown) {
  const safeReturnTo = sanitizeAuthReturnTo(returnTo)
  const target = new URL(safeReturnTo, AUTH_RETURN_TO_PROBE_ORIGIN)
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
export function resolveAuthBackHref(returnTo?: unknown) {
  const safeReturnTo = sanitizeAuthReturnTo(returnTo)
  return isPublicAuthPath(safeReturnTo) ? safeReturnTo : DEFAULT_AUTH_RETURN_TO
}
