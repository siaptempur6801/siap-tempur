import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * `products`/`product_prices` memakai HURUF BESAR sebagai bentuk kanonik
 * (dikunci CHECK `status = upper(status)`), sementara form mengirim huruf kecil.
 *
 * Dua bug nyata yang dikunci di sini:
 *   1. Filter status produk mengirim `active` → tidak pernah cocok (0 baris),
 *      karena seluruh baris tersimpan sebagai `ACTIVE`.
 *   2. Simpan produk menulis `active`/`inactive` → check_violation, simpan gagal.
 */
const repoRoot = resolve(__dirname, '../..')
function source(relativePath: string) {
    return readFileSync(resolve(repoRoot, relativePath), 'utf8')
}

const service = source('src/services/admin-v2.service.ts')
const page = source('app/admin/AdminOperationsWorkspace.tsx')

describe('status produk huruf besar', () => {
    it('daftar domain menandai products sebagai uppercase dan filter menyesuaikan diri', () => {
        expect(service).toMatch(/statusCase: 'upper'/)
        expect(service).toMatch(/spec\.statusCase === 'upper' \? status\.toUpperCase\(\) : status/)
        expect(service).toMatch(/spec\.statusCase === 'upper' \? options\.status\.toUpperCase\(\) : options\.status/)
    })

    it('penulisan produk menormalkan status; harga lama dinonaktifkan uppercase', () => {
        expect(service).toMatch(/const status = input\.status\.trim\(\)\.toUpperCase\(\)/)
        expect(service).toContain('PRODUCT_STATUS_INVALID')
        expect(service).toContain("status: 'INACTIVE'")
        // Payload produk tidak boleh lagi memakai status mentah dari form.
        expect(service).not.toMatch(/duration_days: input\.durationDays \?\? null,\n\s+status: input\.status,/)
    })

    it('UI mengirim nilai uppercase', () => {
        expect(page).toContain("{ value: 'DRAFT', label: 'Draf' }")
        expect(page).toContain("{ value: 'ARCHIVED', label: 'Diarsipkan' }")
        expect(page).toMatch(/name="status" defaultValue=\{s\(editedProduct\?\.status\) \|\| 'DRAFT'\}/)
    })
})
