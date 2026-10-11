/**
 * Progres lokal sesi ujian TKA.
 *
 * Server Action menyimpan jawaban membuat Next.js me-render ulang RSC tree, sehingga
 * prop `state` (termasuk array `questions`) datang dengan identitas baru. Tanpa
 * progres lokal, efek sinkronisasi akan mereset posisi peserta ke soal 1 setiap kali
 * jawaban tersimpan. Karena itu posisi soal disimpan per attempt + bagian.
 *
 * Progres lokal bersifat best-effort: database tetap sumber kebenaran untuk jawaban.
 */
export function progressStorageKey(attemptId: string, sectionId: string | null) {
  return `tka-full-progress:${attemptId}:${sectionId ?? 'none'}`
}

/** Batasi indeks tersimpan ke rentang soal yang tersedia. */
export function clampStoredIndex(storedIndex: unknown, totalQuestions: number) {
  if (typeof storedIndex !== 'number' || !Number.isFinite(storedIndex)) return 0
  return Math.max(0, Math.min(Math.trunc(storedIndex), Math.max(totalQuestions - 1, 0)))
}

export function readStoredIndex(key: string, totalQuestions: number) {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return 0
    const parsed = JSON.parse(raw) as { index?: unknown }
    return clampStoredIndex(parsed?.index, totalQuestions)
  } catch {
    return 0
  }
}

export function writeStoredIndex(key: string, index: number) {
  try {
    const raw = window.localStorage.getItem(key)
    const parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
    window.localStorage.setItem(key, JSON.stringify({ ...parsed, index }))
  } catch {
    // Abaikan kuota penyimpanan penuh / mode privat.
  }
}
