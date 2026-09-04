import { describe, expect, it } from 'vitest'
import { resolvePostLoginRedirect, sanitizeAuthReturnTo } from '@/lib/auth-redirect'

describe('auth redirect helpers', () => {
  it('uses program onboarding after login from the generic entry', () => {
    expect(sanitizeAuthReturnTo(null)).toBe('/')
    expect(resolvePostLoginRedirect(null)).toBe('/onboarding')
    expect(resolvePostLoginRedirect('/')).toBe('/onboarding')
  })

  it('keeps the legacy /cpns return target pointed at the dashboard after login', () => {
    expect(resolvePostLoginRedirect('/cpns')).toBe('/cpns/dashboard')
  })

  it('keeps the TKA landing target pointed at its authenticated dashboard', () => {
    expect(resolvePostLoginRedirect('/tka')).toBe('/tka')
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
