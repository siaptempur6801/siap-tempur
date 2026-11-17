import { expect, test } from '@playwright/test'
import { cleanupRoleUser, loginAs, provisionRoleUser, requireEnv } from '../admin-roles'

/**
 * Landing utama bagi pengguna yang SUDAH LOGIN.
 *
 * Dua keputusan produk yang dikunci di sini:
 *   1. TIDAK ada tombol "Dashboard" di landing utama — halaman ini adalah halaman
 *      pengenalan, dan satu-satunya jalan masuk adalah "Pilih program" menuju
 *      onboarding;
 *   2. "Pilih program" benar-benar menuju onboarding, bukan sekadar menggulir ke
 *      seksi kartu program seperti sebelumnya.
 *
 * Dijalankan pada project `chromium-admin-roles` karena project itulah yang
 * memprovisikan pengguna dan login lewat UI. Project `chromium-authenticated`
 * (spec 17) memerlukan E2E_PARTICIPANT_EMAIL/PASSWORD yang di CI diisi kosong,
 * sehingga project itu tidak pernah aktif — menaruh test ini di sana berarti ia
 * tidak akan pernah dijalankan.
 *
 * Perilaku landing tidak bergantung pada peran, jadi pengguna ADMIN yang
 * diprovisikan di sini mewakili pengguna yang sudah login pada umumnya.
 */

test.describe.configure({ mode: 'serial' })
test.setTimeout(180_000)

test.describe('Landing utama untuk pengguna yang sudah login', () => {
    test('tanpa tombol Dashboard, dan Pilih program menuju onboarding', async ({ page }) => {
        const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
        const user = await provisionRoleUser(supabaseUrl, 'ADMIN')
        try {
            // Login tanpa returnTo: mendarat di halaman default, lalu buka landing
            // secara eksplisit supaya test tidak bergantung pada tujuan pasca-login.
            await loginAs(page, user, '/admin')
            await page.goto('/')
            await expect(page.getByRole('heading', { name: /Jangan cuma tahu skormu/i })).toBeVisible()

            // Dipersempit ke elemen <header>: kata "Dashboard" muncul di bagian lain
            // halaman (mis. pada tangkapan layar contoh produk), jadi locator tanpa
            // scope akan menyesatkan.
            //
            // Memakai `page.locator('header')`, BUKAN `getByRole('banner')`:
            // `LandingHeader` dirender di dalam `<main>`, dan landmark `banner` hanya
            // diberikan pada <header> yang TIDAK bersarang di dalam main/section/
            // article. Header sengaja tetap di dalam `<main class="st-product">`
            // karena `.st-button` di-scope ke `.st-product` — memindahkannya akan
            // menghilangkan gaya tombolnya. (Landmark yang hilang itu sendiri layak
            // diperbaiki terpisah, dengan memindahkan `.st-product` ke pembungkus.)
            const header = page.locator('header')
            await expect(header.getByRole('link', { name: 'Dashboard', exact: true })).toHaveCount(0)

            const primaryCta = header.getByRole('link', { name: 'Pilih program', exact: true })
            await expect(primaryCta).toHaveAttribute('href', '/onboarding')

            await primaryCta.click()
            await expect(page).toHaveURL(/\/onboarding$/)
            // Judul halaman onboarding, dan DUA pilihan program yang menjadi inti
            // halaman itu. "Pilih ruang belajar" sengaja tidak dipakai: teks itu ada
            // di <div class="st-kicker">, bukan heading.
            await expect(page.getByRole('heading', { name: /Mau belajar di program yang mana/i })).toBeVisible()
            await expect(page.getByTestId('program-choice-cpns')).toBeVisible()
            await expect(page.getByTestId('program-choice-tka')).toBeVisible()
        } finally {
            await cleanupRoleUser(supabaseUrl, user.userId)
        }
    })

    test('?landing=1 tetap menampilkan halaman pengenalan TKA walau sudah login', async ({ page }) => {
        const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
        const user = await provisionRoleUser(supabaseUrl, 'ADMIN')
        try {
            await loginAs(page, user, '/admin')

            // Tanpa penanda ini, `/tka` mengalihkan ke jenjang aktif — perilaku yang
            // memang disengaja dan diuji terpisah di spec 17 (INTENTIONAL_REDIRECTS).
            await page.goto('/tka?landing=1')
            await expect(page).toHaveURL(/\/tka\?landing=1$/)
            await expect(page.getByRole('heading', { name: /Persiapan TKA untuk setiap jenjang belajar/i })).toBeVisible()

            // Dan memilih TKA dari landing utama mendarat di halaman pengenalan itu,
            // bukan langsung ke jenjang.
            await page.goto('/')
            await page.getByTestId('program-card-tka').first().click()
            await expect(page).toHaveURL(/\/tka\?landing=1$/)
            await expect(page.getByRole('heading', { name: /Persiapan TKA untuk setiap jenjang belajar/i })).toBeVisible()
        } finally {
            await cleanupRoleUser(supabaseUrl, user.userId)
        }
    })
})
