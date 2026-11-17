/**
 * Soal penampung riwayat attempt lama.
 *
 * Saat cutover Schema V2 (2026-08-31) dua soal `LEGACY-HISTORY-SKD-TIU/TWK`
 * dibuat sebagai `legacy_history_placeholder`: keduanya tidak punya opsi/kunci
 * karena bukan konten asli, tetapi direferensikan ratusan baris
 * `attempt_questions` lama sehingga tidak boleh dihapus.
 *
 * Karena bentuknya seperti draft biasa, daftar admin menandainya secara eksplisit
 * dan mematikan editnya — supaya tidak terlihat seperti konten yang belum lengkap.
 */
const LEGACY_HISTORY_PLACEHOLDER = 'legacy_history_placeholder'

export function isLegacyHistoryPlaceholder(value: unknown): boolean {
  return String(value ?? '') === LEGACY_HISTORY_PLACEHOLDER
}
