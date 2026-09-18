import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/utils/supabase/middleware'
import { CSRF_COOKIE } from '@/lib/csrf'
import { LEGACY_ADMIN_BASE_PATH, LEGACY_ADMIN_TAB_ROUTES } from '@/lib/admin-redirects'

function isLoopbackHostname(hostname: string) {
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
}

/**
 * Tab legacy `/cpns/admin?tab=...` → halaman kanonik.
 *
 * Redirect berbasis path untuk rute legacy ada di `lib/admin-redirects.ts` dan
 * dievaluasi oleh `next.config.ts`. Tab TIDAK bisa ditangani di sana karena
 * `redirects()` tidak dapat mencocokkan query parameter.
 *
 * Penting: fungsi ini dijalankan SETELAH `updateSession()` dan pemasangan header
 * CSP + cookie CSRF — bukan di awal seperti implementasi sebelumnya. Versi lama
 * `return` lebih awal sehingga request ke rute legacy tidak pernah melewati
 * refresh sesi dan tidak pernah menerima header keamanan.
 */
function legacyAdminTabRedirect(request: NextRequest, response: NextResponse) {
    const pathname = request.nextUrl.pathname
    if (pathname !== LEGACY_ADMIN_BASE_PATH) return null

    const tab = request.nextUrl.searchParams.get('tab')
    // Tanpa tab, `/cpns/admin` diarahkan ke root workspace admin.
    const destination = tab ? LEGACY_ADMIN_TAB_ROUTES[tab.toLowerCase()] : '/admin'
    if (!destination) return null

    const target = request.nextUrl.clone()
    target.pathname = destination
    target.searchParams.delete('tab')
    if (!target.searchParams.has('program')) target.searchParams.set('program', 'CPNS')
    if (!target.searchParams.has('track')) target.searchParams.set('track', 'SKD')

    const redirect = NextResponse.redirect(target)
    // Bawa cookie sesi yang baru di-refresh agar tidak hilang saat redirect.
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie))
    return redirect
}

export async function proxy(request: NextRequest) {
    const nonce = crypto.randomUUID().replace(/-/g, '')
    const csrfToken = crypto.randomUUID()

    // `upgrade-insecure-requests` hanya untuk host non-loopback: pada `next start` lokal
    // (NODE_ENV=production) flag ini membuat browser meng-upgrade request http ke https
    // sehingga memunculkan ERR_SSL_PROTOCOL_ERROR di dev/E2E.
    const upgradeInsecureRequests = process.env.NODE_ENV === 'production' && !isLoopbackHostname(request.nextUrl.hostname)
        ? 'upgrade-insecure-requests;'
        : ''

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
        ${upgradeInsecureRequests}
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

    return legacyAdminTabRedirect(request, response) ?? response
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|_next/hmr|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
