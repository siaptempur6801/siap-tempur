import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'

/**
 * Regresi untuk `updateSession` — gerbang routing middleware.
 *
 * Perubahan yang dikunci di sini: ketika request TIDAK membawa cookie sesi
 * Supabase, `updateSession` tidak lagi membuat klien auth sama sekali.
 *
 * Alasannya: `supabase.auth.getUser()` selalu menembak `/auth/v1/user` bila ada
 * sesi, dan tanpa sesi pun ia tetap membayar inisialisasi klien. Mayoritas trafik
 * SiapTempur adalah anonim (landing, blog, halaman legal, /cpns, /tka), jadi
 * melewatinya menghapus kerja yang tidak pernah menghasilkan apa pun.
 *
 * Yang WAJIB tetap benar — dan karena itu diuji di sini:
 *   - rute terlindungi tanpa sesi → tetap redirect ke /login (fail-closed)
 *   - rute auth (login/register/forgot) dengan sesi → tetap redirect ke dashboard
 *   - rute biasa dengan sesi → tetap lolos
 *   - cookie sesi yang dipecah (`sb-xxx-auth-token.0`, `.1`) tetap dikenali
 */

const createServerClientMock = vi.fn()
const getUserMock = vi.fn()

vi.mock('@supabase/ssr', () => ({
  createServerClient: (...args: unknown[]) => createServerClientMock(...args),
}))

/**
 * `NextResponse` di-stub dengan objek sederhana yang mempertahankan permukaan
 * yang benar-benar dipakai `updateSession`: `status`, `headers`, dan `cookies`.
 * Memakai `Response` bawaan tidak bisa — `NextResponse.next()` bukan response
 * dengan status redirect, dan `NextResponse.cookies` tidak ada padanya.
 */
vi.mock('next/server', () => {
  function makeResponse(status: number, location?: string) {
    const headers = new Headers()
    if (location) headers.set('location', location)
    return {
      status,
      headers,
      cookies: {
        set: () => undefined,
        getAll: () => [],
      },
    }
  }
  return {
    NextResponse: {
      next: () => makeResponse(200),
      redirect: (url: URL | string) => makeResponse(307, url.toString()),
    },
  }
})

vi.mock('@/lib/env', () => ({
  env: {
    supabaseUrl: () => 'https://staging.example.supabase.co',
    supabaseAnonKey: () => 'anon-key',
  },
}))

const { updateSession } = await import('@/lib/utils/supabase/middleware')

type Cookie = { name: string; value: string }

function makeRequest(pathname: string, cookies: Cookie[], search = ''): NextRequest {
  const url = new URL(`http://localhost:3000${pathname}${search}`)
  return {
    cookies: {
      getAll: () => cookies,
      get: (name: string) => cookies.find((c) => c.name === name),
      set: () => undefined,
    },
    headers: new Headers(),
    nextUrl: {
      pathname,
      search,
      searchParams: new URLSearchParams(search),
      hostname: url.hostname,
      clone: () => new URL(url.toString()),
    },
    url: url.toString(),
  } as unknown as NextRequest
}

beforeEach(() => {
  createServerClientMock.mockReset()
  getUserMock.mockReset()
  createServerClientMock.mockImplementation(() => ({
    auth: { getUser: getUserMock },
  }))
})

describe('updateSession — tanpa cookie sesi', () => {
  it('tidak membuat klien auth sama sekali', async () => {
    const response = await updateSession(makeRequest('/cpns', []))

    expect(createServerClientMock).not.toHaveBeenCalled()
    expect(getUserMock).not.toHaveBeenCalled()
    // NextResponse.next() tidak punya status redirect
    expect(response.status).toBe(200)
  })

  it('tetap mengarahkan rute terlindungi ke /login (fail-closed)', async () => {
    const response = await updateSession(makeRequest('/cpns/dashboard', []))

    expect(response.status).toBe(307)
    const location = response.headers.get('location') ?? ''
    expect(location).toContain('/login')
    expect(location).toContain('returnTo=%2Fcpns%2Fdashboard')
  })

  it('tetap mengarahkan /onboarding ke /login', async () => {
    const response = await updateSession(makeRequest('/onboarding', []))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toContain('/login')
  })

  it('membiarkan halaman publik tetap terbuka', async () => {
    for (const path of ['/', '/cpns', '/tka', '/blog']) {
      const response = await updateSession(makeRequest(path, []))
      expect(response.status, `path ${path}`).toBe(200)
    }
  })

  it('membiarkan /login terbuka untuk pengunjung anonim', async () => {
    const response = await updateSession(makeRequest('/login', []))
    expect(response.status).toBe(200)
  })
})

describe('updateSession — dengan cookie sesi', () => {
  const sessionCookie: Cookie[] = [{ name: 'sb-lpgrivowdcepcxradavu-auth-token', value: 'jwt' }]

  it('membuat klien auth dan memanggil getUser', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } })

    await updateSession(makeRequest('/cpns', sessionCookie))

    expect(createServerClientMock).toHaveBeenCalledTimes(1)
    expect(getUserMock).toHaveBeenCalledTimes(1)
  })

  it('mengenali cookie sesi yang dipecah (.0/.1)', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } })
    const chunked: Cookie[] = [
      { name: 'sb-lpgrivowdcepcxradavu-auth-token.0', value: 'part0' },
      { name: 'sb-lpgrivowdcepcxradavu-auth-token.1', value: 'part1' },
    ]

    await updateSession(makeRequest('/cpns', chunked))

    // Cookie dipecah berarti ADA sesi → klien tetap dibuat.
    expect(createServerClientMock).toHaveBeenCalledTimes(1)
  })

  it('mengarahkan pengguna login yang membuka /login ke dashboard', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } } })

    const response = await updateSession(makeRequest('/login', sessionCookie))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).not.toContain('/login')
  })

  it('membiarkan pengguna login melewati rute terlindungi', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } } })

    const response = await updateSession(makeRequest('/cpns/dashboard', sessionCookie))

    expect(response.status).toBe(200)
  })

  it('cookie sesi yang tidak valid tetap diperlakukan sebagai belum login', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } })
    const stale: Cookie[] = [{ name: 'sb-lpgrivowdcepcxradavu-auth-token', value: 'expired' }]

    const response = await updateSession(makeRequest('/cpns/dashboard', stale))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toContain('/login')
  })

  it('cookie non-auth (mis. csrf-token) TIDAK dianggap sebagai sesi', async () => {
    const response = await updateSession(
      makeRequest('/cpns', [{ name: 'csrf-token', value: 'abc' }]),
    )

    expect(createServerClientMock).not.toHaveBeenCalled()
    expect(response.status).toBe(200)
  })
})
