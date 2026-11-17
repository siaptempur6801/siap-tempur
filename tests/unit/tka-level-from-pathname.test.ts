import { describe, expect, it } from 'vitest'
import { tkaLevelFromPathname } from '@/src/tka/context'

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
