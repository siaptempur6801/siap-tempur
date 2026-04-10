import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Route yang hanya bisa diakses kalau BELUM login
const AUTH_ROUTES = ['/login', '/register', '/forgot-password']
// Route yang WAJIB login
const PROTECTED_ROUTES = ['/cpns/dashboard']

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({ request })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
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
                supabaseResponse = NextResponse.next({ request })
                cookiesToSet.forEach(({ name, value, options }) =>
                    supabaseResponse.cookies.set(name, value, options)
                )
            },
        },
    })

    // PENTING: getUser() di sini wajib untuk refresh session
    // Tapi middleware berjalan di Edge Runtime — jauh lebih efisien daripada Server Component
    const { data: { user } } = await supabase.auth.getUser()

    const pathname = request.nextUrl.pathname

    // Kalau SUDAH login dan coba akses halaman auth → redirect ke dashboard asal atau default ke cpns
    if (user && AUTH_ROUTES.some(route => pathname.startsWith(route))) {
        const url = request.nextUrl.clone()
        // Default redirect after login if coming to an auth page while logged in
        url.pathname = '/cpns/dashboard'
        return NextResponse.redirect(url)
    }

    // Kalau BELUM login dan coba akses halaman protected → redirect ke login
    if (!user && PROTECTED_ROUTES.some(route => pathname.startsWith(route))) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        // Simpan tujuan asal untuk redirect setelah login
        url.searchParams.set('next', pathname)
        return NextResponse.redirect(url)
    }

    return supabaseResponse
}
