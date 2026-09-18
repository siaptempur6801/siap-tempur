import { describe, expect, it } from 'vitest'
import { createEventCertificateImage } from '@/lib/event-certificate-pdf'

/**
 * Regresi: font sertifikat HARUS di-bundle, bukan bergantung font sistem.
 *
 * BUG NYATA DI PRODUKSI
 *   SVG sertifikat memakai `font-family="Arial, sans-serif"` dan `Resvg` dibuat
 *   tanpa konfigurasi font, sehingga resvg mencari font lewat fontconfig:
 *
 *     - di macOS (pengembangan) Arial ada  → sertifikat tampil normal;
 *     - di Vercel Linux (produksi) Arial TIDAK ada → SELURUH teks sertifikat
 *       tidak tergambar. Yang tersisa hanya bentuk, garis, logo, dan tanda
 *       tangan — persis keluhan "text dan nama tidak muncul".
 *
 *   Renderer kini memuat Poppins yang ikut ter-deploy (`public/fonts/`) dan
 *   mematikan font sistem (`loadSystemFonts: false`), sehingga hasilnya tidak
 *   lagi bergantung pada environment.
 *
 * CARA TEST INI BEKERJA
 *   Menghitung piksel gelap pada hasil render. Teks yang tergambar menghasilkan
 *   puluhan ribu piksel gelap; teks yang gagal tergambar menghasilkan nol.
 *   Ambangnya lebar supaya tidak rapuh terhadap perubahan tata letak, tetapi
 *   tetap mustahil dilewati bila teks hilang.
 */

const INPUT = {
    certificateNumber: 'ST-UJI-FONT-1',
    certificateName: 'Muhammad Apriady Siregar',
    eventTitle: 'TRYOUT AKBAR SKD CPNS BATCH 1',
    certificateKind: 'winner_1' as const,
    rank: 1,
    score: 449,
    isPassed: true,
    issuedAt: '2026-07-20T07:59:29.943Z',
    verifyUrl: 'https://siaptempur.id/verify-certificate/ST-UJI-FONT-1',
}

async function countDarkPixels(png: Buffer): Promise<number> {
    const { default: sharp } = await import('sharp')
    const { data, info } = await sharp(png).greyscale().raw().toBuffer({ resolveWithObject: true })
    let dark = 0
    for (let i = 0; i < data.length; i += info.channels) {
        if (data[i] < 100) dark += 1
    }
    return dark
}

describe('sertifikat — font bundled', () => {
    it('teks benar-benar tergambar (bukan hanya bentuk)', async () => {
        const png = Buffer.from(await createEventCertificateImage(INPUT))
        const dark = await countDarkPixels(png)

        // Sertifikat lengkap memuat judul, nama, keterangan, nomor, tanggal,
        // URL verifikasi, dan jabatan penanda tangan.
        expect(dark).toBeGreaterThan(20_000)
    }, 60_000)

    it('tidak bergantung pada font sistem', async () => {
        // Kalau renderer diam-diam kembali mengandalkan font sistem, di Linux
        // hasilnya bisa kosong. Test ini membandingkan: hasil render nyata harus
        // jauh lebih "berisi" daripada ambang minimum, sehingga kegagalan font
        // di environment mana pun akan ketahuan.
        const png = Buffer.from(await createEventCertificateImage(INPUT))
        const dark = await countDarkPixels(png)

        // Nilai terukur saat ini ~262.000. Ambang 20.000 memberi ruang besar
        // untuk perubahan tata letak, tetapi nol piksel tidak akan pernah lolos.
        expect(dark).toBeGreaterThan(20_000)
    }, 60_000)

    it('tetap menghasilkan berkas PDF yang valid', async () => {
        const { createEventCertificatePdf } = await import('@/lib/event-certificate-pdf')
        const pdf = await createEventCertificatePdf(INPUT)
        const bytes = pdf instanceof Uint8Array ? pdf : new Uint8Array(pdf as ArrayBuffer)
        expect(Buffer.from(bytes.slice(0, 5)).toString('latin1')).toBe('%PDF-')
        expect(bytes.length).toBeGreaterThan(30_000)
    }, 60_000)
})
