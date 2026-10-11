/**
 * Bulk import peserta — kontrak yang dipakai BERSAMA server dan browser.
 *
 * ## Kenapa modul terpisah
 *
 * Panel import adalah client component, sedangkan service-nya mengimpor
 * `lib/utils/supabase/server.ts` yang server-only. Ketika panel itu mengimpor
 * tipe dan konstanta langsung dari service, bundler ikut menarik modul server ke
 * bundle browser dan build gagal:
 *
 *     ./lib/utils/supabase/server.ts [Client Component Browser]
 *
 * TypeScript tidak dapat menangkap ini karena tipe memang dihapus saat kompilasi
 * — yang tersisa adalah `import` nilai (konstanta), dan itulah yang menyeret
 * seluruh rantai server. Jadi kontrak bersama ini diletakkan di modul murni tanpa
 * satu pun import server, dan kedua sisi mengimpornya dari sini.
 */

export type ImportRow = {
  /** Nomor baris di berkas asli, supaya kesalahan menunjuk baris yang benar. */
  line: number
  participant_code?: string
  full_name?: string
  email?: string
  phone?: string
  nik?: string
  unit?: string
  jabatan?: string
  notes?: string
}

type ImportRowStatus = 'ok' | 'duplicate' | 'error'

type ImportRowResult = {
  line: number
  status: ImportRowStatus
  participant_code: string
  full_name: string
  email: string
  phone: string
  errors: string[]
}

export type ImportPreview = {
  dryRun: boolean
  total: number
  ok: number
  duplicate: number
  error: number
  imported: number
  rows: ImportRowResult[]
}

/** Kolom baku bulk import (PRD §7.2.1 "template Excel atau CSV baku"). */
export const PARTICIPANT_IMPORT_COLUMNS = [
  'participant_code',
  'full_name',
  'email',
  'phone',
  'nik',
  'unit',
  'jabatan',
  'notes',
] as const

/** Kolom yang WAJIB ada di header berkas; sisanya opsional. */
export const PARTICIPANT_IMPORT_REQUIRED_COLUMNS = ['full_name'] as const

export const PARTICIPANT_IMPORT_COLUMN_LABELS: Record<string, string> = {
  participant_code: 'Kode peserta (opsional — dibuat otomatis bila kosong)',
  full_name: 'Nama lengkap (wajib)',
  email: 'Email (untuk mencocokkan dengan akun)',
  phone: 'Nomor HP',
  nik: 'NIK',
  unit: 'Unit / bagian',
  jabatan: 'Jabatan',
  notes: 'Catatan',
}

/** Contoh baris untuk template, supaya bentuk berkasnya tidak perlu ditebak. */
export const PARTICIPANT_IMPORT_SAMPLE: Record<string, string> = {
  participant_code: '',
  full_name: 'Contoh Nama Peserta',
  email: 'peserta@contoh.id',
  phone: '081234567890',
  nik: '',
  unit: 'Bidang Kepegawaian',
  jabatan: 'Analis SDM',
  notes: '',
}

export const IMPORT_STATUS_LABELS: Record<string, string> = {
  ok: 'Siap diimpor',
  duplicate: 'Sudah ada',
  error: 'Perlu diperbaiki',
}
