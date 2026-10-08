import { expect, test } from '@playwright/test'
import { adminUrlState } from '../admin-workflow'

test('primary navigation uses workspace paths and secondary views stay with their parent', async ({ page }) => {
  await page.goto('/admin')
  const nav = page.getByRole('navigation', { name: 'Menu admin' })
  await expect(nav.getByRole('link', { name: 'Assessment', exact: true })).toHaveAttribute('href', /^\/admin\/assessments\?program=/)
  await expect(nav.getByRole('link', { name: 'Event', exact: true })).toHaveAttribute('href', /^\/admin\/events\?program=/)
  await nav.getByRole('button', { name: 'Commerce', exact: true }).click()
  await expect(nav.getByRole('link', { name: 'Orders', exact: true })).toHaveAttribute('href', '/admin/commerce/orders')
  await page.goto('/admin/users/roles')
  await expect(page.getByRole('heading', { name: 'Peran & permission', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Roles & Permissions', exact: true })).toHaveAttribute('aria-current', 'page')
  await page.goto('/admin/settings/audit')
  await expect(page.locator('main h1')).toHaveText('Audit Log')
  await expect(page.getByRole('link', { name: 'Audit Log', exact: true })).toHaveAttribute('aria-current', 'page')
})

test('legacy bookmark redirects preserve filters and security headers', async ({ page }) => {
  const response = await page.request.get('/admin/assessment/exams?search=TIU&page=2&program=CPNS&track=SKD', { maxRedirects: 0 })
  expect(response.status()).toBe(307)
  const target = new URL(response.headers().location, response.url())
  expect(target.pathname).toBe('/admin/assessments')
  expect(Object.fromEntries(target.searchParams)).toEqual({ search: 'TIU', page: '2', program: 'CPNS', track: 'SKD' })
  expect(response.headers()['content-security-policy']).toContain('nonce-')
  expect(response.headers()['set-cookie']).toContain('csrf')
  await page.goto('/admin/assessment/exams?search=TIU&program=CPNS&track=SKD')
  await expect(page).toHaveURL(/\/admin\/assessments\?search=TIU/)
  await expect(page.locator('main h1')).toHaveText('Assessment')
})

test('assessment detail views are reloadable paths with natural Back', async ({ page }) => {
  await page.goto('/admin/assessments?program=CPNS&track=SKD&search=QA&page=1')
  const list = page.url()
  const first = page.locator('tr[data-assessment-id]').first()
  const id = (await first.getAttribute('data-assessment-id'))!
  await first.getByRole('link', { name: 'Lihat', exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`/admin/assessments/${id}\\?`))
  expect(adminUrlState(page.url()).get('assessment')).toBe(id)
  expect(id).toMatch(/^[0-9a-f-]{36}$/i)
  expect(new URL(page.url()).pathname).toBe(`/admin/assessments/${id}`)
  await page.getByRole('navigation', { name: 'Bagian workspace' }).getByRole('link', { name: 'Distribusi', exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`/admin/assessments/${id}/distribution\\?`))
  expect(new URL(page.url()).pathname).toBe(`/admin/assessments/${id}/distribution`)
  expect(new URL(page.url()).searchParams.has('tab')).toBe(false)
  await page.reload()
  await expect(page.getByRole('navigation', { name: 'Bagian workspace' }).getByRole('link', { name: 'Distribusi', exact: true })).toHaveAttribute('aria-current', 'page')
  await page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: 'Assessment', exact: true }).click()
  await expect(page).toHaveURL(list)
})

test('admin buttons are compact on desktop and keep a usable mobile target', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/admin/assessments?program=CPNS&track=SKD')
  const primary = page.getByRole('link', { name: 'Buat Assessment', exact: true })
  await expect(primary).toBeVisible()
  const desktop = (await primary.boundingBox())!
  expect(desktop.height).toBeGreaterThanOrEqual(24)
  expect(desktop.height).toBeLessThanOrEqual(34)
  const row = (await page.locator('tr[data-assessment-id]').first().getByRole('link', { name: 'Lihat', exact: true }).boundingBox())!
  expect(row.height).toBeGreaterThanOrEqual(24)
  expect(row.height).toBeLessThanOrEqual(30)
  await page.setViewportSize({ width: 390, height: 844 })
  await expect.poll(async () => (await primary.boundingBox())!.height).toBe(36)
  const mobile = (await primary.boundingBox())!
  expect(mobile.height).toBeGreaterThanOrEqual(36)
  expect(mobile.height).toBeLessThanOrEqual(38)
  expect(mobile.x + mobile.width).toBeLessThanOrEqual(390)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
