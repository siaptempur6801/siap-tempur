import type { ProgramTrackContext } from '@/src/services/catalog-context.service'

export const TKA_LEVELS = ['SD', 'SMP', 'SMA'] as const
export type TkaLevel = (typeof TKA_LEVELS)[number]
// Keputusan produk 2026-09-17: SD & SMA diaktifkan (SMP sudah aktif sebelumnya).
// Catatan konten: track SD punya 6 exam; track SMA belum punya exam sehingga tampil empty state.
export const TKA_AVAILABLE_LEVELS: readonly TkaLevel[] = ['SD', 'SMP', 'SMA']
const TKA_TOKEN_ENABLED_LEVELS: readonly TkaLevel[] = ['SMP']
const TKA_TOKEN_ASSESSMENT_TYPES = ['FULL_TRYOUT', 'MINI_TRYOUT', 'DRILL']

export function parseTkaLevel(value: string | null | undefined): TkaLevel | null {
  const normalized = value?.trim().toUpperCase()
  return TKA_LEVELS.includes(normalized as TkaLevel) ? (normalized as TkaLevel) : null
}

export function tkaContext(level: TkaLevel): ProgramTrackContext {
  return { programCode: 'TKA', trackCode: level }
}

export function tkaLevelPath(level: TkaLevel) {
  return `/tka/${level.toLowerCase()}`
}

export function isTkaLevelAvailable(level: TkaLevel) {
  return TKA_AVAILABLE_LEVELS.includes(level)
}

export function isTkaTokenEnabled(level: TkaLevel) {
  return TKA_TOKEN_ENABLED_LEVELS.includes(level)
}

export function isTkaTokenAssessment(level: TkaLevel, examTypeCode: string) {
  return isTkaTokenEnabled(level) && TKA_TOKEN_ASSESSMENT_TYPES.includes(examTypeCode.toUpperCase())
}

export function requiresTkaTokenForActiveAssessment(
  level: TkaLevel,
  examTypeCode: string,
  status: string,
) {
  return (
    isTkaTokenAssessment(level, examTypeCode) &&
    ['ACTIVE', 'SCHEDULED'].includes(status.toUpperCase())
  )
}

/**
 * Ambil jenjang dari pathname `/tka/<jenjang>` atau `/tka/<jenjang>/...`.
 * Dipakai komponen yang perlu menampilkan jenjang tanpa menerima prop (mis. komponen klien).
 */
export function tkaLevelFromPathname(pathname: string | null | undefined): TkaLevel | null {
  if (!pathname) return null
  const match = pathname.match(/^\/tka\/([^/]+)(?:\/|$)/i)
  return match ? parseTkaLevel(match[1]) : null
}
