import { NextResponse } from 'next/server'
import { env } from '@/lib/env'
import { createAdminClient } from '@/lib/utils/supabase/server'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

type HealthChecks = {
    env: boolean
    database: boolean
    leaderboard: boolean
}

function healthResponse(statusCode: number, checks: HealthChecks) {
    const isOk = Object.values(checks).every(Boolean)

    return NextResponse.json(
        {
            status: isOk ? 'ok' : 'degraded',
            checks,
            timestamp: new Date().toISOString(),
            deploymentCommitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
            deploymentEnvironment: process.env.VERCEL_ENV ?? null,
        },
        {
            status: statusCode,
            headers: {
                'Cache-Control': 'no-store',
                'Vercel-CDN-Cache-Control': 'no-store',
            },
        }
    )
}

export async function GET() {
    const checks: HealthChecks = {
        env: false,
        database: false,
        leaderboard: false,
    }

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

    return healthResponse(Object.values(checks).every(Boolean) ? 200 : 503, checks)
}
