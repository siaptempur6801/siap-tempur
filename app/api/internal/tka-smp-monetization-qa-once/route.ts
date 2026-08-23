import { createHash, timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/lib/env'
import { createAdminClient } from '@/lib/utils/supabase/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const EXPECTED_TOKEN_HASH = '959d2f809e9628cea362420bdc7b9842aa455c42a15d3e78aac717095a83497e'
const STAGING_PROJECT_REF = 'lpgrivowdcepcxradavu'
const SIMULATOR_ORIGIN = 'https://simulator.sandbox.midtrans.com'

function tokenMatches(value: string) {
    const actual = Buffer.from(createHash('sha256').update(value).digest('hex'))
    const expected = Buffer.from(EXPECTED_TOKEN_HASH)
    return actual.length === expected.length && timingSafeEqual(actual, expected)
}

function unavailable() {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
}

function safePaths(source: string) {
    const paths = new Set<string>()
    const patterns = [
        /(?:action|src|href)=["']([^"']+)["']/gi,
        /(?:fetch|axios\.(?:get|post)|url)\s*\(?(?:\s*)["'`]([^"'`]+)["'`]/gi,
        /["'`]((?:\/|https:\/\/simulator\.sandbox\.midtrans\.com\/)[A-Za-z0-9_?&=./:%-]{2,})["'`]/g,
    ]

    for (const pattern of patterns) {
        let match: RegExpExecArray | null
        while ((match = pattern.exec(source))) {
            const candidate = match[1]
            if (!candidate || candidate.startsWith('data:') || candidate.startsWith('//')) continue
            try {
                const parsed = new URL(candidate, SIMULATOR_ORIGIN)
                if (parsed.hostname === 'simulator.sandbox.midtrans.com') {
                    paths.add(`${parsed.pathname}${parsed.search}`)
                }
            } catch {
                // Ignore malformed references from third-party HTML/JS.
            }
        }
    }

    return [...paths].slice(0, 120)
}

function scriptUrls(html: string) {
    const urls = new Set<string>()
    const pattern = /<script[^>]+src=["']([^"']+)["'][^>]*>/gi
    let match: RegExpExecArray | null
    while ((match = pattern.exec(html))) {
        try {
            const url = new URL(match[1], SIMULATOR_ORIGIN)
            if (url.hostname === 'simulator.sandbox.midtrans.com') urls.add(url.toString())
        } catch {
            // Ignore malformed script refs.
        }
    }
    return [...urls].slice(0, 20)
}

function interestingSnippets(source: string) {
    const snippets = new Set<string>()
    const needles = ['qris', 'scan', 'payment', 'transaction', 'fetch(', 'axios', 'qr-code']
    const lower = source.toLowerCase()
    for (const needle of needles) {
        let from = 0
        while (snippets.size < 30) {
            const index = lower.indexOf(needle, from)
            if (index < 0) break
            const start = Math.max(0, index - 100)
            const end = Math.min(source.length, index + 220)
            snippets.add(source.slice(start, end).replace(/\s+/g, ' '))
            from = index + needle.length
        }
    }
    return [...snippets]
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
        const response = await fetch(`${SIMULATOR_ORIGIN}/v2/qris/index`, {
            cache: 'no-store',
            redirect: 'follow',
        })
        const html = await response.text()
        const scripts = scriptUrls(html)
        const scriptReports: Array<{ url: string; status: number; paths: string[]; snippets: string[] }> = []

        for (const url of scripts) {
            const scriptResponse = await fetch(url, { cache: 'no-store', redirect: 'follow' })
            const source = await scriptResponse.text()
            scriptReports.push({
                url: new URL(url).pathname,
                status: scriptResponse.status,
                paths: safePaths(source),
                snippets: interestingSnippets(source),
            })
        }

        return NextResponse.json({
            ok: response.ok,
            status: response.status,
            contentType: response.headers.get('content-type'),
            htmlPaths: safePaths(html),
            scripts: scriptReports,
        })
    }

    return NextResponse.json({ error: 'UNSUPPORTED_MODE' }, { status: 400 })
}
