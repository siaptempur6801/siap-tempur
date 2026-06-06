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

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

function normalizeOrigin(value: string | undefined): string | null {
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

  url.hostname = `www.${url.hostname}`
  origins.add(url.origin)
}

function getAllowedOrigins(): Set<string> {
  const origins = new Set<string>()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  addOriginWithWwwVariant(origins, normalizeOrigin(siteUrl))

  const vercelUrl = process.env.VERCEL_URL
  addOriginWithWwwVariant(origins, normalizeOrigin(vercelUrl ? `https://${vercelUrl}` : undefined))

  if (process.env.NODE_ENV === 'production') {
    addOriginWithWwwVariant(origins, 'https://siaptempur.id')
  } else {
    origins.add('http://localhost:3000')
  }

  return origins
}

/**
 * Validates CSRF token for server actions.
 *
 * Two modes:
 * 1. If X-CSRF-Token header is present → validate against cookie (double-submit).
 * 2. If header is absent but cookie exists → verify same-origin via Origin header,
 *    relying on SameSite: Strict to block cross-origin cookie delivery.
 *
 * Throws if CSRF validation fails — catch in the action to return user-friendly error.
 */
export async function validateCsrf(): Promise<void> {
  const cookieStore = await cookies()
  const headersList = await headers()

  const cookieToken = cookieStore.get(CSRF_COOKIE)?.value
  const headerToken = headersList.get(CSRF_HEADER)

  // No cookie at all — request is suspicious
  if (!cookieToken) {
    throw new CsrfError('Missing CSRF token')
  }

  // Layer 1: Double-submit cookie via custom header
  if (headerToken) {
    if (!constantTimeEqual(cookieToken, headerToken)) {
      throw new CsrfError('Invalid CSRF token')
    }
    return
  }

  // Layer 2: SameSite Strict + Origin check for imperative server action calls.
  // The CSRF cookie is SameSite: Strict, so it won't be sent cross-origin.
  // We additionally verify the Origin header matches our site to block
  // same-site request forgery from sibling origins.
  const origin = headersList.get('origin')
  const allowedOrigins = getAllowedOrigins()

  if (!origin || !allowedOrigins.has(origin)) {
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
