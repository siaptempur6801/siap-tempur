import { describe, expect, it } from 'vitest'
import { mapPassingGrades } from '@/src/repositories/passing-grade.repository'
import { resolvePassingGrades } from '@/lib/leaderboard-passing-grade'

/**
 * Regresi: ambang kelulusan dibaca dari database, dan nilainya tidak berubah-ubah.
 *
 * Latar belakang: ambang kelulusan SKD dulu ada di lima tempat. Halaman ujian
 * menilai dengan `exam_sections.config->>'passing_score'` dari database,
 * sedangkan leaderboard menilai dengan konstanta TypeScript. Begitu admin
 * mengubah passing grade lewat panel exam, keduanya bisa berbeda tanpa ada yang
 * memberi tahu — persis jenis inkonsistensi yang tidak terdeteksi sampai ada
 * peserta memprotes hasilnya.
 */

function section(code: string | null, config: unknown) {
    return { config, subjects: code === null ? null : { code } } as never
}

describe('mapPassingGrades', () => {
    it('membaca passing_score per mata pelajaran', () => {
        const grades = mapPassingGrades([
            section('TWK', { passing_score: 65 }),
            section('TIU', { passing_score: 80 }),
            section('TKP', { passing_score: 166 }),
        ])
        expect(grades).toEqual({ TWK: 65, TIU: 80, TKP: 166 })
    })

    it('menerima semua nama kunci yang dipakai di codebase', () => {
        expect(mapPassingGrades([section('TWK', { passingScore: 70 })])).toEqual({ TWK: 70 })
        expect(mapPassingGrades([section('TWK', { passing_grade: 71 })])).toEqual({ TWK: 71 })
        expect(mapPassingGrades([section('TWK', { passingGrade: 72 })])).toEqual({ TWK: 72 })
    })

    it('menerima angka yang tersimpan sebagai teks', () => {
        expect(mapPassingGrades([section('TIU', { passing_score: '85' })])).toEqual({ TIU: 85 })
    })

    it('DETERMINISTIK: yang pertama menang, bukan yang terakhir', () => {
        // Semua ujian SKD memakai angka sama per mapel. Bila suatu saat berbeda,
        // hasil harus stabil — bukan berubah mengikuti urutan baris dari database.
        const grades = mapPassingGrades([
            section('TWK', { passing_score: 65 }),
            section('TWK', { passing_score: 99 }),
        ])
        expect(grades.TWK).toBe(65)

        const reversed = mapPassingGrades([
            section('TWK', { passing_score: 99 }),
            section('TWK', { passing_score: 65 }),
        ])
        expect(reversed.TWK).toBe(99)
    })

    it('mengabaikan mata pelajaran di luar TWK/TIU/TKP', () => {
        const grades = mapPassingGrades([
            section('MAT', { passing_score: 70 }),
            section('BIN', { passing_score: 70 }),
            section('TWK', { passing_score: 65 }),
        ])
        expect(grades).toEqual({ TWK: 65 })
    })

    it('mengabaikan baris tanpa subject dan tanpa config yang berguna', () => {
        expect(mapPassingGrades([
            section(null, { passing_score: 65 }),
            section('TIU', {}),
            section('TIU', null),
            section('TIU', { seed_version: 4 }),
        ])).toEqual({})
    })

    it('menangani huruf besar/kecil pada kode mata pelajaran', () => {
        expect(mapPassingGrades([section('twk', { passing_score: 65 })])).toEqual({ TWK: 65 })
    })
})

describe('resolvePassingGrades', () => {
    it('memakai nilai database bila tersedia', () => {
        expect(resolvePassingGrades({ TWK: 70, TIU: 85, TKP: 170 })).toEqual({ TWK: 70, TIU: 85, TKP: 170 })
    })

    it('melengkapi mata pelajaran yang belum dikonfigurasi dengan nilai cadangan', () => {
        // Cadangan hanya untuk baris yang belum diisi admin; tidak boleh menimpa
        // nilai database yang sudah ada.
        expect(resolvePassingGrades({ TWK: 70 })).toEqual({ TWK: 70, TIU: 80, TKP: 166 })
    })

    it('memakai nilai cadangan penuh bila database belum dikonfigurasi', () => {
        expect(resolvePassingGrades(undefined)).toEqual({ TWK: 65, TIU: 80, TKP: 166 })
        expect(resolvePassingGrades({})).toEqual({ TWK: 65, TIU: 80, TKP: 166 })
    })
})
