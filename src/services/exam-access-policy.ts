/**
 * Kebijakan akses ujian (murni, tanpa I/O) — satu tempat yang menentukan apakah seorang pengguna
 * boleh memulai sesi, dan apakah entitlement menutup sesi tersebut sehingga token tidak dipotong.
 *
 * Aturan yang berlaku (keputusan produk 2026-09-17):
 *   1. **Entitlement lebih dulu.** Punya entitlement → sesi ditutup entitlement, token tidak dipotong.
 *   2. **Token sebagai fallback.** Exam tanpa entitlement tapi ber-`token_cost` tetap boleh dimainkan;
 *      token dipotong saat sesi dibuat.
 *   3. **FREEMIUM** (mis. Mini Tryout TKA) memberi kuota gratis; setelah habis perlu entitlement.
 *   4. Exam tanpa token dan tanpa entitlement → wajib entitlement (`ENTITLEMENT_REQUIRED`).
 */

type ExamAccessDenyCode = 'ENTITLEMENT_REQUIRED' | 'EXAM_CONFIGURATION_ERROR'

export type ExamAccessInput = {
  accessType: string
  requiredFeatureId: string | null
  tokenCost: number
  attemptLimit: number | null
  usedAttempts: number | null
  hasActiveEntitlement: boolean
}

export type ExamAccessDecision =
  | { allow: true; coveredByEntitlement: boolean }
  | {
      allow: false
      code: ExamAccessDenyCode
      message: string
      details?: Record<string, number>
    }

export function decideExamAccess(input: ExamAccessInput): ExamAccessDecision {
  const accessType = input.accessType.trim().toUpperCase()
  const freemium = accessType === 'FREEMIUM'
  const usesToken = input.tokenCost > 0

  if (freemium) {
    if (!input.requiredFeatureId) {
      return {
        allow: false,
        code: 'EXAM_CONFIGURATION_ERROR',
        message: 'Freemium exam must define required_feature_id',
      }
    }

    if (input.hasActiveEntitlement) return { allow: true, coveredByEntitlement: true }

    const freeAttemptLimit = input.attemptLimit ?? 1
    const used = input.usedAttempts ?? 0
    if (used >= freeAttemptLimit) {
      return {
        allow: false,
        code: 'ENTITLEMENT_REQUIRED',
        message: 'Premium access is required after the free attempt quota is used',
        details: { freeAttemptLimit, usedAttempts: used },
      }
    }

    return { allow: true, coveredByEntitlement: false }
  }

  if (accessType === 'PREMIUM' && !input.requiredFeatureId) {
    return {
      allow: false,
      code: 'EXAM_CONFIGURATION_ERROR',
      message: 'Premium exam must define required_feature_id',
    }
  }

  if (input.requiredFeatureId) {
    if (input.hasActiveEntitlement) return { allow: true, coveredByEntitlement: true }

    // Exam ber-token tanpa entitlement tetap boleh: pengguna membayar dengan token.
    if (!usesToken) {
      return {
        allow: false,
        code: 'ENTITLEMENT_REQUIRED',
        message: 'Active entitlement is required for this exam',
      }
    }
  }

  return { allow: true, coveredByEntitlement: false }
}
