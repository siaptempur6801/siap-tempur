import { expect, test } from '@playwright/test'

test('admin lists do not automatically prefetch authenticated row and sidebar destinations', async ({
  page,
}) => {
  const prefetched: string[] = []
  const blockedScripts: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error' && /content security policy/i.test(message.text()))
      blockedScripts.push(message.text())
  })
  page.on('request', (request) => {
    if (
      request.headers()['next-router-prefetch'] === '1' &&
      new URL(request.url()).pathname.startsWith('/admin')
    )
      prefetched.push(request.url())
  })
  await page.goto('/admin/assessments?program=CPNS&track=SKD')
  await expect(page.locator('main h1')).toHaveText('Assessment')
  await expect(page.locator('html')).toHaveAttribute('data-interaction-guard', 'ready')
  // Observe the idle window in which Next normally prefetches visible links.
  await page.waitForTimeout(700)
  expect(prefetched).toEqual([])
  await page
    .getByRole('navigation', { name: 'Menu admin' })
    .getByRole('link', { name: 'Dashboard', exact: true })
    .click()
  await expect(page.locator('main h1')).toHaveText('Dashboard')
  await expect(page.getByRole('region', { name: 'Ringkasan operasional' })).toBeVisible()
  expect(blockedScripts).toEqual([])
})

test('search sends one debounced RSC navigation, persists URL state, and resets pagination', async ({
  page,
}) => {
  await page.goto('/admin/content/questions?program=CPNS&track=SKD&page=2')
  await expect(page.locator('main h1')).toHaveText('Question Bank')
  await expect(page.locator('html')).toHaveAttribute('data-interaction-guard', 'ready')
  const navigations: string[] = []
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (
      url.pathname === '/admin/content/questions' &&
      url.searchParams.has('_rsc') &&
      url.searchParams.has('q')
    )
      navigations.push(url.searchParams.get('q')!)
  })
  const search = page.getByRole('textbox', { name: 'Cari kode soal atau isi pertanyaan…' })
  await search.pressSequentially('CPNS', { delay: 60 })
  await expect(page).toHaveURL((url) => url.searchParams.get('q') === 'CPNS')
  await expect(page.locator('html')).toHaveAttribute('data-interaction-guard', 'ready')
  expect(navigations).toEqual(['CPNS'])
  const url = new URL(page.url())
  expect(url.searchParams.get('page')).toBeNull()
  expect(url.searchParams.get('program')).toBe('CPNS')
  expect(url.searchParams.get('track')).toBe('SKD')
  await page.reload()
  await expect(search).toHaveValue('CPNS')
})
