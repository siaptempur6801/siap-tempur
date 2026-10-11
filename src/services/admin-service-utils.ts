import { env } from '@/lib/env'
import {
  catalogContextService,
  CPNS_SKD_CONTEXT,
  type ProgramTrackContext,
} from '@/src/services/catalog-context.service'

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function nowIso() {
  return new Date().toISOString()
}

export function sameId(left: unknown, right: unknown) {
  return String(left ?? '') === String(right ?? '')
}

export function validPositive(value: number | null | undefined) {
  return value === null || value === undefined || (Number.isFinite(value) && value > 0)
}

export function validNonNegative(value: number | null | undefined) {
  return value === null || value === undefined || (Number.isFinite(value) && value >= 0)
}

export function getAdminCatalog(context?: ProgramTrackContext) {
  return catalogContextService.resolve(context ?? CPNS_SKD_CONTEXT)
}

export function normalizeEventFlyerUrl(value?: string | null) {
  if (!value) return null
  if (value.length > 1000) throw new Error('EVENT_FLYER_URL_INVALID')

  try {
    const url = new URL(value)
    const supabaseUrl = new URL(env.supabaseUrl())
    const bucketPrefix = '/storage/v1/object/public/event-flyers/'
    if (
      url.origin !== supabaseUrl.origin ||
      !url.pathname.startsWith(bucketPrefix) ||
      url.pathname === bucketPrefix
    ) {
      throw new Error('EVENT_FLYER_URL_INVALID')
    }
    url.hash = ''
    return url.toString()
  } catch {
    throw new Error('EVENT_FLYER_URL_INVALID')
  }
}
