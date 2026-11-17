import { createV2AdminClient } from '@/lib/utils/supabase/server'
import type { Json } from '@/types/database.types'

/**
 * Passing grade yang dibaca dari database, bukan dari konstanta TypeScript.
 *
 * ## Kenapa ini ada
 *
 * Sebelumnya ambang kelulusan SKD didefinisikan di LIMA tempat:
 *   1. `lib/constants.ts` → `PASSING_GRADES` (TWK 65, TIU 80, TKP 166)
 *   2. `lib/constants.ts` → `SUBJECTS.*.passing` (salinan kedua di file yang sama)
 *   3. `supabase/schema.sql` → `calculate_session_score` (V1, hardcoded)
 *   4. `exam_sections.config->>'passing_score'` di database  ← SATU-SATUNYA yang
 *      dapat diubah admin lewat panel exam (`app/actions/admin-v2.ts:330`)
 *   5. `lib/leaderboard-passing-grade.ts` → menghitung ulang di TypeScript
 *
 * Akibatnya: halaman ujian menilai dengan angka dari DB, sedangkan leaderboard
 * menilai dengan angka dari konstanta. Begitu admin mengubah passing grade,
 * keduanya bisa berbeda **tanpa ada yang memberi tahu**.
 *
 * Modul ini menjadikan database sebagai sumber otoritatif. Konstanta di
 * `lib/constants.ts` tetap dipertahankan sebagai nilai cadangan bila baris
 * section belum dikonfigurasi.
 *
 * ## Catatan cakupan
 *
 * Hanya dipakai untuk SKD/CPNS. TKA tidak memakai konsep kelulusan — lihat
 * keputusan produk 2026-09-18: panel "Status Kelulusan" TKA dihapus.
 */

const SUBJECT_CODES = ['TWK', 'TIU', 'TKP'] as const
export type PassingGradeSubject = (typeof SUBJECT_CODES)[number]

export type PassingGradeMap = Partial<Record<PassingGradeSubject, number>>

function readNumericConfig(config: Json, keys: string[]): number | null {
    if (!config || Array.isArray(config) || typeof config !== 'object') return null
    for (const key of keys) {
        const value = config[key]
        if (typeof value === 'number' && Number.isFinite(value)) return value
        if (typeof value === 'string' && value.trim() !== '') {
            const parsed = Number(value)
            if (Number.isFinite(parsed)) return parsed
        }
    }
    return null
}

type SectionRow = {
    config: Json
    subjects: { code: string | null } | { code: string | null }[] | null
}

function subjectCodeOf(row: SectionRow): string | null {
    const subject = Array.isArray(row.subjects) ? row.subjects[0] : row.subjects
    const code = subject?.code
    return typeof code === 'string' && code.trim() !== '' ? code.trim().toUpperCase() : null
}

export class PassingGradeRepository {
    /**
     * Ambang kelulusan per mata pelajaran untuk sebuah program+track.
     *
     * Deterministik: baris diurutkan berdasarkan `exam_id` lalu `sort_order`,
     * sehingga nilai pertama yang ditemukan per mata pelajaran selalu sama untuk
     * data yang sama (tidak bergantung urutan kembalian Postgres).
     *
     * Mengembalikan hanya mata pelajaran yang benar-benar dikonfigurasi; pemanggil
     * yang melengkapi sisanya dengan nilai cadangan.
     */
    async getPassingGradesBySubject(input: {
        programCode: string
        trackCode: string
    }): Promise<PassingGradeMap> {
        const admin = await createV2AdminClient()
        const { data, error } = await admin
            .from('exam_sections')
            .select('config, sort_order, exam_id, subjects!inner(code, tracks!inner(code, programs!inner(code)))')
            .eq('subjects.tracks.programs.code', input.programCode)
            .eq('subjects.tracks.code', input.trackCode)
            .order('exam_id', { ascending: true })
            .order('sort_order', { ascending: true })

        if (error) throw error

        return mapPassingGrades((data ?? []) as unknown as SectionRow[])
    }
}

/**
 * Memetakan baris `exam_sections` menjadi ambang kelulusan per mata pelajaran.
 *
 * Dipisahkan dari repository supaya dapat diuji tanpa database. Aturan penting:
 * **yang pertama menang**, sehingga hasilnya tidak berubah bila urutan baris
 * berubah — semua ujian SKD saat ini memakai angka yang sama per mata pelajaran,
 * dan bila suatu saat berbeda, nilai pertama yang deterministik lebih baik
 * daripada nilai yang berubah-ubah antar pemanggilan.
 */
export function mapPassingGrades(rows: SectionRow[]): PassingGradeMap {
    const grades: PassingGradeMap = {}
    for (const raw of rows) {
        const subjectCode = subjectCodeOf(raw)
        if (!subjectCode || !SUBJECT_CODES.includes(subjectCode as PassingGradeSubject)) continue
        const key = subjectCode as PassingGradeSubject
        if (grades[key] !== undefined) continue
        const passingScore = readNumericConfig(raw.config, [
            'passing_score',
            'passingScore',
            'passing_grade',
            'passingGrade',
        ])
        if (passingScore !== null) grades[key] = passingScore
    }
    return grades
}

export const passingGradeRepository = new PassingGradeRepository()
export { SUBJECT_CODES }
