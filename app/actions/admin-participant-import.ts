'use server'

import { revalidatePath } from 'next/cache'
import { validateCsrf } from '@/lib/csrf'
import { authorizationService, AuthorizationError } from '@/src/services/authorization.service'
import { PERMISSIONS } from '@/src/auth/permissions'
import { parseCsvRecords } from '@/lib/csv'
import {
    PARTICIPANT_IMPORT_REQUIRED_COLUMNS,
    type ImportPreview,
    type ImportRow,
} from '@/lib/participant-import'
import { participantImportService } from '@/src/services/organization.service'
import { auditAdminAction } from '@/lib/audit-log'
import { logger } from '@/lib/logger'

/**
 * Bulk import peserta (PRD §7.2.1).
 *
 * ## Kenapa aksi ini MENGEMBALIKAN nilai, bukan `redirect`
 *
 * Aksi admin lain di repo ini berakhir dengan `redirect` + pesan flash. Import
 * berbeda: hasilnya adalah laporan PER BARIS yang harus dibaca dan diperbaiki
 * pengguna sebelum mengulang. Menaruh laporan itu di query string tidak masuk
 * akal, dan menyimpannya di server berarti menyimpan keadaan sementara yang
 * kedaluwarsa.
 *
 * Jadi aksi ini mengembalikan hasilnya langsung, dan panel importnya adalah
 * client component yang memakainya lewat `useActionState`.
 *
 * ## Alur dua langkah
 *
 * Tombol "Periksa" dan tombol "Impor" memanggil aksi yang SAMA; pembedanya hanya
 * `mode`. Keduanya melewati RPC yang sama dengan `p_dry_run` yang berbeda,
 * sehingga hasil pemeriksaan tidak mungkin berbeda dari hasil impor.
 */

export type ImportActionResult =
    | { status: 'idle' }
    | { status: 'error'; message: string }
    | { status: 'preview'; preview: ImportPreview; batchId: string }
    | { status: 'imported'; preview: ImportPreview; batchId: string }

const MAX_CSV_BYTES = 2_000_000

function text(form: FormData, key: string) {
    const value = form.get(key)
    return typeof value === 'string' ? value.trim() : ''
}

function friendlyError(error: unknown) {
    const message = error instanceof Error ? error.message : 'IMPORT_FAILED'
    const known: Record<string, string> = {
        'Authentication required': 'Sesi tidak valid. Silakan masuk ulang.',
        'Organization manage permission required': 'Akun ini tidak punya permission mengelola instansi.',
        'Batch not found': 'Batch tidak ditemukan.',
        'Organization is inactive': 'Instansi ini sedang nonaktif.',
        'There is nothing to import': 'Berkas tidak berisi baris data.',
        'Import rows must be an array': 'Berkas tidak dapat dibaca.',
    }
    if (message.startsWith('A single import is limited to')) {
        return 'Satu kali impor dibatasi 2000 baris. Pecah berkasnya menjadi beberapa bagian.'
    }
    return known[message] || message
}

/**
 * Baris CSV menjadi `ImportRow`.
 *
 * `line` diisi nomor baris di berkas ASLI (termasuk header) supaya pesan
 * kesalahan menunjuk baris yang benar-benar dilihat pengguna di Excel — bukan
 * indeks relatif yang membuatnya menebak-nebak.
 */
function rowsFromCsv(csv: string): { rows: ImportRow[]; missing: string[] } {
    const { records, headers } = parseCsvRecords(csv)
    const missing = PARTICIPANT_IMPORT_REQUIRED_COLUMNS.filter((column) => !headers.includes(column))

    const rows: ImportRow[] = records.map((record) => ({
        line: record.line,
        participant_code: record.values.participant_code ?? '',
        full_name: record.values.full_name ?? '',
        email: record.values.email ?? '',
        phone: record.values.phone ?? '',
        nik: record.values.nik ?? '',
        unit: record.values.unit ?? '',
        jabatan: record.values.jabatan ?? '',
        notes: record.values.notes ?? '',
    }))

    return { rows, missing }
}

/**
 * Dua aksi terpisah, BUKAN satu aksi dengan field `mode`.
 *
 * Versi pertama memakai satu aksi dan membaca `mode` dari `name`/`value` tombol
 * submit. Itu gagal dengan cara yang paling berbahaya: menekan "Impor sekarang"
 * tetap mengirim `mode=preview`, sehingga impor tidak pernah berjalan dan panel
 * hanya menampilkan ulang hasil pemeriksaan — TANPA galat apa pun, jadi tampak
 * seperti tombolnya rusak. Mengisi field `mode` lewat DOM di `onClick` juga tidak
 * menolong.
 *
 * Dengan dua action yang masing-masing sudah membawa modenya sendiri, tidak ada
 * yang perlu ditebak dari sisi klien.
 */
async function runImport(form: FormData, mode: 'preview' | 'commit'): Promise<ImportActionResult> {
    try {
        await validateCsrf()

        const authorization = await authorizationService.requireAuthenticated()
        if (!authorization.permissions.includes(PERMISSIONS.ORGANIZATION_MANAGE)) {
            throw new AuthorizationError('Missing permission: organization.manage')
        }

        const batchId = text(form, 'batch_id')
        const csv = typeof form.get('csv') === 'string' ? String(form.get('csv')) : ''

        if (!batchId) return { status: 'error', message: 'Batch tidak dikenali.' }
        if (!csv.trim()) return { status: 'error', message: 'Tempelkan isi berkas CSV atau pilih berkas terlebih dahulu.' }
        if (csv.length > MAX_CSV_BYTES) {
            return { status: 'error', message: `Berkas terlalu besar (maks ${Math.round(MAX_CSV_BYTES / 1000)} KB). Pecah menjadi beberapa bagian.` }
        }

        const { rows, missing } = rowsFromCsv(csv)

        if (missing.length > 0) {
            return {
                status: 'error',
                message: `Header berkas tidak lengkap. Kolom wajib yang belum ada: ${missing.join(', ')}.`,
            }
        }
        if (rows.length === 0) {
            return { status: 'error', message: 'Berkas hanya berisi header tanpa baris data.' }
        }

        const preview = await participantImportService.import(batchId, rows, mode === 'preview')

        if (mode === 'commit') {
            revalidatePath('/admin/organizations')
            logger.info('[importParticipantsAction] impor selesai', {
                batchId,
                imported: preview.imported,
                duplicate: preview.duplicate,
                error: preview.error,
            })
            // Satu peristiwa per impor, bukan satu per baris: mengimpor 2.000
            // peserta tidak boleh menghasilkan 2.000 baris audit yang menenggelamkan
            // peristiwa lain di `/admin/settings/audit`.
            await auditAdminAction({
                actorId: authorization.userId,
                action: 'IMPORT_PARTICIPANTS',
                entityType: 'organization_batch',
                entityId: batchId,
                label: `${preview.imported} peserta`,
                after: {
                    imported: preview.imported,
                    duplicate: preview.duplicate,
                    error: preview.error,
                },
            })
            return { status: 'imported', preview, batchId }
        }

        return { status: 'preview', preview, batchId }
    } catch (error) {
        logger.warn('[importParticipantsAction] gagal', {
            error: error instanceof Error ? error.message : String(error),
        })
        return { status: 'error', message: friendlyError(error) }
    }
}

/** Periksa berkas tanpa menulis apa pun. */
export async function previewParticipantsAction(
    _previous: ImportActionResult,
    form: FormData,
): Promise<ImportActionResult> {
    return runImport(form, 'preview')
}

/** Tulis baris yang sah. */
export async function commitParticipantsAction(
    _previous: ImportActionResult,
    form: FormData,
): Promise<ImportActionResult> {
    return runImport(form, 'commit')
}
