import { describe, expect, it } from 'vitest'
import { isPublicAuthPath, resolveAuthBackHref, sanitizeAuthReturnTo } from '@/lib/auth-redirect'

describe('tujuan tautan Kembali di halaman login/register', () => {
  it('memakai returnTo bila halamannya publik', () => {
    expect(resolveAuthBackHref('/tka')).toBe('/tka')
    expect(resolveAuthBackHref('/cpns')).toBe('/cpns')
    expect(resolveAuthBackHref('/blog/contoh-artikel')).toBe('/blog/contoh-artikel')
    expect(resolveAuthBackHref('/cpns/full-tryout')).toBe('/cpns/full-tryout')
    expect(resolveAuthBackHref('/syarat-ketentuan')).toBe('/syarat-ketentuan')
  })

  it('kembali ke beranda bila returnTo butuh login (mencegah pantulan ke halaman login)', () => {
    expect(resolveAuthBackHref('/cpns/dashboard')).toBe('/')
    expect(resolveAuthBackHref('/cpns/dashboard/beli-paket')).toBe('/')
    expect(resolveAuthBackHref('/tka/smp')).toBe('/')
    expect(resolveAuthBackHref('/tka/smp/mini-tryout')).toBe('/')
    expect(resolveAuthBackHref('/admin')).toBe('/')
    expect(resolveAuthBackHref('/onboarding')).toBe('/')
  })

  it('tanpa returnTo kembali ke beranda', () => {
    expect(resolveAuthBackHref()).toBe('/')
    expect(resolveAuthBackHref(null)).toBe('/')
    expect(resolveAuthBackHref('')).toBe('/')
  })

  it('tetap menolak nilai returnTo yang tidak aman', () => {
    expect(resolveAuthBackHref('https://jahat.example')).toBe('/')
    expect(resolveAuthBackHref('//jahat.example')).toBe('/')
    expect(resolveAuthBackHref('/\\jahat')).toBe('/')
  })

  it('mengabaikan query dan hash saat menilai publik/tidaknya', () => {
    expect(isPublicAuthPath('/tka?ref=nav')).toBe(true)
    expect(isPublicAuthPath('/cpns/dashboard?tab=1')).toBe(false)
    expect(resolveAuthBackHref('/cpns/dashboard?tab=1')).toBe('/')
  })

  it('membedakan /tka (publik) dari jenjang di dalamnya (butuh login)', () => {
    expect(isPublicAuthPath('/tka')).toBe(true)
    expect(isPublicAuthPath('/tka/sd')).toBe(false)
    expect(isPublicAuthPath('/tka/sma')).toBe(false)
  })

  it('sanitasi dasar tetap berlaku', () => {
    expect(sanitizeAuthReturnTo('/tka')).toBe('/tka')
    expect(sanitizeAuthReturnTo('https://jahat.example')).toBe('/')
  })
})
