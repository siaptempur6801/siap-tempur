import { describe, expect, it } from 'vitest'
import {
  isTkaTokenEnabled,
  isTkaTokenAssessment,
  requiresTkaTokenForActiveAssessment,
  tkaLevelFromPathname,
} from '@/src/tka/context'

describe('jenjang TKA dari pathname', () => {
  it('mengenali halaman jenjang dan sub-halamannya', () => {
    expect(tkaLevelFromPathname('/tka/sd')).toBe('SD')
    expect(tkaLevelFromPathname('/tka/smp/')).toBe('SMP')
    expect(tkaLevelFromPathname('/tka/sma/mini-tryout')).toBe('SMA')
    expect(tkaLevelFromPathname('/tka/SMP/profile')).toBe('SMP')
  })

  it('mengembalikan null untuk halaman non-jenjang', () => {
    expect(tkaLevelFromPathname('/tka')).toBeNull()
    expect(tkaLevelFromPathname('/tka/pilih-jenjang')).toBeNull()
    expect(tkaLevelFromPathname('/cpns/dashboard')).toBeNull()
    expect(tkaLevelFromPathname(null)).toBeNull()
    expect(tkaLevelFromPathname(undefined)).toBeNull()
  })
})

describe('cakupan token TKA', () => {
  it('hanya menandai SMP sebagai jenjang dengan token aktif', () => {
    expect(isTkaTokenEnabled('SMP')).toBe(true)
    expect(isTkaTokenEnabled('SD')).toBe(false)
    expect(isTkaTokenEnabled('SMA')).toBe(false)
  })

  it('mewajibkan minimal 1 token hanya untuk sesi langsung yang aktif atau terjadwal', () => {
    expect(requiresTkaTokenForActiveAssessment('SMP', 'FULL_TRYOUT', 'active')).toBe(true)
    expect(requiresTkaTokenForActiveAssessment('SMP', 'DRILL', 'scheduled')).toBe(true)
    expect(requiresTkaTokenForActiveAssessment('SMP', 'DIAGNOSTIC', 'active')).toBe(false)
    expect(requiresTkaTokenForActiveAssessment('SMP', 'MINI_TRYOUT', 'draft')).toBe(false)
    expect(requiresTkaTokenForActiveAssessment('SD', 'FULL_TRYOUT', 'active')).toBe(false)
    expect(isTkaTokenAssessment('SMA', 'FULL_TRYOUT')).toBe(false)
  })
})
