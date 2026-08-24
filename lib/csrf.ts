/**
 * CSRF Protection for Server Actions using layered defense:
 *
 * Layer 1 — Double-submit cookie (header mode):
 *   Client reads the CSRF cookie (httpOnly: false) and sends it back in
 *   an X-CSRF-Token header. Server compares header to cookie value.
 *   Best for: API routes and forms with JS interceptor.
 *
 * Layer 2 — SameSite + Origin check (fallback mode):
 *   For imperative server-action calls where custom headers cannot be
 *   injected, the CSRF cookie (SameSite: Strict) itself blocks cross-origin
 *   cookie delivery. An additional Origin header check confirms same-origin.
 *   Best for: server actions called directly from client components.
 */

import { cookies, headers } from 'next/headers'

const CSRF_COOKIE = 'csrf-token'
const CSRF_HEADER = 'x-csrf-token'

type HeaderReader = {
  get(name: string): string | null
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
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

  // Do not invent www variants for provider preview domains.
  if (url.hostname.endsWith('.vercel.app')) return

  url.hostname = `www.${url.hostname}`
  origins.add(url.origin)
}

function isLoopbackHost(host: string) {
  try {
    const hostname = new URL(`http://${host}`).hostname
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1'
  } catch {
    return false
  }
}

function getRequestOrigin(headersList: HeaderReader): string | null {
  const forwardedHost = headersList.get('x-forwarded-host')?.split(',')[0]?.trim()
  const host = forwardedHost || headersList.get('host')?.split(',')[0]?.trim()
  if (!host) return null

  const forwardedProto = headersList.get('x-forwarded-proto')?.split(',')[0]?.trim()
  const protocol = forwardedProto || (isLoopbackHost(host) ? 'http' : process.env.NODE_ENV === 'production' ? 'https' : 'http')

  return normalizeOrigin(`${protocol}://${host}`)
}

function addVercelOrigin(origins: Set<string>, value: string | undefined) {
  if (!value) return
  addOriginWithWwwVariant(origins, normalizeOrigin(value.startsWith('http') ? value : `https://${value}`))
}

function getAllowedOrigins(headersList: HeaderReader): Set<string> {
  const origins = new Set<string>()

  // The strongest and most useful source for Preview deployments is the host
  // that actually served the request. Vercel branch aliases are stable but
  // VERCEL_URL can point at a deployment-specific hostname.
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

function logLoopbackQaFailure(reason: string, headersList: HeaderReader, hasCookie: boolean, hasHeader: boolean, allowedOrigins?: Set<string>) {
  if (process.env.M4_BROWSER_QA_LOCAL !== '1') return
  console.warn('M4_CSRF_QA_DIAGNOSTIC', {
    reason,
    host: headersList.get('host'),
    forwardedHost: headersList.get('x-forwarded-host'),
    forwardedProto: headersList.get('x-forwarded-proto'),
    origin: headersList.get('origin'),
    requestOrigin: getRequestOrigin(headersList),
    hasCookie,
    hasHeader,
    allowedOrigins: allowedOrigins ? [...allowedOrigins] : undefined,
  })
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
    logLoopbackQaFailure('missing_cookie', headersList, false, Boolean(headerToken))
    throw new CsrfError('Missing CSRF token')
  }

  if (headerToken) {
    if (!constantTimeEqual(cookieToken, headerToken)) {
      logLoopbackQaFailure('header_cookie_mismatch', headersList, true, true)
      throw new CsrfError('Invalid CSRF token')
    }
    return
  }

  const origin = normalizeOrigin(headersList.get('origin'))
  const allowedOrigins = getAllowedOrigins(headersList)

  if (!origin || !allowedOrigins.has(origin)) {
    logLoopbackQaFailure('invalid_origin', headersList, true, false, allowedOrigins)
    throw new CsrfError('Invalid origin')
  }
}

export class CsrfError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CsrfError'
  }
}

export { CSRF_COOKIE, CSRF_HEADER }
