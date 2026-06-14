import { describe, expect, it } from 'vitest'
import { resolvePostLoginRedirect, sanitizeAuthReturnTo } from '@/lib/auth-redirect'

describe('auth redirect helpers', () => {
  it('keeps the legacy /cpns return target pointed at the dashboard after login', () => {
    expect(resolvePostLoginRedirect('/cpns')).toBe('/cpns/dashboard')
  })

  it('redirects full internal return targets without appending dashboard', () => {
    expect(resolvePostLoginRedirect('/cpns/live/event-id')).toBe('/cpns/live/event-id')
    expect(resolvePostLoginRedirect('/cpns/dashboard/event')).toBe('/cpns/dashboard/event')
  })

  it('rejects external and malformed return targets', () => {
    expect(sanitizeAuthReturnTo('https://example.com/phish')).toBe('/cpns')
    expect(sanitizeAuthReturnTo('//example.com/phish')).toBe('/cpns')
    expect(sanitizeAuthReturnTo('javascript:alert(1)')).toBe('/cpns')
    expect(sanitizeAuthReturnTo('/\\example.com')).toBe('/cpns')
  })
})
