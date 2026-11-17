import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { env } from '@/lib/env'
import { resolvePostLoginRedirect } from '@/lib/auth-redirect'

// Route yang hanya bisa diakses kalau BELUM login
const AUTH_ROUTES = ['/login', '/register', '/forgot-password']
// Route yang WAJIB login
const PROTECTED_ROUTES = ['/onboarding', '/cpns/dashboard', '/cpns/admin']

function copyCustomHeaders(response: NextResponse, customHeaders?: Headers) {
    if (customHeaders) {
        customHeaders.forEach((value, key) => {
            response.headers.set(key, value)
        })
    }
    return response
}

/**
 * Nama cookie sesi Supabase adalah `sb-<project-ref>-auth-token`, dan JWKS yang
 * besar dapat dipecah menjadi `<nama>.0`, `<nama>.1`, dst. Karena itu pencocokan
 * dilakukan lewat prefix/suffix, bukan nama cookie yang di-hardcode — cara ini
 * tetap benar untuk staging, produksi, dan cookie yang dipecah.
 */
function hasSupabaseAuthCookie(request: NextRequest) {
    return request.cookies
        .getAll()
        .some(({ name }) => name.startsWith('sb-') && name.includes('-auth-token'))
}

function redirectToLogin(request: NextRequest, customHeaders?: Headers) {
    const url = request.nextUrl.clone()
    const returnTo = `${request.nextUrl.pathname}${request.nextUrl.search}`
    url.pathname = '/login'
    url.search = ''
    url.searchParams.set('returnTo', returnTo)
    return copyCustomHeaders(NextResponse.redirect(url), customHeaders)
}

export async function updateSession(request: NextRequest, customHeaders?: Headers) {
    let supabaseResponse = NextResponse.next({
        request: {
            headers: customHeaders || request.headers,
        },
    })

    const pathname = request.nextUrl.pathname

    /**
     * Tanpa cookie sesi tidak ada yang perlu di-refresh, dan `getUser()` pasti
     * mengembalikan `null`. Melewati pembuatan klien berarti request anonim —
     * mayoritas trafik: landing, blog, halaman legal, /cpns, /tka — tidak lagi
     * membayar biaya inisialisasi klien auth Supabase.
     *
     * Penegakan rute terlindungi TETAP dijalankan di sini, bukan dilewati:
     * tanpa cookie, pengguna memang belum login, jadi cabang yang benar adalah
     * redirect ke /login. Ini menjaga perilaku fail-closed tetap utuh.
     */
    if (!hasSupabaseAuthCookie(request)) {
        if (PROTECTED_ROUTES.some(route => pathname.startsWith(route))) {
            return redirectToLogin(request, customHeaders)
        }
        return supabaseResponse
    }

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

    // getUser() wajib di sini untuk refresh session cookie bila diperlukan.
    const { data: { user } } = await supabase.auth.getUser()

    if (user && AUTH_ROUTES.some(route => pathname.startsWith(route))) {
        const returnTo = request.nextUrl.searchParams.get('returnTo')
        const target = new URL(resolvePostLoginRedirect(returnTo), request.url)
        return copyCustomHeaders(NextResponse.redirect(target), customHeaders)
    }

    if (!user && PROTECTED_ROUTES.some(route => pathname.startsWith(route))) {
        return redirectToLogin(request, customHeaders)
    }

    return supabaseResponse
}
