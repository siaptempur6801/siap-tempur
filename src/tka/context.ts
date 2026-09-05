import type { ProgramTrackContext } from '@/src/services/catalog-context.service'

export const TKA_LEVELS = ['SD', 'SMP', 'SMA'] as const
export type TkaLevel = (typeof TKA_LEVELS)[number]
export const TKA_AVAILABLE_LEVELS: readonly TkaLevel[] = ['SMP']

export function parseTkaLevel(value: string | null | undefined): TkaLevel | null {
    const normalized = value?.trim().toUpperCase()
    return TKA_LEVELS.includes(normalized as TkaLevel) ? normalized as TkaLevel : null
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
