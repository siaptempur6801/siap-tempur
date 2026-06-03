import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { env } from '@/lib/env'

// Route yang hanya bisa diakses kalau BELUM login
const AUTH_ROUTES = ['/login', '/register', '/forgot-password']
// Route yang WAJIB login
const PROTECTED_ROUTES = ['/cpns/dashboard', '/cpns/admin']

export async function updateSession(request: NextRequest, customHeaders?: Headers) {
    let supabaseResponse = NextResponse.next({
        request: {
            headers: customHeaders || request.headers,
        },
    })

    let supabaseUrl: string
    let supabaseAnonKey: string

    try {
        supabaseUrl = env.supabaseUrl()
        supabaseAnonKey = env.supabaseAnonKey()
    } catch {
        return new NextResponse(
            JSON.stringify({ error: 'Missing Supabase environment variables' }),
            { status: 500, headers: { 'content-type': 'application/json' } }
        )
    }

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
            getAll() {
                return request.cookies.getAll()
            },
            setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value }) =>
                    request.cookies.set(name, value)
                )
                supabaseResponse = NextResponse.next({
                    request: {
                        headers: customHeaders || request.headers,
                    },
                })
                cookiesToSet.forEach(({ name, value, options }) =>
                    supabaseResponse.cookies.set(name, value, options)
                )
            },
        },
    })

    // PENTING: getUser() di sini wajib untuk refresh session
    const { data: { user } } = await supabase.auth.getUser()

    const pathname = request.nextUrl.pathname

    if (user && AUTH_ROUTES.some(route => pathname.startsWith(route))) {
        const url = request.nextUrl.clone()
        url.pathname = '/cpns/dashboard'
        const response = NextResponse.redirect(url)
        // Ensure headers are preserved on redirect
        if (customHeaders) {
            customHeaders.forEach((value, key) => {
                response.headers.set(key, value)
            })
        }
        return response
    }

    if (!user && PROTECTED_ROUTES.some(route => pathname.startsWith(route))) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('next', pathname)
        const response = NextResponse.redirect(url)
        // Ensure headers are preserved on redirect
        if (customHeaders) {
            customHeaders.forEach((value, key) => {
                response.headers.set(key, value)
            })
        }
        return response
    }

    return supabaseResponse
}
