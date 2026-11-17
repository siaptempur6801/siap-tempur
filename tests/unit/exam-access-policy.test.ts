import { describe, expect, it } from 'vitest'
import { decideExamAccess } from '@/src/services/exam-access-policy'

const base = {
  accessType: 'FREE',
  requiredFeatureId: null,
  tokenCost: 0,
  attemptLimit: null,
  usedAttempts: null,
  hasActiveEntitlement: false,
}

describe('kebijakan akses ujian', () => {
  it('exam gratis tanpa entitlement dan tanpa token selalu boleh', () => {
    const decision = decideExamAccess({ ...base })
    expect(decision).toEqual({ allow: true, coveredByEntitlement: false })
  })

  it('exam ber-token tanpa fitur wajib boleh dan tidak ditutup entitlement', () => {
    const decision = decideExamAccess({ ...base, tokenCost: 1 })
    expect(decision).toEqual({ allow: true, coveredByEntitlement: false })
  })

  it('entitlement menutup sesi ber-token sehingga token tidak dipotong', () => {
    const decision = decideExamAccess({
      ...base,
      tokenCost: 1,
      requiredFeatureId: 'feature-cpns-premium',
      hasActiveEntitlement: true,
    })
    expect(decision).toEqual({ allow: true, coveredByEntitlement: true })
  })

  it('exam ber-token tanpa entitlement tetap boleh (token sebagai fallback)', () => {
    const decision = decideExamAccess({
      ...base,
      tokenCost: 1,
      requiredFeatureId: 'feature-cpns-premium',
    })
    expect(decision).toEqual({ allow: true, coveredByEntitlement: false })
  })

  it('exam premium tanpa token dan tanpa entitlement dikunci', () => {
    const decision = decideExamAccess({
      ...base,
      accessType: 'PREMIUM',
      requiredFeatureId: 'feature-tka-premium',
    })
    expect(decision).toMatchObject({ allow: false, code: 'ENTITLEMENT_REQUIRED' })
  })

  it('exam PREMIUM dengan entitlement boleh dan tidak memotong token', () => {
    const decision = decideExamAccess({
      ...base,
      accessType: 'PREMIUM',
      requiredFeatureId: 'feature-tka-premium',
      hasActiveEntitlement: true,
    })
    expect(decision).toEqual({ allow: true, coveredByEntitlement: true })
  })

  it('FREEMIUM memberi kuota gratis lalu memerlukan entitlement', () => {
    const withinQuota = decideExamAccess({
      ...base,
      accessType: 'FREEMIUM',
      requiredFeatureId: 'tka.smp.mini_tryout.unlimited',
      attemptLimit: 1,
      usedAttempts: 0,
    })
    expect(withinQuota).toEqual({ allow: true, coveredByEntitlement: false })

    const exhausted = decideExamAccess({
      ...base,
      accessType: 'FREEMIUM',
      requiredFeatureId: 'tka.smp.mini_tryout.unlimited',
      attemptLimit: 1,
      usedAttempts: 1,
    })
    expect(exhausted).toMatchObject({ allow: false, code: 'ENTITLEMENT_REQUIRED' })
  })

  it('FREEMIUM dengan entitlement mengabaikan kuota gratis', () => {
    const decision = decideExamAccess({
      ...base,
      accessType: 'FREEMIUM',
      requiredFeatureId: 'tka.smp.mini_tryout.unlimited',
      attemptLimit: 1,
      usedAttempts: 5,
      hasActiveEntitlement: true,
    })
    expect(decision).toEqual({ allow: true, coveredByEntitlement: true })
  })

  it('FREEMIUM tanpa required_feature_id adalah salah konfigurasi', () => {
    const decision = decideExamAccess({ ...base, accessType: 'FREEMIUM' })
    expect(decision).toMatchObject({ allow: false, code: 'EXAM_CONFIGURATION_ERROR' })
  })

  it('PREMIUM tanpa required_feature_id dikunci sebagai salah konfigurasi', () => {
    const decision = decideExamAccess({ ...base, accessType: 'PREMIUM' })
    expect(decision).toMatchObject({ allow: false, code: 'EXAM_CONFIGURATION_ERROR' })
  })
})
