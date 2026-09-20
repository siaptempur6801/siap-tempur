import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Penjaga: `redirect()` tidak boleh dilempar dari dalam fungsi `async`.
 *
 * ## Insiden yang mendasari (2026-09-20)
 *
 * Jejak audit (S9) ditambahkan ke `app/actions/admin-organization.ts` dengan
 * mengubah helper `backTo()` menjadi `async` supaya bisa `await auditAdminAction()`
 * sebelum redirect. Akibatnya `saveOrganizationAction` berhenti bekerja:
 *
 * - instansinya SUDAH dibuat di database;
 * - log server mencatat `NEXT_REDIRECT;push;/admin/organizations?…&ok=Instansi…disimpan.`;
 * - tetapi **browser tidak berpindah halaman** dan pesan sukses tidak pernah
 *   muncul — Next melaporkannya sebagai `unhandledRejection: Error: NEXT_REDIRECT`.
 *
 * `redirect()` melempar error khusus yang ditangkap framework. Dari fungsi
 * SINKRON ia tertangkap dengan benar; dari fungsi `async` ia menjadi penolakan
 * promise yang tidak tertangani. Dua spec gate instansi (20 dan 21) merah karena
 * ini, dan gejalanya menyesatkan: data berubah, tetapi admin melihat formulir
 * kosong tanpa pesan apa pun.
 *
 * Kelas kesalahan ini tidak bisa ditangkap typecheck: `Promise<never>` adalah
 * tipe yang sah untuk helper redirect. Karena itu dikunci test.
 *
 * ## Aturan yang ditegakkan
 *
 * Fungsi NON-ACTION (helper, bukan `export async function`) tidak boleh
 * `async` sekaligus memanggil `redirect(`. Pola yang benar: await pekerjaan
 * asinkronnya di action, lalu panggil helper redirect yang sinkron.
 */

const repoRoot = resolve(__dirname, '../..')

const ACTION_FILES = [
    'app/actions/admin-v2.ts',
    'app/actions/admin-exams.ts',
    'app/actions/admin-platform.ts',
    'app/actions/admin-directory.ts',
    'app/actions/admin-organization.ts',
    'app/actions/admin-organization-exam.ts',
    'app/actions/admin-participant-import.ts',
    'app/actions/articles.ts',
]

/** Memotong komentar agar contoh di dokumentasi tidak ikut diperiksa. */
function stripComments(code: string) {
    return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
}

type FunctionBlock = { name: string; isAsync: boolean; isExported: boolean; body: string }

/**
 * Mengambil blok fungsi tingkat atas.
 *
 * Cukup memakai pencocokan `function` di awal baris (dengan indentasi opsional):
 * seluruh berkas aksi ini memakai gaya itu, tidak ada arrow function tingkat
 * atas. Batas blok diambil dari kurung kurawal yang seimbang.
 */
function topLevelFunctions(code: string): FunctionBlock[] {
    const blocks: FunctionBlock[] = []
    const pattern = /^(export\s+)?(async\s+)?function\s+(\w+)\s*\([^)]*\)[^{]*\{/gm
    let match: RegExpExecArray | null
    while ((match = pattern.exec(code)) !== null) {
        const braceStart = code.indexOf('{', match.index + match[0].length - 1)
        let depth = 0
        let index = braceStart
        for (; index < code.length; index += 1) {
            if (code[index] === '{') depth += 1
            else if (code[index] === '}') {
                depth -= 1
                if (depth === 0) break
            }
        }
        blocks.push({
            name: match[3],
            isAsync: Boolean(match[2]),
            isExported: Boolean(match[1]),
            body: code.slice(braceStart, index + 1),
        })
    }
    return blocks
}

describe('helper redirect tidak boleh async', () => {
    for (const file of ACTION_FILES) {
        it(`${file} memanggil redirect() hanya dari fungsi sinkron`, () => {
            const code = stripComments(readFileSync(resolve(repoRoot, file), 'utf8'))
            const offenders = topLevelFunctions(code)
                // Action yang diekspor memang `async` (Server Action) dan boleh
                // memanggil redirect(); yang berbahaya adalah HELPER async, karena
                // pemanggilnya meng-`await` dan redirect-nya berubah menjadi
                // penolakan yang tidak tertangani.
                .filter((block) => block.isAsync && !block.isExported && block.body.includes('redirect('))
                .map((block) => block.name)
            expect(offenders, `${file}: helper async yang memanggil redirect()`).toEqual([])
        })
    }

    it('helper redirect pada modul instansi benar-benar sinkron', () => {
        for (const file of ['app/actions/admin-organization.ts', 'app/actions/admin-organization-exam.ts']) {
            const code = stripComments(readFileSync(resolve(repoRoot, file), 'utf8'))
            const backTo = topLevelFunctions(code).find((block) => block.name === 'backTo')
            expect(backTo, `${file} harus punya backTo`).toBeDefined()
            expect(backTo?.isAsync, `${file}: backTo tidak boleh async`).toBe(false)
        }
    })

    it('pekerjaan audit di-await terpisah sebelum redirect', () => {
        // Bentuk yang benar: `await auditXAction(…)` lalu `backTo(…)` / `finish(…)`.
        const organization = readFileSync(resolve(repoRoot, 'app/actions/admin-organization.ts'), 'utf8')
        expect(organization).toMatch(/await auditOrgAction\(/)
        const exams = readFileSync(resolve(repoRoot, 'app/actions/admin-exams.ts'), 'utf8')
        expect(exams).toMatch(/await auditExamAction\(/)
        const orgExam = readFileSync(resolve(repoRoot, 'app/actions/admin-organization-exam.ts'), 'utf8')
        expect(orgExam).toMatch(/await auditOrgExamAction\(/)
    })
})
