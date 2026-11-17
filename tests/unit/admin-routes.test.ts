import { describe, expect, it } from 'vitest'
import { adminHref, adminRouteState } from '@/lib/admin-routes'
import { adminReturnUrl } from '@/lib/admin-return-url'

describe('admin resource URLs', () => {
  it.each([
    ['/admin/assessment/exams?assessment=a&tab=distribution', '/admin/assessments/a/distribution'],
    ['/admin/assessment/exams?new=1', '/admin/assessments/new'],
    ['/admin/assessments?edit=a', '/admin/assessments/a/edit'],
    ['/admin/assessment/events?event=e&tab=participants', '/admin/events/e/participants'],
    ['/admin/events?event=e&tab=monitoring', '/admin/events/e/monitoring'],
    [
      '/admin/events?event=e&tab=monitoring&monitoring_section=reports',
      '/admin/events/e/monitoring/reports',
    ],
    ['/admin/events?edit=e', '/admin/events/e/settings'],
    [
      '/admin/organizations?org=o&batch=b&tab=assignments',
      '/admin/organizations/o/batches/b/assignments',
    ],
    ['/admin/organizations?org=o&batch=new', '/admin/organizations/o/batches/new'],
    ['/admin/content/questions?edit=q', '/admin/content/questions/q/edit'],
    ['/admin/content/review?question=q', '/admin/content/review/q'],
    ['/admin/content/review?bulk=1', '/admin/content/review/bulk'],
    ['/admin/commerce', '/admin/commerce/orders'],
    ['/admin/commerce/products?edit=p', '/admin/commerce/products/p/edit'],
    ['/admin/users?tab=roles', '/admin/users/roles'],
    ['/admin/users/u?tab=entitlements', '/admin/users/u/entitlements'],
    ['/admin/audit', '/admin/settings/audit'],
    ['/admin/settings?flag=tka.smp.enabled', '/admin/settings/flags/tka.smp.enabled/edit'],
    ['/admin/reports', '/admin/monitoring/reports'],
    ['/admin/monitoring?event=e', '/admin/monitoring?event=e'],
    [
      '/admin/reports?org=o&batch=b&assignment=a',
      '/admin/organizations/o/batches/b/assignments/a/monitoring/reports',
    ],
    ['/admin/results/a?event=e', '/admin/monitoring/results/a?event=e'],
  ])('redirects %s to %s without a loop', (before, after) => {
    expect(adminHref(before)).toBe(after)
    expect(adminHref(after)).toBe(after)
    expect(adminRouteState(new URL(after, 'http://local').pathname)).not.toBeNull()
  })

  it('keeps filters, pagination, domain and canonical return location', () => {
    const result = new URL(
      adminHref(
        '/admin/assessment/exams?assessment=a&tab=questions&search=Tryout+TIU&page=3&program=CPNS&track=SKD&returnTo=%2Fadmin%2Fassessment%2Fexams%3Fsearch%3DTIU%26page%3D3',
      ),
      'http://local',
    )
    expect(result.pathname).toBe('/admin/assessments/a/questions')
    expect(Object.fromEntries(result.searchParams)).toEqual({
      search: 'Tryout TIU',
      page: '3',
      program: 'CPNS',
      track: 'SKD',
      returnTo: '/admin/assessments?search=TIU&page=3',
    })
  })

  it('path resource and view win over conflicting query input', () => {
    expect(adminHref('/admin/assessments/a/questions?assessment=b&tab=results')).toBe(
      '/admin/assessments/a/questions',
    )
    expect(
      adminHref(
        '/admin/organizations/o/batches/b/assignments/a/monitoring?org=other&batch=other&assignment=other&q=Ali',
      ),
    ).toBe('/admin/organizations/o/batches/b/assignments/a/monitoring?q=Ali')
    expect(
      adminRouteState('/admin/organizations/o/batches/b/assignments/a/monitoring')?.context,
    ).toEqual({ org: 'o', batch: 'b', assignment: 'a' })
  })

  it('unknown views stay invalid instead of silently falling back to a list', () => {
    for (const path of [
      '/admin/events/e/unknown',
      '/admin/assessments/a/unknown',
      '/admin/organizations/o/batches/b/unknown',
      '/admin/content/questions/q/unknown',
      '/admin/users/u/unknown',
      '/admin/users/%E0%A4',
      '/admin/events/..%2Foutside',
    ]) {
      expect(adminRouteState(path)).toBeNull()
      expect(adminHref(path)).toBe(path)
    }
  })

  it('does not normalize public routes or permit unsafe return destinations', () => {
    expect(adminHref('/cpns/live/e')).toBe('/cpns/live/e')
    expect(adminReturnUrl('https://evil.example/admin', '/admin/assessment/exams')).toBe(
      '/admin/assessments',
    )
    expect(adminReturnUrl('/admin/../outside', '/admin/commerce')).toBe('/admin/commerce/orders')
    expect(adminReturnUrl('//evil.example/admin', '/admin')).toBe('/admin')
  })

  it('never rewrites export handlers into resource pages', () => {
    const exportUrl = '/admin/organizations/export?org=o&batch=b'
    expect(adminHref(exportUrl)).toBe(exportUrl)
    expect(adminRouteState('/admin/organizations/export')).toBeNull()
    expect(adminHref('/admin/monitoring/export?event=e')).toBe('/admin/monitoring/export?event=e')
    expect(adminHref('/admin/organizations?org=o&batch=b&tab=overview')).toBe(
      '/admin/organizations/o/batches/b/overview',
    )
  })
})
