/**
 * CSRF Protection for Server Actions using layered defense:
 *
 * Layer 1 — Double-submit cookie (header mode):
 *   Client reads the CSRF cookie (httpOnly: false) and sends it back in
 *   an X-CSRF-Token header. Server compares header to cookie value.
 *
 * Layer 2 — SameSite + Origin check (fallback mode):
 *   For imperative server-action calls where custom headers cannot be
 *   injected, the CSRF cookie (SameSite: Strict) blocks cross-site cookie
 *   delivery and the Origin header must match an allowed first-party origin.
 */

import { cookies, headers } from 'next/headers'
import { constantTimeEqual } from '@/lib/timing-safe'

const CSRF_COOKIE = 'csrf-token'
const CSRF_HEADER = 'x-csrf-token'

type HeaderReader = {
  get(name: string): string | null
}

function normalizeOrigin(value: string | undefined | null): string | null {
  if (!value) return null

  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

function addOriginWithWwwVariant(origins: Set<string>, origin: string | null) {
  if (!origin) return

  origins.add(origin)

  const url = new URL(origin)
  if (url.hostname.startsWith('www.')) {
    url.hostname = url.hostname.replace(/^www\./, '')
    origins.add(url.origin)
    return
  }

  if (url.hostname.endsWith('.vercel.app')) return

  url.hostname = `www.${url.hostname}`
  origins.add(url.origin)
}

function isLoopbackHost(host: string) {
  try {
    const hostname = new URL(`http://${host}`).hostname
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '[::1]' ||
      hostname === '::1'
    )
  } catch {
    return false
  }
}

function getRequestHost(headersList: HeaderReader) {
  return (
    headersList.get('x-forwarded-host')?.split(',')[0]?.trim() ||
    headersList.get('host')?.split(',')[0]?.trim() ||
    null
  )
}

function getRequestOrigin(headersList: HeaderReader): string | null {
  const host = getRequestHost(headersList)
  if (!host) return null

  const forwardedProto = headersList.get('x-forwarded-proto')?.split(',')[0]?.trim()
  const protocol =
    forwardedProto ||
    (isLoopbackHost(host) ? 'http' : process.env.NODE_ENV === 'production' ? 'https' : 'http')

  return normalizeOrigin(`${protocol}://${host}`)
}

function addVercelOrigin(origins: Set<string>, value: string | undefined) {
  if (!value) return
  addOriginWithWwwVariant(
    origins,
    normalizeOrigin(value.startsWith('http') ? value : `https://${value}`),
  )
}

function getAllowedOrigins(headersList: HeaderReader): Set<string> {
  const origins = new Set<string>()

  addOriginWithWwwVariant(origins, getRequestOrigin(headersList))
  addOriginWithWwwVariant(origins, normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL))
  addVercelOrigin(origins, process.env.VERCEL_URL)
  addVercelOrigin(origins, process.env.VERCEL_BRANCH_URL)
  addVercelOrigin(origins, process.env.VERCEL_PROJECT_PRODUCTION_URL)

  if (process.env.NODE_ENV === 'production') {
    addOriginWithWwwVariant(origins, 'https://siaptempur.id')
  } else {
    origins.add('http://localhost:3000')
  }

  return origins
}

/**
 * Validates CSRF token for Server Actions.
 */
export async function validateCsrf(): Promise<void> {
  const cookieStore = await cookies()
  const headersList = await headers()

  const cookieToken = cookieStore.get(CSRF_COOKIE)?.value
  const headerToken = headersList.get(CSRF_HEADER)

  if (!cookieToken) {
    throw new CsrfError('Missing CSRF token')
  }

  if (headerToken) {
    if (!constantTimeEqual(cookieToken, headerToken)) {
      throw new CsrfError('Invalid CSRF token')
    }
    return
  }

  const origin = normalizeOrigin(headersList.get('origin'))
  const allowedOrigins = getAllowedOrigins(headersList)

  if (origin && allowedOrigins.has(origin)) return

  // Some local Chromium/Next Server Action requests omit Origin entirely.
  // Allow that only on loopback where the SameSite=Strict CSRF cookie proves
  // the request came from the local first-party browser context. Public
  // Preview and production hosts still require a valid Origin or header token.
  const requestHost = getRequestHost(headersList)
  if (!origin && requestHost && isLoopbackHost(requestHost)) return

  throw new CsrfError('Invalid origin')
}

class CsrfError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CsrfError'
  }
}

export { CSRF_COOKIE }
