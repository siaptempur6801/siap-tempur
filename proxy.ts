import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/utils/supabase/middleware'
import { CSRF_COOKIE } from '@/lib/csrf'

export async function proxy(request: NextRequest) {
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

    // Pass the modified headers to the downstream components
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-nonce', nonce)
    requestHeaders.set('Content-Security-Policy', cspHeader)

    // Call updateSession but we need to ensure the request headers are passed.
    // updateSession uses NextResponse.next({ request }). We can override the request headers 
    // by creating a new request object or passing the headers to updateSession.
    const response = await updateSession(request, requestHeaders)

    // Set the CSP header on the outgoing response
    response.headers.set('Content-Security-Policy', cspHeader)

    // Set CSRF token cookie (double-submit pattern)
    // httpOnly: false so client JS can read it for the custom header
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
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
