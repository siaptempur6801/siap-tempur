import { adminUrlState } from '../admin-workflow'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import {
  cleanupRoleUser,
  loginAs,
  provisionRoleUser,
  removeFirstParticipant,
  requireEnv,
} from '../admin-roles'

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

function wibInput(minutesFromNow: number) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(Date.now() + minutesFromNow * 60_000))
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`
}

test.describe('Instansi — distribusi assessment katalog', () => {
  test('jadwalkan assessment katalog untuk batch dan bersihkan assignment', async ({ page }) => {
    const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
    const admin = await provisionRoleUser(supabaseUrl, 'ADMIN')
    const orgCode = uniqueCode('E2E-DIST-ORG')
    const batchCode = uniqueCode('E2E-DIST-BATCH')
    let orgId = ''
    let batchId = ''

    try {
      await loginAs(page, admin, '/admin')
      await page.goto('/admin/assessments?program=CPNS&track=SKD')
      await page
        .locator('tr[data-assessment-id]')
        .filter({ hasText: 'Siap' })
        .first()
        .getByRole('link', { name: 'Lihat', exact: true })
        .click()
      await page
        .getByRole('navigation', { name: 'Bagian workspace' })
        .getByRole('link', { name: 'Distribusi', exact: true })
        .click()
      const assignmentLink = page
        .getByRole('link', { name: 'Tugaskan ke Instansi', exact: true })
        .first()
      await expect(assignmentLink).toBeVisible()
      const assignmentHref = await assignmentLink.getAttribute('href')
      expect(assignmentHref).not.toBeNull()
      const assignmentUrl = new URL(assignmentHref!, 'http://localhost')
      const assessmentId = assignmentUrl.searchParams.get('exam') ?? ''
      expect(assessmentId).not.toBe('')
      await assignmentLink.click()
      await expect(page).toHaveURL(new RegExp(`/admin/organizations\\?.*exam=${assessmentId}`))

      // ------------------------------------------------- instansi & batch
      await page.getByRole('link', { name: 'Instansi baru', exact: true }).click()
      await page.getByPlaceholder('Dinas Pendidikan Kota Medan').fill(`Instansi Ujian ${orgCode}`)
      await page.getByPlaceholder('DINAS-MEDAN').fill(orgCode)
      await page.getByRole('button', { name: 'Buat instansi', exact: true }).click()
      await expect(
        page.getByRole('heading', { name: `Instansi Ujian ${orgCode}`, exact: true }),
      ).toBeVisible({ timeout: 30_000 })
      orgId = adminUrlState(page.url()).get('org') ?? ''
      expect(orgId).not.toBe('')

      if (!(await page.getByRole('link', { name: 'Batch baru', exact: true }).count()))
        await page.getByRole('link', { name: 'Batch', exact: true }).click()
      await page.getByRole('link', { name: 'Batch baru', exact: true }).first().click()
      await page.getByPlaceholder('CPNS 2026 Batch A').fill(`Batch Ujian ${batchCode}`)
      await page.getByPlaceholder('CPNS-2026-A').fill(batchCode)
      await page.getByLabel('Status batch').selectOption('active')
      await page.getByRole('button', { name: 'Buat batch', exact: true }).click()
      await expect(page.locator('input[aria-label^="Tautan undangan"]')).toBeVisible({
        timeout: 30_000,
      })
      await expect(page.getByText('Assessment untuk batch ini', { exact: true })).toBeVisible()

      // Batch baru langsung dipilih setelah disimpan; ambil ID dari URL
      // untuk membuktikan konteks yang dipakai dan membersihkan fixture.
      batchId = adminUrlState(page.url()).get('batch') ?? ''
      expect(batchId).not.toBe('')
      await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText(batchCode)

      const assessmentPicker = page.locator('input[name="exam_id"]')
      await expect(assessmentPicker).toHaveValue(assessmentId)
      const assessmentTitle = (
        await page.locator(`label:has(input[type="radio"][value="${assessmentId}"])`).innerText()
      )
        .split('\n')[0]
        .trim()
      await page.getByLabel('Buka (WIB)').fill(wibInput(5))
      await page.getByLabel('Tutup (WIB)').fill(wibInput(24 * 60))
      await page.getByRole('button', { name: 'Review Penugasan', exact: true }).click()
      await page.getByRole('button', { name: 'Jadwalkan assessment', exact: true }).click()

      await expect(page.getByRole('status').filter({ hasText: 'Penugasan disimpan.' })).toBeVisible(
        { timeout: 30_000 },
      )
      await expect(page.getByText('Penugasan (1)', { exact: true })).toBeVisible()
      await expect(
        page.locator('[data-assignment-id]').getByRole('cell').filter({ hasText: assessmentTitle }),
      ).toBeVisible()
      await page.getByText('Pengaturan Penugasan', { exact: true }).click()
      await expect(page.getByRole('button', { name: 'Nonaktifkan', exact: true })).toBeVisible()
    } finally {
      // Instansi uji tanpa peserta dapat dihapus. Batch dan assignment ikut
      // cascade; assessment katalog bersama tidak disentuh.
      if (orgId) {
        const batchQuery = batchId ? `&batch=${batchId}` : ''
        await page.goto(`/admin/organizations?org=${orgId}${batchQuery}&tab=settings`)
        await expect(
          page.getByRole('heading', { name: `Instansi Ujian ${orgCode}`, exact: true }),
        ).toBeVisible({ timeout: 30_000 })
        await page.getByRole('link', { name: 'Pengaturan', exact: true }).click()
        await page.getByRole('button', { name: 'Hapus instansi', exact: true }).click()
        await page
          .getByRole('alertdialog')
          .getByRole('button', { name: 'Hapus instansi', exact: true })
          .click()
        await expect(
          page.getByRole('status').filter({ hasText: /dihapus|masih punya peserta/ }),
        ).toContainText(new RegExp(`Instansi Ujian ${orgCode} dihapus\\.|masih punya peserta`), {
          timeout: 30_000,
        })
      }
      await cleanupRoleUser(supabaseUrl, admin.userId)
    }
  })
})

test.describe('Instansi — monitoring & export', () => {
  test('monitoring menampilkan peserta dan XLSX-nya benar-benar dapat diunduh', async ({
    page,
  }) => {
    const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
    const admin = await provisionRoleUser(supabaseUrl, 'ADMIN')
    const orgCode = uniqueCode('E2E-EXP-ORG')
    const batchCode = uniqueCode('E2E-EXP-BATCH')
    let orgId = ''

    try {
      await loginAs(page, admin, '/admin')
      await page.goto('/admin/organizations')

      // ------------------------------------------------- instansi & batch
      await page.getByRole('link', { name: 'Instansi baru', exact: true }).click()
      await page.getByPlaceholder('Dinas Pendidikan Kota Medan').fill(`Instansi Export ${orgCode}`)
      await page.getByPlaceholder('DINAS-MEDAN').fill(orgCode)
      await page.getByRole('button', { name: 'Buat instansi', exact: true }).click()
      await expect(
        page.getByRole('heading', { name: `Instansi Export ${orgCode}`, exact: true }),
      ).toBeVisible({ timeout: 30_000 })
      orgId = adminUrlState(page.url()).get('org') ?? ''
      expect(orgId).not.toBe('')

      if (!(await page.getByRole('link', { name: 'Batch baru', exact: true }).count()))
        await page.getByRole('link', { name: 'Batch', exact: true }).click()
      await page.getByRole('link', { name: 'Batch baru', exact: true }).first().click()
      await page.getByPlaceholder('CPNS 2026 Batch A').fill(`Batch Export ${batchCode}`)
      await page.getByPlaceholder('CPNS-2026-A').fill(batchCode)
      await page.getByLabel('Status batch').selectOption('active')
      await page.getByRole('button', { name: 'Buat batch', exact: true }).click()
      await expect(page.locator('input[aria-label^="Tautan undangan"]')).toBeVisible({
        timeout: 30_000,
      })

      // ---------------------------------------------------------- peserta
      await page.getByRole('link', { name: 'Peserta', exact: true }).click()
      await expect(page.getByText('Impor peserta dari CSV', { exact: true })).toBeVisible()

      await page
        .getByPlaceholder(/participant_code,full_name,email,phone/)
        .fill(
          [
            'participant_code,full_name,email,phone',
            'EXP-1,Peserta Satu,satu@contoh.id,081234567890',
            'EXP-2,Peserta Dua,dua@contoh.id,',
          ].join('\n'),
        )
      await page.getByRole('button', { name: 'Periksa dulu', exact: true }).click()
      await expect(page.getByText(/2 baris siap/)).toBeVisible({ timeout: 30_000 })
      await page.getByRole('button', { name: 'Impor sekarang', exact: true }).click()
      await expect(page.getByText(/2 peserta diimpor/)).toBeVisible({ timeout: 30_000 })

      // -------------------------------------------------------- monitoring
      await page.reload()
      await page
        .getByRole('navigation', { name: 'Bagian workspace' })
        .getByRole('link', { name: 'Monitoring', exact: true })
        .click()
      await expect(page.locator('main h1')).toHaveText('Monitoring Peserta')
      // Tanpa exam, semua peserta berstatus "Belum mulai" — dan itulah yang
      // harus terlihat, bukan angka nol yang menyesatkan.
      // Dipersempit ke tabel MONITORING (dibedakan oleh header "Status ujian"):
      // nama peserta juga muncul di tabel peserta di atasnya.
      const monitoringTable = page.locator('table', { hasText: 'Progres' }).first()
      await expect(monitoringTable).toBeVisible({ timeout: 30_000 })
      await expect(monitoringTable.getByText('Belum mulai', { exact: true }).first()).toBeVisible()
      for (const name of ['Peserta Satu', 'Peserta Dua']) {
        await expect(monitoringTable.getByText(name, { exact: true })).toBeVisible()
      }

      // ------------------------------------------------------ unduh XLSX
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 60_000 }),
        page.getByRole('link', { name: 'Unduh XLSX', exact: true }).click(),
      ])

      expect(download.suggestedFilename()).toMatch(/\.xlsx$/)
      const filePath = await download.path()
      expect(filePath).toBeTruthy()

      // Diperiksa sebagai ARSIP ZIP sungguhan dengan `unzip`, bukan sekadar
      // "berkasnya ada": struktur ZIP yang salah membuat Excel menolak
      // membukanya, dan itu tidak terlihat dari ukuran berkas.
      const bytes = readFileSync(filePath as string)
      expect(bytes.subarray(0, 2).toString('latin1')).toBe('PK')

      const listing = execFileSync('unzip', ['-l', filePath as string], { stdio: 'pipe' }).toString(
        'utf8',
      )
      expect(listing).toContain('xl/workbook.xml')
      expect(listing).toContain('xl/worksheets/sheet1.xml')
      // Empat sheet: Rekap, Detail Peserta, Ranking Internal, No-show.
      expect(listing).toContain('sheet4.xml')

      const workbook = execFileSync('unzip', ['-p', filePath as string, 'xl/workbook.xml'], {
        stdio: 'pipe',
      }).toString('utf8')
      expect(workbook).toContain('name="Rekap"')
      expect(workbook).toContain('name="Detail Peserta"')
      expect(workbook).toContain('name="No-show"')

      // Isinya benar-benar memuat peserta batch ini.
      const detail = execFileSync('unzip', ['-p', filePath as string, 'xl/worksheets/sheet2.xml'], {
        stdio: 'pipe',
      }).toString('utf8')
      expect(detail).toContain('EXP-1')
      expect(detail).toContain('Peserta Satu')
    } finally {
      if (orgId) {
        await page.goto(`/admin/organizations?org=${orgId}&tab=batches`)
        await expect(
          page.getByRole('heading', { name: `Instansi Export ${orgCode}`, exact: true }),
        ).toBeVisible({ timeout: 30_000 })

        // Peserta dikeluarkan dulu: instansi yang masih punya peserta tidak
        // boleh dihapus, dan penjaga itu memang benar.
        await page.getByRole('link', { name: 'Lihat peserta', exact: true }).first().click()
        // Menunggu tombol pertama BENAR-BENAR tampil sebelum menghitungnya.
        // `locator.count()` tidak menunggu render; tanpa penantian ini loop
        // langsung berhenti karena tabelnya belum ada, peserta tidak
        // terkeluarkan, dan penghapusan instansi gagal.
        await expect(
          page.getByRole('button', { name: /^Keluarkan peserta ./ }).first(),
        ).toBeVisible({ timeout: 30_000 })
        for (let guard = 0; guard < 10; guard += 1) {
          // Sejak S10 tombol "Keluarkan" hanya membuka dialog; helper ini
          // menekan tombol konfirmasinya lalu menunggu dialog tertutup.
          const remove = page.getByRole('button', { name: /^Keluarkan peserta ./ })
          const before = await remove.count()
          if (before === 0) break
          await removeFirstParticipant(page)
          await expect(remove).toHaveCount(before - 1, { timeout: 30_000 })
        }

        await page.getByRole('link', { name: 'Pengaturan', exact: true }).click()
        await page.getByRole('button', { name: 'Hapus instansi', exact: true }).click()
        await page
          .getByRole('alertdialog')
          .getByRole('button', { name: 'Hapus instansi', exact: true })
          .click()
        // Sama seperti spec join: penolakan "masih punya peserta" adalah
        // penjaga produk yang sah, bukan kegagalan pembersihan.
        await expect(
          page.getByRole('status').filter({ hasText: /dihapus|masih punya peserta/ }),
        ).toContainText(/dihapus\.|masih punya peserta/, { timeout: 30_000 })
      }
      await cleanupRoleUser(supabaseUrl, admin.userId)
    }
  })
})
