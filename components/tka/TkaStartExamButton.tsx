'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Play } from 'lucide-react'
import { toast } from 'sonner'
import { startTkaExam } from '@/app/actions/tka-practice'
import { trackProductEvent } from '@/lib/product-analytics'
import { LoadingSpinner } from '@/components/ui/LoadingState'
import TokenUsageConfirmModal from '@/components/practice/TokenUsageConfirmModal'
import { acquireSingleFlightLock, releaseSingleFlightLock } from '@/lib/single-flight-lock'
import type { TkaLevel } from '@/src/tka/context'

export default function TkaStartExamButton({
  level,
  examSlug,
  examTitle,
  disabledReason,
  activeAttemptId,
  tokenBalance,
  tokenCost = 1,
}: {
  level: TkaLevel
  examSlug: string
  examTitle: string
  disabledReason?: string | null
  activeAttemptId?: string | null
  tokenBalance: number
  tokenCost?: number
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showTokenConfirm, setShowTokenConfirm] = useState(false)
  const startLockRef = useRef(false)
  const hasActiveAttempt = Boolean(activeAttemptId)
  const isDrill = examSlug.toLowerCase().includes('drill')
  const practiceType = isDrill
    ? 'Latihan Fokus'
    : examSlug.toLowerCase().includes('mini')
      ? 'Mini Tryout'
      : 'Tryout'

  const start = async () => {
    if ((!hasActiveAttempt && disabledReason) || !acquireSingleFlightLock(startLockRef)) return
    let isNavigating = false
    setLoading(true)
    setErrorMessage(null)
    try {
      if (activeAttemptId) {
        router.push(`/tka/${level.toLowerCase()}/tryout/${activeAttemptId}`)
        isNavigating = true
        return
      }

      const result = await startTkaExam(level, examSlug)
      if (result?.error) {
        setErrorMessage(
          result.error.includes('INSUFFICIENT_TOKEN_BALANCE')
            ? 'Token TKA kamu belum cukup. Beli token untuk memulai sesi baru.'
            : result.error,
        )
        return
      }
      if (result?.success && result.sessionId) {
        trackProductEvent('px_exam_start', {
          program: level === 'SD' ? 'tka_sd' : level === 'SMP' ? 'tka_smp' : 'tka_sma',
          surface: 'exam',
          mode: isDrill
            ? 'latihan_fokus'
            : examSlug.includes('full')
              ? 'full_tryout'
              : 'mini_tryout',
        })
        toast.success(
          result.resumed
            ? `Melanjutkan ${practiceType.toLowerCase()} tersimpan.`
            : `${practiceType} TKA dimulai!`,
        )
        router.push(`/tka/${level.toLowerCase()}/tryout/${result.sessionId}`)
        isNavigating = true
      }
    } catch {
      setErrorMessage('Gagal memulai sesi TKA.')
    } finally {
      if (!isNavigating) {
        releaseSingleFlightLock(startLockRef)
        setLoading(false)
      }
    }
  }

  const handleClick = () => {
    if (hasActiveAttempt) {
      void start()
      return
    }
    if (tokenBalance < tokenCost) {
      toast.error('Token TKA belum cukup', {
        description: `Kamu membutuhkan ${tokenCost} token untuk sesi baru.`,
        action: {
          label: 'Beli Token',
          onClick: () => router.push(`/tka/${level.toLowerCase()}/beli-token`),
        },
      })
      return
    }
    setShowTokenConfirm(true)
  }

  const label = loading
    ? 'Menyiapkan...'
    : hasActiveAttempt
      ? `Lanjutkan ${practiceType}`
      : disabledReason || `Mulai ${practiceType} · ${tokenCost} token`

  return (
    <div className="mt-5">
      <button
        type="button"
        onClick={handleClick}
        disabled={(!hasActiveAttempt && Boolean(disabledReason)) || loading}
        title={
          hasActiveAttempt
            ? `Lanjutkan ${practiceType.toLowerCase()} yang sedang berjalan`
            : disabledReason || `Mulai ${practiceType.toLowerCase()} dengan ${tokenCost} token`
        }
        aria-describedby={errorMessage ? `${examSlug}-start-error` : undefined}
        className="st-focus inline-flex min-h-11 w-full min-w-0 items-center justify-center gap-2 overflow-hidden rounded-lg bg-blue-600 px-4 py-3 text-center text-sm font-black leading-tight text-white shadow-none transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-700 disabled:shadow-none"
      >
        {loading ? (
          <LoadingSpinner label="Menyiapkan sesi TKA" size="sm" />
        ) : (
          <Play size={17} className="shrink-0" aria-hidden="true" />
        )}
        <span className="min-w-0 whitespace-normal break-words">{label}</span>
      </button>
      {errorMessage && (
        <p
          id={`${examSlug}-start-error`}
          role="alert"
          className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-black text-red-700"
        >
          {errorMessage}
        </p>
      )}
      <TokenUsageConfirmModal
        isOpen={showTokenConfirm}
        title={`Mulai ${examTitle}`}
        description={`Sesi baru memakai ${tokenCost} token TKA. Melanjutkan sesi aktif tidak memakai token tambahan.`}
        details={[
          { label: 'Jenis sesi', value: practiceType },
          { label: 'Biaya sesi baru', value: `${tokenCost} token` },
        ]}
        quota={tokenBalance}
        tokenCost={tokenCost}
        confirmLabel={`Gunakan ${tokenCost} Token TKA`}
        isLoading={loading}
        onConfirm={() => {
          setShowTokenConfirm(false)
          void start()
        }}
        onCancel={() => setShowTokenConfirm(false)}
      />
    </div>
  )
}
