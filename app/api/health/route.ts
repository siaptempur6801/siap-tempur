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
}

function healthResponse(statusCode: number, checks: HealthChecks, clientIpSource: ClientIpSource) {
    const isOk = Object.values(checks).every(Boolean)
    const deploymentCommitSha = process.env.VERCEL_GIT_COMMIT_SHA ?? null
    const deploymentEnvironment = process.env.VERCEL_ENV ?? null

    // Informatif (tidak memengaruhi status): tanpa Upstash, rate limiter jatuh ke
    // penyimpanan in-memory yang per-instance sehingga mudah ditembus di serverless.
    const rateLimitStore = env.upstashRedisRestUrl() && env.upstashRedisRestToken() ? 'redis' : 'memory'

    return NextResponse.json(
        {
            status: isOk ? 'ok' : 'degraded',
            checks,
            rateLimitStore,
            // Nama header yang dipakai sebagai IP client — berguna untuk membuktikan
            // urutan header aman (header kiriman client tidak boleh menang).
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
        }
    )
}

export async function GET(request: Request) {
    const checks: HealthChecks = {
        env: false,
        database: false,
        leaderboard: false,
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

    return healthResponse(Object.values(checks).every(Boolean) ? 200 : 503, checks, clientIpSource)
}
