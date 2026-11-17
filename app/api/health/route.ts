import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/api-utils'
import { env } from '@/lib/env'
import { getClientIp, resolveClientIp, type ClientIpSource } from '@/lib/request-ip'
import { isBearerTokenValid } from '@/lib/timing-safe'
import { createAdminClient } from '@/lib/utils/supabase/server'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

type HealthChecks = {
  env: boolean
  database: boolean
  leaderboard: boolean
  rateLimitStore: boolean
}

type RateLimitStoreStatus = 'redis' | 'memory' | 'unconfigured'

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
  Pragma: 'no-cache',
  Expires: '0',
}

/** Batas per IP untuk endpoint publik ini; monitor uptime normal jauh di bawahnya. */
const HEALTH_RATE_LIMIT = { limit: 30, windowMs: 60_000 }

/**
 * Detail diagnosis (commit SHA, sumber header IP, jenis store rate limit) hanya
 * untuk non-production — gate E2E Preview membaca `deploymentCommitSha` — atau
 * pemanggil yang mengirim `Authorization: Bearer <HEALTH_CHECK_TOKEN>`.
 * Di production publik hanya menerima status ringkas (audit N-06).
 */
function canSeeDetail(request: Request) {
  if (env.appEnvironment() !== 'production') return true
  return isBearerTokenValid(request.headers.get('authorization'), process.env.HEALTH_CHECK_TOKEN)
}

function healthResponse(
  statusCode: number,
  checks: HealthChecks,
  clientIpSource: ClientIpSource,
  rateLimitStore: RateLimitStoreStatus,
  detail: boolean,
) {
  const status = Object.values(checks).every(Boolean) ? 'ok' : 'degraded'
  const timestamp = new Date().toISOString()

  if (!detail) {
    return NextResponse.json(
      { status, timestamp },
      { status: statusCode, headers: NO_STORE_HEADERS },
    )
  }

  const deploymentCommitSha = process.env.VERCEL_GIT_COMMIT_SHA ?? null
  const deploymentEnvironment = process.env.VERCEL_ENV ?? null

  return NextResponse.json(
    {
      status,
      checks,
      rateLimitStore,
      // Nama header sumber untuk diagnosis. Ini tidak membuktikan ingress telah
      // membersihkan header; sanitasi tetap bergantung pada konfigurasi proxy.
      clientIpSource,
      timestamp,
      deploymentCommitSha,
      deploymentEnvironment,
    },
    {
      status: statusCode,
      headers: {
        ...NO_STORE_HEADERS,
        'X-Deployment-Commit-Sha': deploymentCommitSha ?? 'unknown',
      },
    },
  )
}

export async function GET(request: Request) {
  const detail = canSeeDetail(request)
  if (
    !detail &&
    (await checkRateLimit(
      `health_${getClientIp(request.headers)}`,
      HEALTH_RATE_LIMIT.limit,
      HEALTH_RATE_LIMIT.windowMs,
      { failClosed: false },
    ))
  ) {
    return NextResponse.json(
      { status: 'rate_limited' },
      { status: 429, headers: { ...NO_STORE_HEADERS, 'Retry-After': '60' } },
    )
  }

  const isProduction = env.appEnvironment() === 'production'
  const rateLimitConfigured = Boolean(env.upstashRedisRestUrl() && env.upstashRedisRestToken())
  const rateLimitStore: RateLimitStoreStatus = rateLimitConfigured
    ? 'redis'
    : isProduction
      ? 'unconfigured'
      : 'memory'
  const checks: HealthChecks = {
    env: false,
    database: false,
    leaderboard: false,
    // This is a configuration/readiness check. It does not ping Redis.
    rateLimitStore: !isProduction || rateLimitConfigured,
  }
  const clientIpSource = resolveClientIp(request.headers).source

  try {
    env.supabaseUrl()
    env.supabaseAnonKey()
    env.supabaseServiceRoleKey()
    env.midtransServerKey()
    env.midtransClientKey()
    checks.env = true

    const admin = await createAdminClient()
    // Probe keberadaan tabel saja: tanpa `count: 'exact'` agar tidak memindai tabel.
    const { error: databaseError } = await admin.from('profiles').select('id').limit(1)

    checks.database = !databaseError

    const { error: leaderboardError } = await admin
      .from('leaderboard_entries')
      .select('user_id')
      .limit(1)

    checks.leaderboard = !leaderboardError
  } catch (error) {
    logger.warn('Health check failed', {
      error: error instanceof Error ? error.message : 'Unknown health check error',
    })
  }

  return healthResponse(
    Object.values(checks).every(Boolean) ? 200 : 503,
    checks,
    clientIpSource,
    rateLimitStore,
    detail,
  )
}
