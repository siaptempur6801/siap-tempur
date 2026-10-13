'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Dumbbell, Ticket } from 'lucide-react'
import { toast } from 'sonner'
import { startTkaDrill } from '@/app/actions/tka-practice'
import { trackProductEvent } from '@/lib/product-analytics'
import { LoadingSpinner } from '@/components/ui/LoadingState'
import { acquireSingleFlightLock, releaseSingleFlightLock } from '@/lib/single-flight-lock'
import TokenUsageConfirmModal from '@/components/practice/TokenUsageConfirmModal'

export default function TkaStartDrillButton({
  level,
  subjectCode,
  knowledgeNodeName,
  disabledReason,
  compact = false,
  tokenBalance,
}: {
  level: string
  subjectCode: string
  knowledgeNodeName: string
  disabledReason?: string | null
  compact?: boolean
  tokenBalance: number
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showTokenConfirm, setShowTokenConfirm] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const startLockRef = useRef(false)

  const start = async () => {
    if (disabledReason || !acquireSingleFlightLock(startLockRef)) return
    let isNavigating = false
    setLoading(true)
    setErrorMessage(null)
    try {
      const result = await startTkaDrill(level, subjectCode, knowledgeNodeName)
      if (result?.error) {
        setErrorMessage(result.error)
        return
      }
      if (result?.success && result.sessionId) {
        trackProductEvent('px_exam_start', {
          program: 'tka_smp',
          surface: 'diagnostic',
          mode: 'latihan_fokus',
          cta: 'diagnostic_recommendation_drill',
        })
        toast.success(
          result.resumed
            ? 'Melanjutkan latihan fokus tersimpan.'
            : `Latihan ${knowledgeNodeName} dimulai!`,
        )
        router.push(`/tka/${level.toLowerCase()}/tryout/${result.sessionId}`)
        isNavigating = true
      }
    } catch {
      setErrorMessage('Gagal memulai latihan fokus.')
    } finally {
      if (!isNavigating) {
        releaseSingleFlightLock(startLockRef)
        setLoading(false)
      }
    }
  }

  const handleClick = () => {
    if (disabledReason || loading) return
    if (tokenBalance < 1) {
      toast.error('Token TKA belum cukup', {
        description: 'Kamu membutuhkan 1 token untuk memulai sesi baru.',
        action: {
          label: 'Beli Token',
          onClick: () => router.push(`/tka/${level.toLowerCase()}/beli-token`),
        },
      })
      return
    }
    setShowTokenConfirm(true)
  }

  const needsTokens = !disabledReason && tokenBalance < 1
  const actionClassName =
    'st-focus inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground'

  return (
    <div className={compact ? 'm-0 w-full' : 'mt-4'}>
      {needsTokens ? (
        <Link href={`/tka/${level.toLowerCase()}/beli-token`} className={actionClassName}>
          <Ticket size={16} aria-hidden="true" />
          Beli Token untuk Mulai
        </Link>
      ) : (
        <button
          type="button"
          data-testid="diagnostic-start-drill"
          onClick={handleClick}
          disabled={Boolean(disabledReason) || loading}
          aria-label={`Latih topik ${knowledgeNodeName}`}
          aria-describedby={
            errorMessage ? `drill-${subjectCode}-${knowledgeNodeName}-error` : undefined
          }
          className={actionClassName}
        >
          {loading ? (
            <LoadingSpinner label="Menyiapkan latihan" size="sm" />
          ) : (
            <Dumbbell size={16} aria-hidden="true" />
          )}
          {loading
            ? 'Menyiapkan...'
            : compact
              ? 'Latih Topik · 1 token'
              : 'Mulai Latihan · 1 token'}
        </button>
      )}
      {(!compact || needsTokens) && (
        <p className="mt-2 text-center text-sm leading-relaxed font-medium text-slate-600">
          {needsTokens ? 'Butuh 1 token untuk sesi baru.' : '10 soal · sekitar 15 menit'}
        </p>
      )}
      {needsTokens && !compact && (
        <Link
          href={`/tka/${level.toLowerCase()}/riwayat`}
          className="st-focus mt-1 flex min-h-11 items-center justify-center rounded-lg px-2 text-center text-sm font-semibold text-primary underline underline-offset-4"
        >
          Lanjutkan sesi dari Riwayat
        </Link>
      )}
      {errorMessage && (
        <p
          id={`drill-${subjectCode}-${knowledgeNodeName}-error`}
          role="alert"
          className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700"
        >
          {errorMessage}
        </p>
      )}
      <TokenUsageConfirmModal
        isOpen={showTokenConfirm}
        heading="Gunakan token untuk sesi ini?"
        title={`Latihan ${knowledgeNodeName}`}
        description="Sesi baru memakai 1 token TKA. Jika ada sesi yang masih berjalan, sesi itu dilanjutkan tanpa potongan token tambahan."
        details={[
          {
            label: 'Mata pelajaran',
            value:
              subjectCode === 'BIN'
                ? 'Bahasa Indonesia'
                : subjectCode === 'MAT'
                  ? 'Matematika'
                  : subjectCode,
          },
          { label: 'Format', value: '10 soal fokus' },
          { label: 'Biaya sesi baru', value: '1 token' },
        ]}
        quota={tokenBalance}
        tokenCost={1}
        confirmLabel="Gunakan 1 Token TKA"
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
