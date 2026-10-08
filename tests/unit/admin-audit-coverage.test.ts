import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { auditEntityId, redactAuditPayload } from '@/lib/audit-log'

/**
 * Cakupan jejak audit admin.
 *
 * Sebelum S9, hanya `app/actions/articles.ts` (dan beberapa RPC alur review)
 * yang menulis `audit_logs`. Seluruh sisanya — termasuk penyesuaian dompet yang
 * bernilai uang, pemberian peran, penghapusan instansi, dan perubahan kunci
 * jawaban — tidak meninggalkan jejak apa pun, padahal `/admin/settings/audit` sudah ada
 * dan menjual dirinya sebagai jejak audit.
 *
 * Test ini mengunci dua hal: setiap modul aksi tulis memanggil helper audit, dan
 * nama aksinya mengikuti konvensi yang bisa difilter di `/admin/settings/audit`.
 */

const repoRoot = resolve(__dirname, '../..')

/** Modul aksi tulis admin, beserta aksi yang MEMANG tidak menulis apa pun. */
const ADMIN_ACTION_MODULES: Array<{ file: string; readOnlyActions?: string[] }> = [
    { file: 'app/actions/admin-v2.ts' },
    { file: 'app/actions/admin-exams.ts' },
    { file: 'app/actions/admin-platform.ts' },
    { file: 'app/actions/admin-directory.ts' },
    { file: 'app/actions/admin-organization.ts' },
    { file: 'app/actions/admin-organization-exam.ts' },
    // `previewParticipantsAction` hanya memeriksa berkas (dry-run) dan sengaja
    // tidak menulis apa pun, jadi tidak ada yang perlu dicatat.
    { file: 'app/actions/admin-participant-import.ts', readOnlyActions: ['previewParticipantsAction'] },
]

function source(relativePath: string) {
    return readFileSync(resolve(repoRoot, relativePath), 'utf8')
}

function exportedActions(text: string) {
    return [...text.matchAll(/^export async function (\w+)/gm)].map((match) => match[1])
}

/**
 * Setiap aksi harus punya satu catatan audit.
 *
 * Dihitung dengan mencocokkan literal `action: 'NAMA'` maupun bentuk bersyarat
 * `action: id ? 'CREATE_X' : 'UPDATE_X'` — bentuk terakhir tetap satu peristiwa
 * audit, hanya namanya ditentukan saat runtime.
 */
function auditEntryCount(text: string) {
    return (text.match(/action: '[A-Z_]+'|action: \w+ \? '/g) ?? []).length
}

describe('jejak audit setiap aksi tulis admin', () => {
    for (const { file, readOnlyActions = [] } of ADMIN_ACTION_MODULES) {
        it(`${file} mencatat jejak untuk setiap aksi yang menulis`, () => {
            const text = source(file)
            const actions = exportedActions(text)
            const auditing = auditEntryCount(text)
            const expected = actions.length - readOnlyActions.length
            expect(actions.length, `${file} harus punya aksi`).toBeGreaterThan(0)
            expect(auditing, `${file}: ${actions.length} aksi, ${auditing} catatan audit`).toBe(expected)
            expect(text).toContain('auditAdminAction')
        })
    }

    it('konvensi nama aksi konsisten: KAPITAL_UNDERSCORE', () => {
        const names = new Set<string>()
        for (const { file } of ADMIN_ACTION_MODULES) {
            for (const match of source(file).matchAll(/action: '([A-Z_]+)'/g)) names.add(match[1])
            for (const match of source(file).matchAll(/action: \w+ \? '([A-Z_]+)' : '([A-Z_]+)'/g)) {
                names.add(match[1])
                names.add(match[2])
            }
        }
        // Angka di awal atau huruf kecil akan memecah filter facet di /admin/settings/audit.
        const offenders = [...names].filter((name) => !/^[A-Z][A-Z_]*$/.test(name))
        expect(offenders).toEqual([])
        expect(names.size, 'harus ada cukup banyak aksi tercatat').toBeGreaterThanOrEqual(30)
    })

    it('aksi review/publish artikel tetap tercatat (tidak regresi)', () => {
        const text = source('app/actions/articles.ts')
        for (const action of ['CREATE_ARTICLE', 'UPDATE_ARTICLE', 'PUBLISH_ARTICLE', 'UNPUBLISH_ARTICLE', 'ARCHIVE_ARTICLE']) {
            expect(text, `articles.ts harus mencatat ${action}`).toContain(action)
        }
    })
})

describe('auditEntityId', () => {
    it('mengembalikan UUID apa adanya', () => {
        const id = '3f2504e0-4f89-11d3-9a0c-0305e82c3301'
        expect(auditEntityId(id)).toBe(id)
        expect(auditEntityId(id.toUpperCase())).toBe(id.toUpperCase())
    })

    /**
     * `entity_id` bertipe uuid. Kode yang mudah dibaca (mis. kode voucher) akan
     * ditolak PostgREST dan — karena audit tidak boleh menggagalkan aksi yang
     * sudah berhasil — peristiwanya hilang tanpa terlihat.
     */
    it('mengembalikan null untuk nilai yang bukan UUID', () => {
        expect(auditEntityId('VOUCHER-RAMADAN')).toBeNull()
        expect(auditEntityId('')).toBeNull()
        expect(auditEntityId(undefined)).toBeNull()
        expect(auditEntityId('12345')).toBeNull()
        expect(auditEntityId('3f2504e0-4f89-11d3-9a0c-0305e82c330')).toBeNull()
    })
})

describe('redactAuditPayload', () => {
    it('menyunting nilai yang memuat kata rahasia', () => {
        const safe = redactAuditPayload({
            invite_token: 'rahasia-panjang',
            token: 'abc',
            password: 'p@ssw0rd',
            access_token: 'jwt',
            refresh_token: 'jwt',
            secret: 'x',
            name: 'Batch A',
        })
        expect(safe).toMatchObject({
            invite_token: '[disunting]',
            token: '[disunting]',
            password: '[disunting]',
            access_token: '[disunting]',
            refresh_token: '[disunting]',
            secret: '[disunting]',
            name: 'Batch A',
        })
    })

    it('tidak mengubah payload tanpa kata rahasia', () => {
        const payload = { status: 'active', amount: 5000 }
        expect(redactAuditPayload(payload)).toEqual(payload)
    })

    it('null tetap null', () => {
        expect(redactAuditPayload(null)).toBeNull()
        expect(redactAuditPayload(undefined)).toBeNull()
    })
})
