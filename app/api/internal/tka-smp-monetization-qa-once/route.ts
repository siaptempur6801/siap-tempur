import { createHash, timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/lib/env'
import { createAdminClient } from '@/lib/utils/supabase/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const EXPECTED_TOKEN_HASH = '959d2f809e9628cea362420bdc7b9842aa455c42a15d3e78aac717095a83497e'
const STAGING_PROJECT_REF = 'lpgrivowdcepcxradavu'

function tokenMatches(value: string) {
    const actual = Buffer.from(createHash('sha256').update(value).digest('hex'))
    const expected = Buffer.from(EXPECTED_TOKEN_HASH)
    return actual.length === expected.length && timingSafeEqual(actual, expected)
}

function unavailable() {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
}

function safePaths(html: string) {
    const paths = new Set<string>()
    const patterns = [
        /(?:action|src|href)=["']([^"']+)["']/gi,
        /(?:fetch|axios\.(?:get|post)|url)\s*\(?(?:\s*)["'`]([^"'`]+)["'`]/gi,
    ]

    for (const pattern of patterns) {
        let match: RegExpExecArray | null
        while ((match = pattern.exec(html))) {
            const candidate = match[1]
            if (!candidate || candidate.startsWith('data:')) continue
            try {
                const parsed = new URL(candidate, 'https://simulator.sandbox.midtrans.com')
                if (parsed.hostname === 'simulator.sandbox.midtrans.com') {
                    paths.add(`${parsed.pathname}${parsed.search}`)
                }
            } catch {
                // Ignore malformed references from third-party HTML.
            }
        }
    }

    return [...paths].slice(0, 80)
}

export async function GET(request: NextRequest) {
    if (env.appEnvironment() !== 'staging' || env.supabaseProjectRef() !== STAGING_PROJECT_REF) {
        return unavailable()
    }

    const token = request.nextUrl.searchParams.get('token') || ''
    if (!tokenMatches(token)) return unavailable()

    const mode = request.nextUrl.searchParams.get('mode') || 'probe'

    if (mode === 'probe') {
        let serviceRoleConfigured = false
        let midtransServerConfigured = false
        let midtransClientConfigured = false

        try {
            midtransServerConfigured = env.midtransServerKey().length > 8
        } catch {
            midtransServerConfigured = false
        }

        try {
            midtransClientConfigured = env.midtransClientKey().length > 8
        } catch {
            midtransClientConfigured = false
        }

        try {
            const admin = await createAdminClient()
            const { error } = await admin.from('programs').select('id').limit(1)
            serviceRoleConfigured = !error
        } catch {
            serviceRoleConfigured = false
        }

        return NextResponse.json({
            appEnvironment: env.appEnvironment(),
            supabaseProjectRef: env.supabaseProjectRef(),
            serviceRoleConfigured,
            midtransServerConfigured,
            midtransClientConfigured,
        })
    }

    if (mode === 'inspect-simulator') {
        const response = await fetch('https://simulator.sandbox.midtrans.com/v2/qris/index', {
            cache: 'no-store',
            redirect: 'follow',
        })
        const html = await response.text()

        return NextResponse.json({
            ok: response.ok,
            status: response.status,
            contentType: response.headers.get('content-type'),
            paths: safePaths(html),
        })
    }

    return NextResponse.json({ error: 'UNSUPPORTED_MODE' }, { status: 400 })
}
