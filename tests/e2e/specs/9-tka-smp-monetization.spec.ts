import { verifySignoutConfirmation } from '../pages/SignoutConfirmation'
import { expect, test, type Page } from '@playwright/test'
import { freshDisposableTkaSession, type DisposableTkaSession } from '../tka.ci'
import {
  cleanupCiTkaUser,
  clearM4Artifacts,
  consumeM4MiniQuota,
  grantM4Pass,
  provisionSecondaryTkaSession,
  readOrderAs,
  readPaymentAs,
  seedM4Order,
  setTkaSmpMonetizationEnforcement,
} from '../tka.m4'

async function assertNoDocumentOverflow(page: Page) {
  const report = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
  }))
  expect(report.documentWidth, JSON.stringify(report)).toBeLessThanOrEqual(report.viewportWidth + 1)
}

async function assertTouchTarget(page: Page, accessibleName: RegExp) {
  const control = page.getByRole('button', { name: accessibleName }).first()
  await expect(control).toBeVisible()
  const box = await control.boundingBox()
  expect(box, `Missing bounding box for ${accessibleName}`).not.toBeNull()
  expect(box!.height).toBeGreaterThanOrEqual(44)
  await control.focus()
  await expect(control).toBeFocused()
}

function examCard(page: Page, title: string) {
  return page
    .locator('article')
    .filter({ has: page.getByRole('heading', { name: title, exact: true }) })
}

test.describe.serial('TKA SMP Monetization staging surface', () => {
  let currentSession: DisposableTkaSession | null = null

  async function fresh(page: Page) {
    currentSession = await freshDisposableTkaSession(page)
    return currentSession
  }

  test.beforeAll(async () => {
    await setTkaSmpMonetizationEnforcement(true)
  })

  test.afterAll(async () => {
    if (currentSession) {
      await clearM4Artifacts(currentSession).catch(() => undefined)
      await cleanupCiTkaUser(currentSession.userId).catch(() => undefined)
    }
    // Enforcement is now the staging baseline; cleanup must not reopen
    // premium access after the suite finishes.
    await setTkaSmpMonetizationEnforcement(true)
  })

  test('authenticated learner can discover active SMP pass catalog with transparent mobile checkout UX', async ({
    page,
  }) => {
    test.setTimeout(60_000)
    await fresh(page)
    await page.setViewportSize({ width: 390, height: 844 })

    // Di mobile, sidebar `Tempur Pass` tersembunyi; jalur discovery nyata adalah
    // kartu akses di dashboard `/tka/smp`.
    await page.goto('/tka/smp')
    const passLink = page.getByRole('link', { name: /Tempur Pass/i })
    await expect(passLink).toBeVisible()
    await passLink.click()
    await page.waitForURL(/\/tka\/smp\/pass$/i)

    await expect(
      page.getByRole('heading', { name: 'Pilih paket yang sesuai target belajarmu', exact: true }),
    ).toBeVisible()
    await expect(page.getByTestId('tka-pass-status-inactive')).toContainText(
      'Belum ada Tempur Pass aktif.',
    )
    await expect(
      page.getByRole('heading', { name: 'Pilih akses belajar TKA SMP', exact: true }),
    ).toBeVisible()
    // Harga yang tampil adalah harga asli paket — tanpa baris biaya admin terpisah.
    await expect(page.getByText('Harga paket', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Rp29.000', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Rp69.000', { exact: true }).first()).toBeVisible()
    await expect(page.getByText(/biaya admin/i)).toHaveCount(0)

    await assertTouchTarget(page, /Pilih 30 hari/i)
    await assertTouchTarget(page, /Pilih 90 hari/i)

    const snapScript = page.locator('script#midtrans-snap')
    await expect(snapScript).toHaveAttribute('src', 'https://app.sandbox.midtrans.com/snap/snap.js')
    await expect(snapScript).toHaveAttribute('data-client-key', /.+/)
    await assertNoDocumentOverflow(page)
  })

  test('Full Tryout is denied without a usable Tempur Pass when enforcement is enabled', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    await fresh(page)
    await page.goto('/tka/smp/tryout')

    const full = examCard(page, 'Tryout Lengkap TKA SMP')
    await expect(full).toBeVisible()
    // Enforcement ON tanpa pass: tombol mulai diganti tombol terkunci yang disabled,
    // jadi tidak ada lagi toast "Paket aktif diperlukan..." setelah klik.
    const locked = full.getByRole('button', { name: 'Butuh Tempur Pass', exact: true })
    await expect(locked).toBeVisible()
    await expect(locked).toBeDisabled()
    await expect(page).toHaveURL(/\/tka\/smp\/tryout$/)
  })

  test('expired Tempur Pass stays inactive and cannot unlock Full Tryout', async ({ page }) => {
    test.setTimeout(90_000)
    const session = await fresh(page)
    const grant = await grantM4Pass(session, 'expired')
    expect(grant.entitlementCount).toBe(10)

    await page.goto('/tka/smp/pass')
    await expect(page.getByTestId('tka-pass-status-inactive')).toContainText(
      'Belum ada Tempur Pass aktif.',
    )

    await page.goto('/tka/smp/tryout')
    const full = examCard(page, 'Tryout Lengkap TKA SMP')
    await expect(
      full.getByRole('button', { name: 'Butuh Tempur Pass', exact: true }),
    ).toBeDisabled()
  })

  test('active Tempur Pass shows expiry/renewal UX and unlocks Full Tryout', async ({ page }) => {
    test.setTimeout(90_000)
    const session = await fresh(page)
    const grant = await grantM4Pass(session, 'active')
    expect(grant.entitlementCount).toBe(10)

    await page.goto('/tka/smp/pass')
    await expect(page.getByTestId('tka-pass-status-active')).toContainText('Tempur Pass aktif')
    await expect(
      page.getByRole('heading', { name: 'Perpanjang akses TKA SMP', exact: true }),
    ).toBeVisible()
    await expect(page.getByRole('button', { name: /Perpanjang 30 hari/i })).toBeVisible()

    await page.goto('/tka/smp/tryout')
    const full = examCard(page, 'Tryout Lengkap TKA SMP')
    await full.getByRole('button', { name: 'Mulai Tryout', exact: true }).click()
    await page.waitForURL(/\/tka\/smp\/tryout\/[0-9a-f-]+$/i)
    await expect(page.getByText(/Bahasa Indonesia|Matematika/i).first()).toBeVisible()
  })

  test('Mini free quota is denied after one attempt without pass', async ({ page }) => {
    test.setTimeout(90_000)
    const session = await fresh(page)
    const seeded = await consumeM4MiniQuota(session, 'tka-smp-mini-bahasa-indonesia')
    expect(seeded.attemptNumber).toBe(1)

    await page.goto('/tka/smp/mini-tryout')
    const mini = examCard(page, 'Mini Tryout Bahasa Indonesia TKA SMP')
    const locked = mini.getByRole('button', {
      name: 'Kuota gratis habis · Butuh Tempur Pass',
      exact: true,
    })
    await expect(locked).toBeVisible()
    await expect(locked).toBeDisabled()
  })

  test('active Tempur Pass bypasses exhausted Mini quota', async ({ page }) => {
    test.setTimeout(90_000)
    const session = await fresh(page)
    await consumeM4MiniQuota(session, 'tka-smp-mini-matematika')
    await grantM4Pass(session, 'active')

    await page.goto('/tka/smp/mini-tryout')
    const mini = examCard(page, 'Mini Tryout Matematika TKA SMP')
    await expect(mini.getByText('Tempur Pass aktif', { exact: true })).toBeVisible()
    await mini.getByRole('button', { name: 'Mulai Tryout', exact: true }).click()
    await page.waitForURL(/\/tka\/smp\/tryout\/[0-9a-f-]+$/i)
  })

  test('orders and payments are owner-only across two authenticated learners', async ({ page }) => {
    const owner = await fresh(page)
    const order = await seedM4Order(owner)
    // Order tidak lagi menambahkan biaya admin: jumlah = harga paket.
    expect(order.amount).toBe(29_000)

    const attacker = await provisionSecondaryTkaSession()
    try {
      const ownerOrder = await readOrderAs(owner, order.orderId)
      const ownerPayment = await readPaymentAs(owner, order.orderId)
      expect(ownerOrder?.id).toBe(order.orderId)
      expect(ownerOrder?.order_number).toBe(order.orderNumber)
      expect(ownerPayment?.order_id).toBe(order.orderId)

      const attackerOrder = await readOrderAs(attacker, order.orderId)
      const attackerPayment = await readPaymentAs(attacker, order.orderId)
      expect(attackerOrder).toBeNull()
      expect(attackerPayment).toBeNull()
    } finally {
      await cleanupCiTkaUser(attacker.userId)
    }
  })

  test('unauthenticated learner is redirected to login with pass returnTo', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    await page.goto('/tka/smp/pass')
    await page.waitForURL(/\/login\?returnTo=%2Ftka%2Fsmp%2Fpass/i)
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await context.close()
  })
})

test('TKA learner signout supports keyboard cancellation and failed pending requests', async ({
  page,
}, testInfo) => {
  // Other monetization cases deliberately replace and clean their user. Own this
  // session independently, including the successful logout's session revocation.
  const session = await freshDisposableTkaSession(page)
  try {
    await verifySignoutConfirmation(page, '/tka/smp', 'tka', testInfo)
    await page.getByRole('button', { name: 'Keluar', exact: true }).click()
    await page
      .getByRole('alertdialog', { name: 'Yakin ingin keluar?', exact: true })
      .getByRole('button', { name: 'Ya, Keluar', exact: true })
      .click()
    await expect(page).toHaveURL(/\/tka$/)
    await page.goto('/tka/smp')
    await expect(page).toHaveURL(/\/login\?returnTo=/)
  } finally {
    await cleanupCiTkaUser(session.userId)
  }
})
