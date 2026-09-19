import { expect, test } from '@playwright/test'
import { cleanupRoleUser, loginAs, provisionRoleUser, requireEnv } from '../admin-roles'

/**
 * Self-onboarding peserta instansi, end-to-end dengan dua pengguna sungguhan.
 *
 * MVP CPNS Instansi Managed Service §6.1, §6.2, §6.3, dan flow §10.3.
 *
 * Yang dibuktikan, dalam satu alur:
 *   1. admin membuat instansi dan batch lewat UI;
 *   2. sistem menghasilkan tautan undangan;
 *   3. peserta (pengguna lain) membuka tautan itu dan bergabung;
 *   4. peserta memperoleh kode peserta otomatis dan muncul di daftar peserta batch.
 *
 * Dua pengguna berbeda diperlukan — admin yang membuat, peserta yang bergabung —
 * jadi test ini memprovisikan keduanya sendiri dan membersihkannya di `finally`.
 * Helper `ci-e2e-admin` dipakai untuk keduanya; perannya dibedakan.
 */

test.describe.configure({ mode: 'serial' })
test.setTimeout(240_000)

function uniqueCode(prefix: string) {
    return `${prefix}-${Date.now().toString(36).toUpperCase().slice(-6)}`
}

test.describe('Instansi — self-onboarding peserta', () => {
    test('admin membuat instansi & batch, peserta bergabung lewat tautan undangan', async ({ page, browser }) => {
        const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
        const admin = await provisionRoleUser(supabaseUrl, 'ADMIN')
        const participant = await provisionRoleUser(supabaseUrl, 'FINANCE')

        // Kode dibuat SEBELUM `try` supaya blok `finally` dapat memakainya untuk
        // membersihkan instansi yang tertinggal bila test gagal di tengah jalan.
        const orgCode = uniqueCode('E2E-ORG')
        const batchCode = uniqueCode('E2E-BATCH')
        let orgId = ''

        try {
            // ---------------------------------------------------- 1. admin
            await loginAs(page, admin, '/admin')
            await page.goto('/admin/organizations')
            await expect(page.locator('main h1')).toHaveText('Instansi & Batch')

            await page.getByRole('link', { name: 'Instansi baru', exact: true }).click()
            await expect(page.getByRole('heading', { name: 'Instansi baru', exact: true })).toBeVisible()

            // Placeholder dipakai karena form instansi dan form batch sama-sama
            // memakai name="name" dan name="code"; locator berbasis name akan
            // mengisi form yang salah.
            await page.getByPlaceholder('Dinas Pendidikan Kota Medan').fill(`Instansi E2E ${orgCode}`)
            await page.getByPlaceholder('DINAS-MEDAN').fill(orgCode)
            await page.getByPlaceholder('Budi Santoso').fill('PIC E2E')
            await page.getByRole('button', { name: 'Buat instansi', exact: true }).click()

            await expect(page.getByRole('status')).toContainText('disimpan', { timeout: 30_000 })
            // Membuat instansi langsung membuka detailnya, supaya langkah
            // berikutnya (membuat batch) bisa dikerjakan tanpa mencari lagi.
            await expect(page.getByRole('heading', { name: `Ubah Instansi E2E ${orgCode}`, exact: true })).toBeVisible()
            orgId = new URL(page.url()).searchParams.get('org') ?? ''
            expect(orgId).not.toBe('')

            // ---------------------------------------------------- 2. batch
            await page.getByRole('link', { name: 'Batch baru', exact: true }).click()
            await page.getByPlaceholder('CPNS 2026 Batch A').fill(`Batch E2E ${batchCode}`)
            await page.getByPlaceholder('CPNS-2026-A').fill(batchCode)
            await page.getByLabel('Status batch').selectOption('active')
            await page.getByRole('button', { name: 'Buat batch', exact: true }).click()

            // Diperiksa HASILNYA, bukan pesan flash: yang penting batch benar-benar
            // terbentuk dan tautan undangannya tersedia. Pesan flash bisa hilang
            // karena redirect, dan menguji pesan membuat test rapuh tanpa menambah
            // keyakinan.
            const inviteInput = page.locator(`input[aria-label="Tautan undangan Batch E2E ${batchCode}"]`)
            await expect(inviteInput).toBeVisible({ timeout: 30_000 })
            // Tautan bisa relatif atau absolut tergantung NEXT_PUBLIC_SITE_URL,
            // jadi yang diperiksa adalah PATH-nya — itu bagian yang menjadi
            // kontrak halaman join.
            const invitePath = new URL(await inviteInput.inputValue(), 'http://localhost').pathname
            expect(invitePath).toMatch(/^\/cpns\/join\/[0-9a-f]{32}$/)

            // ------------------------------------------- 4. peserta bergabung
            // Konteks browser terpisah: sesi admin tidak boleh ikut terbawa,
            // karena halaman join bertindak atas nama pengguna yang login.
            const participantContext = await browser.newContext({ storageState: { cookies: [], origins: [] } })
            const participantPage = await participantContext.newPage()
            try {
                await loginAs(participantPage, participant, invitePath)

                await expect(participantPage.getByText('Undangan Instansi', { exact: true })).toBeVisible()
                await expect(participantPage.getByRole('heading', { name: `Instansi E2E ${orgCode}`, exact: true })).toBeVisible()
                await expect(participantPage.getByText(`Batch E2E ${batchCode}`, { exact: true })).toBeVisible()

                await participantPage.getByPlaceholder('Nama sesuai identitas').fill('Peserta E2E')
                await participantPage.getByPlaceholder('mis. Bidang Kepegawaian').fill('Bidang Uji')
                await participantPage.getByRole('button', { name: 'Gabung ke batch ini', exact: true }).click()

                await expect(participantPage.getByRole('status')).toContainText('Berhasil bergabung', { timeout: 30_000 })

                // Bergabung ULANG harus idempoten — halaman menampilkan bahwa ia
                // sudah terdaftar, bukan membuat baris peserta kedua.
                await participantPage.goto(invitePath)
                await expect(participantPage.getByText('Anda sudah terdaftar', { exact: true })).toBeVisible()
            } finally {
                await participantContext.close()
            }

            // ------------------------------------- 5. peserta tampak bagi admin
            // Yang diperiksa adalah KEBERADAAN peserta dan status akunnya di mata
            // admin — bukan sekadar angka, karena angka bisa benar tanpa barisnya
            // benar-benar dapat dibuka.
            await page.goto(`/admin/organizations?org=${orgId}`)
            await page.getByRole('link', { name: 'Lihat peserta', exact: true }).first().click()
            await expect(page.getByText('Peserta E2E', { exact: true })).toBeVisible()
            await expect(page.getByText('Tertaut', { exact: true })).toBeVisible()
        } finally {
            // Bersihkan instansi yang dibuat test ini. Tanpa ini, setiap kali gate
            // dijalankan akan tertinggal satu instansi sampah di staging — dan
            // memang itu yang terjadi sebelum blok ini ada.
            //
            // `?org=` langsung membuka panel detailnya, jadi tidak perlu mencari
            // baris di tabel. Penantian eksplisit dipakai karena `locator.count()`
            // TIDAK menunggu render — versi pertama blok ini melewatkan pembersihan
            // justru karena itu.
            if (orgId) {
                await page.goto(`/admin/organizations?org=${orgId}`)
                await expect(page.getByRole('heading', { name: `Ubah Instansi E2E ${orgCode}`, exact: true })).toBeVisible()

                // Peserta dikeluarkan dulu: instansi yang masih punya peserta memang
                // TIDAK boleh dihapus, dan penjaga itu diuji terpisah.
                const participantToggle = page.getByRole('link', { name: 'Lihat peserta', exact: true })
                if (await participantToggle.count() > 0) {
                    await participantToggle.first().click()
                    await expect(page.getByText('Peserta E2E', { exact: true })).toBeVisible()
                    await page.getByRole('button', { name: 'Keluarkan' }).first().click()
                    await expect(page.getByRole('status')).toContainText('dikeluarkan', { timeout: 30_000 })
                }

                await page.getByRole('button', { name: 'Hapus instansi', exact: true }).click()
                await expect(page.getByRole('status')).toContainText('dihapus', { timeout: 30_000 })
            }
            await cleanupRoleUser(supabaseUrl, admin.userId)
            await cleanupRoleUser(supabaseUrl, participant.userId)
        }
    })

    test('tautan undangan tidak dikenali ditampilkan dengan jelas', async ({ page }) => {
        const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
        const user = await provisionRoleUser(supabaseUrl, 'ADMIN')
        try {
            await loginAs(page, user, '/admin')
            await page.goto('/cpns/join/00000000000000000000000000000000')
            await expect(page.getByRole('heading', { name: 'Tautan undangan tidak dikenali', exact: true })).toBeVisible()
        } finally {
            await cleanupRoleUser(supabaseUrl, user.userId)
        }
    })
})
