/**
 * Helper untuk filter `.in(...)` Supabase/PostgREST.
 *
 * PostgREST mengirim filter sebagai query string; daftar id yang panjang membuat
 * URL melewati batas header server (±16KB) dan permintaan gagal dengan
 * `HeadersOverflowError (UND_ERR_HEADERS_OVERFLOW)`. Gejalanya di UI: halaman
 * jatuh ke error boundary ("TERJADI GANGGUAN") meski tidak ada bug logika.
 *
 * Selalu batching filter `.in(...)` yang nilainya berasal dari data pengguna
 * atau data yang tumbuh mengikuti jumlah soal/peserta.
 */
export const SUPABASE_IN_FILTER_BATCH_SIZE = 100

/** Pecah array menjadi potongan berukuran `size` (default 100). */
export function chunkValues<T>(values: T[], size = SUPABASE_IN_FILTER_BATCH_SIZE): T[][] {
  const chunks: T[][] = []
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size))
  }
  return chunks
}
