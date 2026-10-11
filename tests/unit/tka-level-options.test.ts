import { describe, expect, it } from 'vitest'
import { TKA_LEVEL_OPTIONS } from '@/components/onboarding/tka-level-options'
import { TKA_LEVELS, isTkaLevelAvailable } from '@/src/tka/context'

describe('pilihan jenjang TKA di onboarding', () => {
  it('memuat ketiga jenjang, berurutan SD → SMP → SMA', () => {
    expect(TKA_LEVEL_OPTIONS.map((option) => option.level)).toEqual([...TKA_LEVELS])
  })

  it('setiap jenjang punya judul, deskripsi, dan highlight yang siap tampil', () => {
    for (const option of TKA_LEVEL_OPTIONS) {
      expect(option.title).toContain(option.level)
      expect(option.description.length).toBeGreaterThan(20)
      expect(option.highlights.length).toBeGreaterThanOrEqual(3)
    }
  })

  it('jenjang yang bisa dipilih saat ini tersedia di konteks TKA', () => {
    for (const option of TKA_LEVEL_OPTIONS) {
      expect(isTkaLevelAvailable(option.level)).toBe(true)
    }
  })
})
