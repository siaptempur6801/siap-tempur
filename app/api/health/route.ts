import { NextResponse } from 'next/server'
import { env } from '@/lib/env'
import { resolveClientIp, type ClientIpSource } from '@/lib/request-ip'
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

function healthResponse(
  statusCode: number,
  checks: HealthChecks,
  clientIpSource: ClientIpSource,
  rateLimitStore: RateLimitStoreStatus,
) {
  const isOk = Object.values(checks).every(Boolean)
  const deploymentCommitSha = process.env.VERCEL_GIT_COMMIT_SHA ?? null
  const deploymentEnvironment = process.env.VERCEL_ENV ?? null

  return NextResponse.json(
    {
      status: isOk ? 'ok' : 'degraded',
      checks,
      rateLimitStore,
      // Nama header sumber untuk diagnosis. Ini tidak membuktikan ingress telah
      // membersihkan header; sanitasi tetap bergantung pada konfigurasi proxy.
      clientIpSource,
      timestamp: new Date().toISOString(),
      deploymentCommitSha,
      deploymentEnvironment,
    },
    {
      status: statusCode,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'CDN-Cache-Control': 'no-store',
        'Vercel-CDN-Cache-Control': 'no-store',
        'X-Deployment-Commit-Sha': deploymentCommitSha ?? 'unknown',
        Pragma: 'no-cache',
        Expires: '0',
      },
    },
  )
}

export async function GET(request: Request) {
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
    const { error: databaseError } = await admin
      .from('profiles')
      .select('id', { head: true, count: 'exact' })
      .limit(1)

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
  )
}
