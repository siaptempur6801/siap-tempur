import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Gate paritas DB: kontrak statis.
 *
 * Gate ini menyentuh DUA database (staging + produksi) sehingga tidak dapat
 * dijalankan di unit test. Yang diuji di sini adalah kontrak yang dapat
 * diperiksa tanpa jaringan — terutama agar gate ini tidak bisa "dilumpuhkan
 * diam-diam", karena gate yang selalu hijau lebih berbahaya daripada tidak ada
 * gate sama sekali.
 */

const source = readFileSync(resolve(__dirname, '../../scripts/db-parity-check.mjs'), 'utf8')

describe('gate paritas DB — kontrak', () => {
    it('membandingkan skema runtime aplikasi', () => {
        expect(source).toContain("const RUNTIME_SCHEMAS = ['public', 'app_private']")
        for (const kind of ['functions', 'tables', 'policies', 'indexes', 'triggers']) {
            expect(source).toContain(`'${kind}'`)
        }
        expect(source).toContain('supabase_migrations.schema_migrations')
    })

    it('gagal keras saat ada selisih tak terduga', () => {
        // Inti gate: harus mengembalikan 1, bukan sekadar mencetak peringatan.
        expect(source).toContain('return 1')
        expect(source).toContain('return 0')
        expect(source).toMatch(/process\.exit\(main\(\)\)/)
        expect(source).toContain('selisih TIDAK terduga')
    })

    it('menolak setiap selisih DEFINISI, bukan hanya objek yang hilang', () => {
        // Objek yang ada di kedua sisi tapi berbeda bentuk tetap harus gagal.
        expect(source).toContain("if (difference.side === 'keduanya') return null")
        expect(source).toContain('definisi berbeda')
    })

    it('selalu mengembalikan link CLI ke staging, termasuk saat gagal', () => {
        // Supabase CLI hanya menautkan satu project; meninggalkannya di produksi
        // akan membuat perintah berikutnya menyentuh database yang salah.
        expect(source).toMatch(/finally\s*\{[\s\S]{0,200}link\(STAGING_REF\)/)
    })

    it('tidak pernah menulis ke database', () => {
        for (const forbidden of ['insert into', 'update ', 'delete from', 'drop ', 'alter ']) {
            expect(source.toLowerCase()).not.toContain(`'${forbidden}`)
        }
        // Semua query harus SELECT.
        const queries = source.match(/query\(`([\s\S]*?)`\)/g) ?? []
        expect(queries.length).toBeGreaterThan(0)
        for (const q of queries) {
            expect(q.toLowerCase()).toContain('select')
        }
    })

    it('menolak berjalan ke produksi tanpa pagar eksplisit', () => {
        // Skrip menautkan CLI ke project PRODUKSI. Repo ini menjaga agar hal yang
        // menyentuh produksi tidak pernah terjadi diam-diam, jadi jalur itu harus
        // diminta eksplisit dan gagal-tertutup bila flag tidak ada.
        expect(source).toContain("process.env.DB_PARITY_ALLOW_PRODUCTION !== '1'")
        expect(source).toContain('DB_PARITY_ALLOW_PRODUCTION=1')
        // Harus berhenti SEBELUM menyentuh apa pun.
        const guardIndex = source.indexOf("DB_PARITY_ALLOW_PRODUCTION !== '1'")
        const linkIndex = source.indexOf('function main()')
        expect(guardIndex).toBeLessThan(linkIndex)
    })

    it('menyediakan jalur kontrol negatif yang terdokumentasi', () => {
        // Gate yang selalu hijau lebih berbahaya daripada tidak ada gate.
        // Kontrol negatif memungkinkan pembuktian tanpa menyabotase database.
        expect(source).toContain('DB_PARITY_DISABLE_WHITELIST')
        expect(source).toContain('INTENTIONAL_DIFFERENCES.length = 0')
    })

    it('tersambung sebagai target gate lokal', () => {
        // Tanpa ini, gate-nya ada tetapi tidak ada yang menjalankannya.
        const runGate = readFileSync(resolve(__dirname, '../../scripts/local-gates/run-gate.mjs'), 'utf8')
        expect(runGate).toContain('parity: {')
        expect(runGate).toContain("direct: { command: 'node', args: ['scripts/db-parity-check.mjs']")
        expect(runGate).toContain("DB_PARITY_ALLOW_PRODUCTION: '1'")
        // Gate ini tidak butuh browser/aplikasi.
        expect(runGate).toMatch(/parity:\s*\{[\s\S]{0,600}manageApp: false/)
    })

    it('setiap selisih yang diterima wajib punya alasan tertulis', () => {
        // Daftar putih harus berisi alasan; tanpa itu, "menerima selisih" menjadi
        // cara membungkam gate.
        const whitelistBlock = source.slice(
            source.indexOf('const INTENTIONAL_DIFFERENCES'),
            source.indexOf('const SCHEMA_DIR'),
        )
        expect(whitelistBlock).toContain('reason:')
        expect(whitelistBlock.length).toBeGreaterThan(100)
    })
})
