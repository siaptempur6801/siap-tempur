import type { TkaLevel } from '@/src/tka/context'

/**
 * Pilihan jenjang untuk langkah onboarding TKA.
 *
 * Dipisah dari komponen klien agar bisa diuji satuan dan dipakai ulang (mis. di halaman bantuan).
 * Copy mengikuti panduan bahasa produk: menjelaskan bentuk latihan, tanpa klaim hasil.
 */
export type TkaLevelOption = {
    level: TkaLevel
    title: string
    description: string
    highlights: readonly string[]
}

export const TKA_LEVEL_OPTIONS: readonly TkaLevelOption[] = [
    {
        level: 'SD',
        title: 'TKA SD',
        description: 'Bangun fondasi literasi dan numerasi lewat latihan yang terarah sejak jenjang dasar.',
        highlights: ['Latihan literasi & numerasi', 'Diagnostik awal', 'Riwayat dan progres'],
    },
    {
        level: 'SMP',
        title: 'TKA SMP',
        description: 'Perkuat Bahasa Indonesia dan Matematika lewat latihan, tryout, serta pembahasan.',
        highlights: ['Latihan sesuai materi', 'Mini tryout & tryout', 'Pembahasan soal salah'],
    },
    {
        level: 'SMA',
        title: 'TKA SMA',
        description: 'Siapkan kemampuan akademik sesuai jenjang dan mata pelajaran yang tersedia.',
        highlights: ['Latihan sesuai mapel', 'Tryout bertahap', 'Riwayat dan progres'],
    },
]
