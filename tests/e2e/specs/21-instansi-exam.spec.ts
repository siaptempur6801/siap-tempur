import { expect, test } from '@playwright/test'
import { cleanupRoleUser, loginAs, provisionRoleUser, requireEnv } from '../admin-roles'

/**
 * Template ujian → bentuk exam → jadwalkan (MVP CPNS Instansi Managed Service
 * §6.4, §7.3, §7.4, flow §10.1 langkah 4–5).
 *
 * Yang dibuktikan, dalam satu alur:
 *   1. admin membuat instansi, batch, dan template 30/35/45;
 *   2. panel menampilkan ketersediaan soal terbit dan menyatakan "Soal cukup";
 *   3. "Bentuk exam" menghasilkan exam 110 soal;
 *   4. exam itu bisa dijadwalkan untuk batch.
 *
 * Idempotensi komposisi, penomoran `position` lintas section, dan penjaga
 * template TIDAK diuji di sini — semuanya milik database dan sudah dibuktikan
 * lebih ketat oleh `scripts/db-verify/organization-exam-template.sql`
 * (21 pemeriksaan). Mengujinya lagi lewat UI hanya menambah kerapuhan.
 */

test.describe.configure({ mode: 'serial' })
test.setTimeout(300_000)

function uniqueCode(prefix: string) {
    return `${prefix}-${Date.now().toString(36).toUpperCase().slice(-6)}`
}

test.describe('Instansi — template ujian & assignment', () => {
    test('buat template, bentuk exam 110 soal, lalu jadwalkan untuk batch', async ({ page }) => {
        const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
        const admin = await provisionRoleUser(supabaseUrl, 'ADMIN')
        const orgCode = uniqueCode('E2E-UJIAN-ORG')
        const batchCode = uniqueCode('E2E-UJIAN-BATCH')
        let orgId = ''

        try {
            await loginAs(page, admin, '/admin')
            await page.goto('/admin/organizations')

            // ------------------------------------------------- instansi & batch
            await page.getByRole('link', { name: 'Instansi baru', exact: true }).click()
            await page.getByPlaceholder('Dinas Pendidikan Kota Medan').fill(`Instansi Ujian ${orgCode}`)
            await page.getByPlaceholder('DINAS-MEDAN').fill(orgCode)
            await page.getByRole('button', { name: 'Buat instansi', exact: true }).click()
            await expect(page.getByRole('heading', { name: `Ubah Instansi Ujian ${orgCode}`, exact: true })).toBeVisible({ timeout: 30_000 })
            orgId = new URL(page.url()).searchParams.get('org') ?? ''
            expect(orgId).not.toBe('')

            await page.getByRole('link', { name: 'Batch baru', exact: true }).click()
            await page.getByPlaceholder('CPNS 2026 Batch A').fill(`Batch Ujian ${batchCode}`)
            await page.getByPlaceholder('CPNS-2026-A').fill(batchCode)
            await page.getByLabel('Status batch').selectOption('active')
            await page.getByRole('button', { name: 'Buat batch', exact: true }).click()
            await expect(page.locator('input[aria-label^="Tautan undangan"]')).toBeVisible({ timeout: 30_000 })

            // -------------------------------------------------------- template
            await page.getByRole('link', { name: 'Template baru', exact: true }).click()
            await expect(page.getByRole('heading', { name: 'Template ujian', exact: true })).toBeVisible()

            await page.getByPlaceholder('Full Tryout SKD Standar').fill(`Template E2E ${orgCode}`)
            // Template diikat ke instansi ini, BUKAN ke "Semua instansi".
            // Template global tidak ikut terhapus saat instansinya dihapus, sehingga
            // setiap kali gate dijalankan akan tertinggal satu template sampah —
            // dan memang itu yang terjadi: enam template menumpuk dari run yang gagal.
            await page.getByLabel('Cakupan template').selectOption(orgId)
            // Nilai bawaan form sudah 30/35/45; diperiksa supaya test gagal bila
            // bawaannya berubah tanpa disengaja.
            await expect(page.locator('input[name="twk_count"]')).toHaveValue('30')
            await expect(page.locator('input[name="tiu_count"]')).toHaveValue('35')
            await expect(page.locator('input[name="tkp_count"]')).toHaveValue('45')

            // Kolom yang PRD §7.3 minta harus ada.
            for (const label of ['Durasi (menit)', 'Batas attempt', 'Pembahasan', 'Visibilitas ranking']) {
                await expect(page.getByText(label, { exact: true })).toBeVisible()
            }
            // Opsi yang belum diterapkan harus ditandai apa adanya.
            await expect(page.getByText('Belum diterapkan', { exact: true })).toBeVisible()

            await page.getByRole('button', { name: 'Buat template', exact: true }).click()
            const templateCard = page.locator('div.rounded-xl', { hasText: `Template E2E ${orgCode}` }).last()
            await expect(templateCard).toBeVisible({ timeout: 30_000 })
            await expect(templateCard.getByText('30 TWK + 35 TIU + 45 TKP = 110 soal', { exact: true })).toBeVisible()
            // Ketersediaan nyata dari database: staging punya cukup soal terbit.
            await expect(templateCard.getByText('Soal cukup', { exact: true })).toBeVisible()
            await expect(templateCard.getByText('Khusus instansi ini', { exact: true })).toBeVisible()

            // ------------------------------------------------------ bentuk exam
            await page.getByRole('link', { name: 'Lihat peserta', exact: true }).first().click()
            await expect(page.getByText('Ujian batch ini', { exact: true })).toBeVisible()

            await page.getByLabel('Template ujian').selectOption({ label: `Template E2E ${orgCode} — 30 TWK + 35 TIU + 45 TKP = 110 soal` })
            // Jadwal diisi pada langkah yang sama: §7.4 menetapkan assignment adalah
            // batch + template + jadwal, dan §10.1 langkah 4–5 menjalankannya berurutan.
            await page.getByLabel('Buka (WIB)').fill('2026-10-01T08:00')
            await page.getByLabel('Tutup (WIB)').fill('2026-10-01T12:00')
            await page.getByRole('button', { name: 'Bentuk & jadwalkan', exact: true }).click()

            await expect(page.getByText(/terbentuk dengan 110 soal dan sudah dijadwalkan/)).toBeVisible({ timeout: 60_000 })

            // ---------------------------------------------------------- hasil
            await expect(page.getByText(/Ujian terjadwal \(1\)/)).toBeVisible({ timeout: 30_000 })
            // Tombol "Nonaktifkan" hanya muncul ketika assignment memang AKTIF —
            // sinyal yang tidak ambigu. Memeriksa teks "Aktif" tidak bisa dipakai:
            // ia juga cocok dengan <option>Aktif</option> di <select> yang tersembunyi.
            await expect(page.getByRole('button', { name: 'Nonaktifkan', exact: true })).toBeVisible()
            await expect(page.getByRole('button', { name: 'Hapus exam', exact: true })).toBeVisible()
        } finally {
            // Bersihkan: assignment, exam, lalu instansi. Instansi yang masih punya
            // peserta atau exam tidak boleh dihapus, jadi urutannya penting.
            if (orgId) {
                // TANPA penjaga `count()`: `locator.count()` tidak menunggu render,
                // sehingga versi sebelumnya melewati seluruh pembersihan ketika
                // halaman belum selesai dimuat — dan menyisakan satu instansi serta
                // satu template setiap kali gate dijalankan, tanpa membuat test gagal.
                // `orgId` hanya terisi setelah instansinya benar-benar dibuat, jadi
                // kegagalan di sini memang harus berisik.
                await page.goto(`/admin/organizations?org=${orgId}`)
                await expect(page.getByRole('heading', { name: `Ubah Instansi Ujian ${orgCode}`, exact: true })).toBeVisible({ timeout: 30_000 })

                // Exam dihapus lebih dulu: ia TIDAK terikat instansi, jadi tidak ikut
                // terhapus bersama instansinya.
                await page.getByRole('link', { name: 'Lihat peserta', exact: true }).first().click()
                await page.getByRole('button', { name: 'Hapus exam', exact: true }).click()
                // Pola pesan sukses, BUKAN tebakan judul: exam mewarisi nama template
                // ketika kolom judul dibiarkan kosong, dan menebak judul membuat test
                // gagal justru setelah penghapusannya berhasil.
                await expect(page.getByRole('status')).toHaveText(/^Exam .+ dihapus\.$/, { timeout: 30_000 })

                await page.getByRole('button', { name: 'Hapus instansi', exact: true }).click()
                // Pesan sukses lengkap diperiksa karena kata "dihapus" juga muncul di
                // pesan galat ("...tidak bisa dihapus...").
                await expect(page.getByRole('status')).toHaveText(/^Instansi .+ dihapus\.$/, { timeout: 30_000 })
            }
            await cleanupRoleUser(supabaseUrl, admin.userId)
        }
    })
})
