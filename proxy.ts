import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/utils/supabase/middleware'
import { CSRF_COOKIE } from '@/lib/csrf'

function legacyAdminRedirect(request: NextRequest) {
    const pathname = request.nextUrl.pathname
    if (!pathname.startsWith('/cpns/admin')) return null

    const target = request.nextUrl.clone()
    if (pathname === '/cpns/admin') {
        target.pathname = '/admin'
        if (!target.searchParams.has('program')) target.searchParams.set('program', 'CPNS')
        if (!target.searchParams.has('track')) target.searchParams.set('track', 'SKD')
        return NextResponse.redirect(target)
    }

    if (pathname === '/cpns/admin/review') {
        target.pathname = '/admin/content/review'
        if (!target.searchParams.has('program')) target.searchParams.set('program', 'CPNS')
        if (!target.searchParams.has('track')) target.searchParams.set('track', 'SKD')
        return NextResponse.redirect(target)
    }

    if (pathname === '/cpns/admin/articles' || pathname.startsWith('/cpns/admin/articles/')) {
        target.pathname = pathname.replace('/cpns/admin/articles', '/admin/content/articles')
        return NextResponse.redirect(target)
    }

    return null
}

function isLoopbackHostname(hostname: string) {
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
}

export async function proxy(request: NextRequest) {
    const legacyRedirect = legacyAdminRedirect(request)
    if (legacyRedirect) return legacyRedirect

    const nonce = crypto.randomUUID().replace(/-/g, '')
    const csrfToken = crypto.randomUUID()

    const cspHeader = `
        default-src 'self';
        script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${process.env.NODE_ENV === 'production' ? '' : "'unsafe-eval'"} https://app.midtrans.com https://app.sandbox.midtrans.com;
        style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
        font-src 'self' https://fonts.gstatic.com;
        img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in;
        connect-src 'self' https://*.supabase.co https://*.supabase.in https://app.midtrans.com https://api.midtrans.com https://app.sandbox.midtrans.com https://api.sandbox.midtrans.com;
        frame-src 'self' https://app.midtrans.com https://app.sandbox.midtrans.com;
        object-src 'none';
        base-uri 'self';
        form-action 'self';
        frame-ancestors 'none';
        upgrade-insecure-requests;
        ${process.env.CSP_REPORT_URI ? `report-uri ${process.env.CSP_REPORT_URI};` : ''}
    `.replace(/\s{2,}/g, ' ').trim()

    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-nonce', nonce)
    requestHeaders.set('x-pathname', request.nextUrl.pathname)
    requestHeaders.set('Content-Security-Policy', cspHeader)

    const response = await updateSession(request, requestHeaders)
    response.headers.set('Content-Security-Policy', cspHeader)

    response.cookies.set(CSRF_COOKIE, csrfToken, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production' && !isLoopbackHostname(request.nextUrl.hostname),
        sameSite: 'strict',
        path: '/',
    })

    return response
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
