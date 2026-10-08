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

const workspaceService = source('src/services/admin-workspace.service.ts')
const productService = source('src/services/admin-product.service.ts')
const sharedUi = source('components/admin/AdminResourceShared.tsx')
const page = source('components/admin/ProductAvailabilityFields.tsx')

describe('status produk huruf besar', () => {
    it('daftar domain menandai products sebagai uppercase dan filter menyesuaikan diri', () => {
        expect(workspaceService).toMatch(/statusCase: 'upper'/)
        expect(workspaceService).toMatch(/spec\.statusCase === 'upper' \? status\.toUpperCase\(\) : status/)
        expect(workspaceService).not.toContain('countDomainRows')
    })

    it('penulisan produk menormalkan status; harga lama dinonaktifkan uppercase', () => {
        expect(productService).toMatch(/const status = input\.status\.trim\(\)\.toUpperCase\(\)/)
        expect(productService).toContain('PRODUCT_STATUS_INVALID')
        expect(productService).toContain("status: 'INACTIVE'")
        // Payload produk tidak boleh lagi memakai status mentah dari form.
        expect(productService).not.toMatch(/duration_days: input\.durationDays \?\? null,\n\s+status: input\.status,/)
    })

    it('UI mengirim nilai uppercase', () => {
        expect(sharedUi).toContain("{ value: 'DRAFT', label: 'Draft' }")
        expect(sharedUi).toContain("{ value: 'ARCHIVED', label: 'Archived' }")
        expect(page).toContain('name="status" value={state}')
        expect(page).toContain('value="ACTIVE" disabled={!gate?.ready}')
    })
})
