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
  it('exam gratis tanpa pass dan tanpa token selalu boleh', () => {
    const decision = decideExamAccess({ ...base })
    expect(decision).toEqual({ allow: true, coveredByPass: false })
  })

  it('exam ber-token tanpa fitur wajib boleh dan tidak ditutup pass', () => {
    const decision = decideExamAccess({ ...base, tokenCost: 1 })
    expect(decision).toEqual({ allow: true, coveredByPass: false })
  })

  it('pass menutup sesi ber-token sehingga token tidak dipotong', () => {
    const decision = decideExamAccess({
      ...base,
      tokenCost: 1,
      requiredFeatureId: 'cpns.full_tryout.regular',
      hasActiveEntitlement: true,
    })
    expect(decision).toEqual({ allow: true, coveredByPass: true })
  })

  it('exam ber-token tanpa pass tetap boleh (token sebagai fallback)', () => {
    const decision = decideExamAccess({
      ...base,
      tokenCost: 1,
      requiredFeatureId: 'cpns.full_tryout.regular',
    })
    expect(decision).toEqual({ allow: true, coveredByPass: false })
  })

  it('exam tanpa token dan tanpa pass wajib pass', () => {
    const decision = decideExamAccess({
      ...base,
      accessType: 'PREMIUM',
      requiredFeatureId: 'tka.smp.full_tryout.regular',
    })
    expect(decision).toMatchObject({ allow: false, code: 'ENTITLEMENT_REQUIRED' })
  })

  it('exam PREMIUM dengan pass boleh dan ditutup pass', () => {
    const decision = decideExamAccess({
      ...base,
      accessType: 'PREMIUM',
      requiredFeatureId: 'tka.smp.full_tryout.regular',
      hasActiveEntitlement: true,
    })
    expect(decision).toEqual({ allow: true, coveredByPass: true })
  })

  it('FREEMIUM memberi kuota gratis lalu wajib pass', () => {
    const withinQuota = decideExamAccess({
      ...base,
      accessType: 'FREEMIUM',
      requiredFeatureId: 'tka.smp.mini_tryout.unlimited',
      attemptLimit: 1,
      usedAttempts: 0,
    })
    expect(withinQuota).toEqual({ allow: true, coveredByPass: false })

    const exhausted = decideExamAccess({
      ...base,
      accessType: 'FREEMIUM',
      requiredFeatureId: 'tka.smp.mini_tryout.unlimited',
      attemptLimit: 1,
      usedAttempts: 1,
    })
    expect(exhausted).toMatchObject({ allow: false, code: 'ENTITLEMENT_REQUIRED' })
  })

  it('FREEMIUM dengan pass mengabaikan kuota gratis', () => {
    const decision = decideExamAccess({
      ...base,
      accessType: 'FREEMIUM',
      requiredFeatureId: 'tka.smp.mini_tryout.unlimited',
      attemptLimit: 1,
      usedAttempts: 5,
      hasActiveEntitlement: true,
    })
    expect(decision).toEqual({ allow: true, coveredByPass: true })
  })

  it('FREEMIUM tanpa required_feature_id adalah salah konfigurasi', () => {
    const decision = decideExamAccess({ ...base, accessType: 'FREEMIUM' })
    expect(decision).toMatchObject({ allow: false, code: 'EXAM_CONFIGURATION_ERROR' })
  })
})
