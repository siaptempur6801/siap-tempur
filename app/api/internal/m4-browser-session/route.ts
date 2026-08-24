import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/lib/env'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function allowed(request: NextRequest) {
    const token = process.env.M4_BROWSER_QA_TOKEN
    const host = request.headers.get('host') || ''
    return env.appEnvironment() === 'staging'
        && process.env.VERCEL_ENV === 'preview'
        && process.env.M4_BROWSER_QA_LOCAL === '1'
        && Boolean(token)
        && request.headers.get('x-m4-browser-qa-token') === token
        && (host === '127.0.0.1:3012' || host === 'localhost:3012')
}

export async function POST(request: NextRequest) {
    if (!allowed(request)) return NextResponse.json({ error: 'NOT_AVAILABLE' }, { status: 404 })

    const body = await request.json().catch(() => ({})) as { email?: string; password?: string }
    if (!body.email || !body.password) return NextResponse.json({ error: 'INVALID_CREDENTIAL_PAYLOAD' }, { status: 400 })

    let response = NextResponse.json({ ok: true })
    const supabase = createServerClient(env.supabaseUrl(), env.supabasePublishableKey(), {
        cookies: {
            getAll() {
                return request.cookies.getAll()
            },
            setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value, options }) => {
                    response.cookies.set(name, value, options)
                })
            },
        },
    })

    const { data, error } = await supabase.auth.signInWithPassword({
        email: body.email,
        password: body.password,
    })
    if (error || !data.user) {
        response = NextResponse.json({ error: 'AUTH_FAILED' }, { status: 401 })
        return response
    }

    return response
}
