import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
    ADMIN_OPERATIONS_PAGE_COPY,
    ADMIN_OPERATIONS_PAGE_SECTIONS,
    ADMIN_OPERATIONS_PERMISSIONS,
    ADMIN_OPERATIONS_ROUTES,
    ADMIN_OPERATIONS_SECTIONS,
    type AdminOperationsMode,
} from '@/lib/admin-operations'

/**
 * Penjaga peta tab Workspace Admin.
 *
 * Insiden yang mendasari (ditemukan 2026-09-20): mode `events` hanya memuat
 * `['events','products']`, sedangkan modal "Tambah sesi" membaca `data.exams`.
 * Karena `data.exams` selalu kosong, dropdown "Exam EVENT" tidak pernah punya
 * satu opsi pun dan **sesi event tidak bisa dibuat sama sekali dari UI** — tanpa
 * error, tanpa pesan, tanpa consol warning.
 *
 * Bug seperti itu tidak tertangkap typecheck (keduanya `string[]`), tidak
 * tertangkap E2E (halaman tetap render), dan hanya ketahuan kalau seseorang
 * benar-benar mencoba menambah sesi.
 */

const repoRoot = resolve(__dirname, '../..')
const MODES = Object.keys(ADMIN_OPERATIONS_ROUTES) as AdminOperationsMode[]

describe('peta tab workspace admin', () => {
    it('tidak ada tab tanpa route, judul, domain data, atau permission', () => {
        for (const mode of MODES) {
            expect(ADMIN_OPERATIONS_ROUTES[mode], `route ${mode}`).toBeTruthy()
            expect(ADMIN_OPERATIONS_PAGE_COPY[mode]?.title, `judul ${mode}`).toBeTruthy()
            expect(ADMIN_OPERATIONS_SECTIONS[mode]?.length, `sections ${mode}`).toBeGreaterThan(0)
            expect(ADMIN_OPERATIONS_PERMISSIONS[mode]?.length, `permission ${mode}`).toBeGreaterThan(0)
        }
    })

    it('setiap route benar-benar punya page.tsx', () => {
        const missing = MODES.filter((mode) => {
            const page = join(repoRoot, 'app', ADMIN_OPERATIONS_ROUTES[mode], 'page.tsx')
            return !existsSync(page)
        })
        expect(missing).toEqual([])
    })

    /**
     * Regresi utama: modal "Tambah sesi" memilih exam bertipe EVENT dari
     * `data.exams`. Tanpa `exams` di daftar section, dropdown-nya kosong.
     */
    it('mode events memuat domain exams — syarat dropdown "Exam EVENT" terisi', () => {
        expect(ADMIN_OPERATIONS_SECTIONS.events).toContain('exams')
    })

    it('mode events juga memuat products — formulir event menautkan produk tiket', () => {
        expect(ADMIN_OPERATIONS_SECTIONS.events).toContain('products')
    })

    it('mode events dibuka oleh event.manage, bukan exam.manage', () => {
        expect(ADMIN_OPERATIONS_PERMISSIONS.events).toEqual(['event.manage'])
    })

    it('mode questions dibuka oleh question.manage', () => {
        expect(ADMIN_OPERATIONS_PERMISSIONS.questions).toEqual(['question.manage'])
    })

    /**
     * Mode `exams` pernah ada di komponen ini dan merupakan kode mati: tidak ada
     * route yang merendernya, dan permukaan exam yang hidup adalah
     * `app/admin/assessment/exams/AdminExamsWorkspace.tsx`. Dua permukaan exam
     * yang berbeda adalah sumber kebingungan, jadi yang mati sudah dibuang.
     */
    it('mode exams tidak dikembalikan sebagai tab komponen ini', () => {
        expect(MODES).toEqual(['products', 'events', 'questions', 'commerce'])
        expect(ADMIN_OPERATIONS_ROUTES).not.toHaveProperty('exams')
    })

    it('route exams tetap ada di pohon admin, hanya bukan lewat komponen ini', () => {
        expect(existsSync(join(repoRoot, 'app/admin/assessment/exams/page.tsx'))).toBe(true)
    })
})

describe('domain yang di-query per halaman', () => {
    /**
     * Sejak S6/S7 daftar product dan soal dibaca langsung dari database
     * (berhalaman + pencarian), jadi workspace-nya tidak perlu memuat domain itu
     * lagi. Kalau keduanya dimuat kembali, setiap kunjungan Question Bank
     * menarik delapan puluh baris beserta seluruh opsinya untuk tidak pernah
     * dirender — kerja database yang persis dulu dihilangkan.
     */
    it('product dan soal tidak lagi dimuat lewat workspace', () => {
        expect(ADMIN_OPERATIONS_PAGE_SECTIONS.products).toEqual([])
        expect(ADMIN_OPERATIONS_PAGE_SECTIONS.questions).toEqual([])
    })

    it('events tetap memuat ketiga domainnya karena masih memakai jalur workspace', () => {
        expect(ADMIN_OPERATIONS_PAGE_SECTIONS.events).toEqual(['events', 'products', 'exams'])
    })

    it('setiap mode punya entri, dan domainnya bagian dari domain mode itu', () => {
        for (const mode of MODES) {
            const pageSections = ADMIN_OPERATIONS_PAGE_SECTIONS[mode]
            expect(pageSections, `page sections ${mode}`).toBeDefined()
            for (const section of pageSections) {
                expect(ADMIN_OPERATIONS_SECTIONS[mode], `${mode} memuat ${section}`).toContain(section)
            }
        }
    })
})
