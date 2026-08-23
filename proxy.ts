import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/utils/supabase/middleware'
import { CSRF_COOKIE } from '@/lib/csrf'

const LEGACY_ADMIN_TAB_ROUTES: Record<string, string> = {
    products: '/admin/commerce/products',
    events: '/admin/assessment/events',
    exams: '/admin/assessment/exams',
    questions: '/admin/content/questions',
    commerce: '/admin/commerce',
}

function applyDefaultAdminContext(target: URL) {
    if (!target.searchParams.has('program')) target.searchParams.set('program', 'CPNS')
    if (!target.searchParams.has('track')) target.searchParams.set('track', 'SKD')
}

function legacyAdminRedirect(request: NextRequest) {
    const pathname = request.nextUrl.pathname
    if (!pathname.startsWith('/cpns/admin')) return null

    const target = request.nextUrl.clone()

    if (pathname === '/cpns/admin') {
        const tab = target.searchParams.get('tab') || ''
        target.pathname = LEGACY_ADMIN_TAB_ROUTES[tab] || '/admin'
        target.searchParams.delete('tab')
        applyDefaultAdminContext(target)
        return NextResponse.redirect(target)
    }

    if (pathname === '/cpns/admin/review') {
        target.pathname = '/admin/content/review'
        applyDefaultAdminContext(target)
        return NextResponse.redirect(target)
    }

    if (pathname === '/cpns/admin/articles' || pathname.startsWith('/cpns/admin/articles/')) {
        target.pathname = pathname.replace('/cpns/admin/articles', '/admin/content/articles')
        return NextResponse.redirect(target)
    }

    if (pathname === '/cpns/admin/event' || pathname === '/cpns/admin/tryout-akbar') {
        target.pathname = '/admin/assessment/events'
        applyDefaultAdminContext(target)
        return NextResponse.redirect(target)
    }

    if (pathname === '/cpns/admin/tryout-config') {
        target.pathname = '/admin/assessment/exams'
        applyDefaultAdminContext(target)
        return NextResponse.redirect(target)
    }

    if (pathname === '/cpns/admin/keuangan') {
        target.pathname = '/admin/commerce'
        applyDefaultAdminContext(target)
        return NextResponse.redirect(target)
    }

    if (pathname === '/cpns/admin/create') {
        target.pathname = '/admin/content/questions'
        applyDefaultAdminContext(target)
        return NextResponse.redirect(target)
    }

    const editMatch = pathname.match(/^\/cpns\/admin\/edit\/([^/]+)$/)
    if (editMatch) {
        target.pathname = '/admin/content/questions'
        target.searchParams.set('edit', editMatch[1])
        applyDefaultAdminContext(target)
        return NextResponse.redirect(target)
    }

    if (pathname === '/cpns/admin/voucher') {
        target.pathname = '/admin/commerce/products'
        target.searchParams.set('error', 'Voucher/promosi Schema V2 belum tersedia. Gunakan fitur ini setelah migrasi promosi selesai.')
        applyDefaultAdminContext(target)
        return NextResponse.redirect(target)
    }

    return null
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
        secure: process.env.NODE_ENV === 'production',
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
