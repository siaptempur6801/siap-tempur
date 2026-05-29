import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/lib/env'

function sanitizeNext(rawNext: string | null) {
    if (!rawNext || !rawNext.startsWith('/')) {
        return '/cpns/dashboard'
    }

    return rawNext
}

function toErrorRedirect(origin: string, message: string) {
    return NextResponse.redirect(`${origin}/auth/auth-code-error?message=${encodeURIComponent(message)}`)
}

function createRouteClient(request: NextRequest) {
    const cookiesToApply: Array<{ name: string; value: string; options?: Record<string, unknown> }> = []

    const supabase = createServerClient(
        env.supabaseUrl(),
        env.supabaseAnonKey(),
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(nextCookies) {
                    cookiesToApply.splice(0, cookiesToApply.length, ...nextCookies)
                    nextCookies.forEach(({ name, value }) => request.cookies.set(name, value))
                },
            },
        }
    )

    function applyCookies(response: NextResponse) {
        cookiesToApply.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        return response
    }

    return { supabase, applyCookies }
}

function renderCallbackShell(request: NextRequest) {
    const next = sanitizeNext(request.nextUrl.searchParams.get('next'))
    const origin = request.nextUrl.origin
    const nonce = request.headers.get('x-nonce') ?? undefined
    const html = `<!doctype html>
<html lang="id">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Memproses Autentikasi</title>
    <style>
      body {
        margin: 0;
        font-family: system-ui, sans-serif;
        background: #fdfbf7;
        color: #1f2937;
        display: grid;
        place-items: center;
        min-height: 100vh;
      }
      .card {
        width: min(28rem, calc(100vw - 2rem));
        background: white;
        border: 2px solid #111827;
        border-radius: 1rem;
        box-shadow: 8px 8px 0 rgba(0, 0, 0, 1);
        padding: 2rem;
        text-align: center;
      }
      .spinner {
        width: 2rem;
        height: 2rem;
        border: 3px solid #bfdbfe;
        border-top-color: #2563eb;
        border-radius: 999px;
        margin: 0 auto 1rem;
        animation: spin 1s linear infinite;
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      h1 {
        margin: 0;
        font-size: 1.75rem;
      }
      p {
        line-height: 1.6;
      }
    </style>
  </head>
  <body>
    <main class="card">
      <div class="spinner"></div>
      <h1>Memproses Autentikasi</h1>
      <p id="message">Menyiapkan sesi akun Anda...</p>
    </main>
    <script${nonce ? ` nonce="${nonce}"` : ''}>
      const messageEl = document.getElementById('message');
      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      const searchParams = new URLSearchParams(window.location.search);

      const redirectToError = (message) => {
        const target = new URL('/auth/auth-code-error', ${JSON.stringify(origin)});
        target.searchParams.set('message', message);
        window.location.replace(target.toString());
      };

      const error = hashParams.get('error') || searchParams.get('error');
      const errorDescription = hashParams.get('error_description') || searchParams.get('error_description');

      if (error) {
        redirectToError(errorDescription || error);
      } else {
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (!accessToken || !refreshToken) {
          redirectToError('missing_auth_data');
        } else {
          fetch(window.location.pathname + window.location.search, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              access_token: accessToken,
              refresh_token: refreshToken,
              next: ${JSON.stringify(next)}
            }),
          })
            .then(async (response) => {
              const payload = await response.json().catch(() => null);
              if (!response.ok || !payload?.redirectTo) {
                throw new Error(payload?.message || 'auth_finalize_failed');
              }
              window.location.replace(payload.redirectTo);
            })
            .catch((error) => {
              redirectToError(error.message || 'auth_finalize_failed');
            });
        }
      }
    </script>
  </body>
</html>`

    return new NextResponse(html, {
        status: 200,
        headers: {
            'content-type': 'text/html; charset=utf-8',
            'cache-control': 'no-store',
        },
    })
}

export async function GET(request: NextRequest) {
    const { searchParams, origin } = request.nextUrl
    const code = searchParams.get('code')
    const next = sanitizeNext(searchParams.get('next'))

    if (!code) {
        return renderCallbackShell(request)
    }

    const { supabase, applyCookies } = createRouteClient(request)
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
        return applyCookies(toErrorRedirect(origin, error.message))
    }

    return applyCookies(NextResponse.redirect(new URL(next, origin)))
}

export async function POST(request: NextRequest) {
    const { origin } = request.nextUrl
    let body: unknown

    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ message: 'invalid_json' }, { status: 400 })
    }

    const payload = body && typeof body === 'object' ? body as Record<string, unknown> : {}
    const accessToken = typeof payload.access_token === 'string' ? payload.access_token : ''
    const refreshToken = typeof payload.refresh_token === 'string' ? payload.refresh_token : ''
    const next = typeof payload.next === 'string' ? payload.next : null

    if (!accessToken || !refreshToken) {
        return NextResponse.json({ message: 'missing_auth_data' }, { status: 400 })
    }

    const { supabase, applyCookies } = createRouteClient(request)
    const redirectTo = sanitizeNext(next)
    const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
    })

    if (error) {
        return applyCookies(NextResponse.json({ message: error.message }, { status: 400 }))
    }

    return applyCookies(
        NextResponse.json(
            { redirectTo: new URL(redirectTo, origin).toString() },
            {
                status: 200,
                headers: {
                    'cache-control': 'no-store',
                },
            }
        )
    )
}
