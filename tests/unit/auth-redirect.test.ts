import { describe, expect, it } from 'vitest'
import { resolvePostLoginRedirect, sanitizeAuthReturnTo } from '@/lib/auth-redirect'

describe('auth redirect helpers', () => {
  it('uses the public multi-program landing as the generic auth fallback', () => {
    expect(sanitizeAuthReturnTo(null)).toBe('/')
    expect(resolvePostLoginRedirect(null)).toBe('/')
  })

  it('keeps the legacy /cpns return target pointed at the dashboard after login', () => {
    expect(resolvePostLoginRedirect('/cpns')).toBe('/cpns/dashboard')
  })

  it('preserves explicit CPNS and TKA internal return targets', () => {
    expect(resolvePostLoginRedirect('/cpns/live/event-id')).toBe('/cpns/live/event-id')
    expect(resolvePostLoginRedirect('/cpns/dashboard/event')).toBe('/cpns/dashboard/event')
    expect(resolvePostLoginRedirect('/tka/smp')).toBe('/tka/smp')
    expect(resolvePostLoginRedirect('/tka/smp?activated=1')).toBe('/tka/smp?activated=1')
  })

  it('rejects external and malformed return targets', () => {
    expect(sanitizeAuthReturnTo('https://example.com/phish')).toBe('/')
    expect(sanitizeAuthReturnTo('//example.com/phish')).toBe('/')
    expect(sanitizeAuthReturnTo('javascript:alert(1)')).toBe('/')
    expect(sanitizeAuthReturnTo('/\\example.com')).toBe('/')
  })
})
