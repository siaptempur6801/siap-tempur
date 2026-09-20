import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Dialog konfirmasi aksi destruktif (S10).
 *
 * Komponen ini GAGAL DUA KALI saat dikerjakan, dan kedua kegagalannya hanya
 * terlihat saat halaman benar-benar dibuka:
 *
 * 1. **Render prop ditolak React.** Bentuk pertama memakai
 *    `{(confirm) => <button …/>}`. Halaman admin adalah Server Component, jadi
 *    React menolak fungsi yang dilewatkan ke komponen klien:
 *    *"Functions cannot be passed directly to Client Components unless you
 *    explicitly expose it by marking it with 'use server'"*. Akibatnya seluruh
 *    halaman jatuh ke error boundary.
 * 2. **Tombol konfirmasi di luar form.** Bentuk berikutnya menutup dialog tanpa
 *    mengirim apa pun, sehingga "konfirmasi" menjadi tombol yang tidak melakukan
 *    apa-apa — lebih buruk daripada tidak ada konfirmasi.
 *
 * Keduanya tidak bisa ditangkap typecheck. Karena itu kontraknya diuji di sini:
 * slot `trigger` (bukan fungsi), dan tombol konfirmasi bertipe `submit`.
 */

const repoRoot = resolve(__dirname, '../..')
const component = readFileSync(resolve(repoRoot, 'components/admin/ConfirmSubmit.tsx'), 'utf8')

/**
 * Membuang komentar sebelum memeriksa.
 *
 * Dokumen di berkas-berkas ini SENGAJA memuat contoh bentuk yang salah (mis.
 * `{(confirm) => …}`) sebagai penjelasan kenapa bentuk itu ditinggalkan —
 * pemeriksaan harus melihat kode, bukan dokumentasinya.
 */
function stripComments(text: string) {
    return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
}

const componentCode = stripComments(component)

/** Halaman/komponen yang memasang dialog ini. */
const CONSUMERS = [
    'app/admin/AdminOperationsWorkspace.tsx',
    'app/admin/assessment/exams/AdminExamsWorkspace.tsx',
    'app/admin/users/page.tsx',
    'app/admin/settings/page.tsx',
    'app/admin/organizations/page.tsx',
    'components/admin/ArticleStatusActions.tsx',
]

function source(relativePath: string) {
    return readFileSync(resolve(repoRoot, relativePath), 'utf8')
}

function countMatches(text: string, pattern: RegExp) {
    return (text.match(pattern) ?? []).length
}

describe('ConfirmSubmit', () => {
    it('menerima elemen lewat slot `trigger`, bukan fungsi', () => {
        expect(component).toMatch(/trigger:\s*ReactElement/)
        expect(component).toContain('cloneElement')
    })

    it('tidak memakai render prop `children` sebagai fungsi', () => {
        // `children: (confirm) => …` adalah bentuk yang ditolak React dari Server
        // Component; kehadirannya kembali berarti halaman akan error lagi.
        expect(componentCode).not.toMatch(/children:\s*\(/)
        expect(componentCode).not.toMatch(/\{\(confirm\)\s*=>/)
    })

    /**
     * Bukan `type="submit"`: React mengganti atribut `action` form server action
     * dengan `javascript:throw new Error('A React form was unexpectedly
     * submitted…')`, sehingga submit native DITOLAK dan aksinya tidak pernah
     * berjalan. Yang bekerja adalah `requestSubmit()`, yang memicu jalur submit
     * React beserta seluruh field form induk. Ditemukan lewat E2E: tombol
     * konfirmasi ada, dialognya terbuka, tetapi peserta tidak pernah terhapus
     * dan tidak ada satu pun permintaan POST yang terkirim.
     */
    it('mengirim form lewat requestSubmit() dan bertipe submit', () => {
        // `requestSubmit(tombol)` menolak tombol bertipe `button`
        // ("The specified element is not a submit button"), jadi tipenya wajib
        // `submit`; dan pemanggilannya tanpa argumen supaya React memilih jalurnya.
        expect(component).toMatch(/requestSubmit\(\)/)
        expect(componentCode).toMatch(/type="submit"/)
    })

    it('memakai pemilik form dari tombolnya, bukan closest(form)', () => {
        expect(component).toMatch(/currentTarget\.form/)
        expect(componentCode).not.toMatch(/closest\(['"]form['"]\)/)
    })

    it('menyebut konsekuensi, bukan sekadar "yakin?"', () => {
        // Pesan wajib datang dari pemanggil, dan `detail` tersedia untuk rincian.
        expect(component).toMatch(/message:\s*string/)
        expect(component).toMatch(/detail\?:\s*string/)
    })
})

describe('pemasangan dialog di halaman admin', () => {
    for (const file of CONSUMERS) {
        it(`${file} memakai slot trigger`, () => {
            const text = source(file)
            const usages = countMatches(text, /<ConfirmSubmit\b/g)
            if (usages === 0) {
                // Berkas boleh tidak memakai sama sekali; yang dilarang adalah
                // memakai bentuk yang salah.
                return
            }
            expect(countMatches(text, /trigger=\{/g), `${file}: setiap ConfirmSubmit butuh trigger`).toBe(usages)
            expect(text).not.toMatch(/\{\(confirm\)\s*=>/)
            expect(text).not.toMatch(/\{\(\)\s*=>\s*<button/)
        })
    }

    it('tidak ada lagi `window.confirm` di permukaan admin', () => {
        for (const file of CONSUMERS) {
            const text = source(file)
            // Komentar yang menyebut window.confirm tidak dihitung.
            const withoutComments = text.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
            expect(withoutComments, `${file} masih memakai window.confirm`).not.toContain('window.confirm')
        }
    })
})
