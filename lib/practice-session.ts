import type { MiniTryoutType } from './constants'

export const DRILLING_MATERI_QUESTION_COUNT = 30

export type DashboardActiveSessionKind = 'full-tryout' | 'mini-tryout' | 'drilling-materi' | 'event'

export function getDrillingMaterialKey(type: MiniTryoutType, subCategory: string) {
  return `${type}::${subCategory}`
}
