import { beforeEach, describe, expect, it, vi } from 'vitest'

const { trackMock } = vi.hoisted(() => ({
  trackMock: vi.fn(),
}))

vi.mock('@vercel/analytics', () => ({
  track: trackMock,
}))

import { trackProductEvent } from '@/lib/product-analytics'

describe('product analytics', () => {
  beforeEach(() => {
    trackMock.mockReset()
  })

  it('mengirim event landing beserta properti scalar yang tervalidasi', () => {
    trackProductEvent('px_landing_scroll', {
      program: 'cpns',
      surface: 'landing',
      depth: 50,
      section: 'alur',
    })

    expect(trackMock).toHaveBeenCalledTimes(1)
    expect(trackMock).toHaveBeenCalledWith('px_landing_scroll', {
      program: 'cpns',
      surface: 'landing',
      depth: 50,
      section: 'alur',
    })
  })

  it('tidak membiarkan error analytics memblokir flow produk', () => {
    trackMock.mockImplementationOnce(() => {
      throw new Error('analytics unavailable')
    })

    expect(() => {
      trackProductEvent('px_landing_nav', {
        program: 'cpns',
        surface: 'landing',
        section: 'peta-skd',
      })
    }).not.toThrow()
  })
})
