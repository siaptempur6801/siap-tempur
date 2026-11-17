'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import { ArrowRight, Brain, Clock3, ShieldCheck, Ticket, UserCheck } from 'lucide-react'
import { toast } from 'sonner'
import { startMiniTryout } from '@/app/actions/practice'
import TokenUsageConfirmModal from '@/components/practice/TokenUsageConfirmModal'
import { PageAnimateContainer, PageAnimateItem } from '@/components/ui/PageAnimate'
import PageHeader from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingState'
import { MINI_TRYOUT_PRODUCTS, TRYOUT_TOKEN_COST, type MiniTryoutType } from '@/lib/constants'
import {
  getPracticeSessionStorageKey,
  getResumeQuestionNumberFromStoredProgress,
} from '@/lib/practice-progress'
import { cn } from '@/lib/utils'

export type MiniTryoutActiveSession = {
  sessionId: string
  startedAt: string | null
  resumeQuestionNumber: number
  answeredQuestions: number
}

type MiniTryoutActiveSessions = Partial<Record<MiniTryoutType, MiniTryoutActiveSession>>

type MiniTryoutClientProps = {
  activeSessionsByType: MiniTryoutActiveSessions
  quota: number
}

type ProductStyle = {
  Icon: LucideIcon
  badgeClassName: string
}

const PRODUCT_STYLES: Record<MiniTryoutType, ProductStyle> = {
  TWK: {
    Icon: ShieldCheck,
    badgeClassName: 'bg-red-50 text-red-700',
  },
  TIU: {
    Icon: Brain,
    badgeClassName: 'bg-amber-50 text-amber-800',
  },
  TKP: {
    Icon: UserCheck,
    badgeClassName: 'bg-blue-50 text-blue-700',
  },
}

function formatStartedAt(value: string | null) {
  if (!value) return null

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(value))
}

function getActiveSessionDetails(activeSession: MiniTryoutActiveSession | undefined) {
  if (!activeSession) return null

  const items = [`Soal ${activeSession.resumeQuestionNumber}`]
  if (activeSession.answeredQuestions > 0) items.push(`${activeSession.answeredQuestions} terjawab`)

  const startedAt = formatStartedAt(activeSession.startedAt)
  if (startedAt) items.push(startedAt)

  return items.join(' • ')
}

export default function MiniTryoutClient({ activeSessionsByType, quota }: MiniTryoutClientProps) {
  const router = useRouter()
  const [loadingType, setLoadingType] = useState<MiniTryoutType | null>(null)
  const [confirmType, setConfirmType] = useState<MiniTryoutType | null>(null)
  const [hydratedActiveSessionsByType, setHydratedActiveSessionsByType] =
    useState(activeSessionsByType)
  const startLockRef = useRef<MiniTryoutType | null>(null)
  const hasToken = quota >= TRYOUT_TOKEN_COST

  const hydrateActiveSessionsFromLocalStorage = useCallback(() => {
    if (typeof window === 'undefined') return

    const nextActiveSessions = { ...activeSessionsByType }

    MINI_TRYOUT_PRODUCTS.forEach((product) => {
      const activeSession = activeSessionsByType[product.type]
      if (!activeSession) return

      const storedResumeQuestionNumber = getResumeQuestionNumberFromStoredProgress(
        window.localStorage.getItem(getPracticeSessionStorageKey(activeSession.sessionId)),
      )

      if (!storedResumeQuestionNumber) return

      nextActiveSessions[product.type] = {
        ...activeSession,
        resumeQuestionNumber: Math.max(
          activeSession.resumeQuestionNumber,
          storedResumeQuestionNumber,
        ),
      }
    })

    setHydratedActiveSessionsByType(nextActiveSessions)
  }, [activeSessionsByType])

  useEffect(() => {
    setHydratedActiveSessionsByType(activeSessionsByType)
    hydrateActiveSessionsFromLocalStorage()
  }, [activeSessionsByType, hydrateActiveSessionsFromLocalStorage])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleVisibilityChange = () => {
      if (!document.hidden) hydrateActiveSessionsFromLocalStorage()
    }

    window.addEventListener('focus', hydrateActiveSessionsFromLocalStorage)
    window.addEventListener('pageshow', hydrateActiveSessionsFromLocalStorage)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('focus', hydrateActiveSessionsFromLocalStorage)
      window.removeEventListener('pageshow', hydrateActiveSessionsFromLocalStorage)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [hydrateActiveSessionsFromLocalStorage])

  const totalActiveSessions = useMemo(
    () => Object.values(hydratedActiveSessionsByType).filter(Boolean).length,
    [hydratedActiveSessionsByType],
  )

  const startMiniTryoutSession = async (type: MiniTryoutType) => {
    if (startLockRef.current) return

    startLockRef.current = type
    let isNavigating = false
    try {
      setLoadingType(type)
      const result = await startMiniTryout(type)

      if (result?.error) {
        toast.error(result.error)
        return
      }

      if (result?.success && result?.sessionId) {
        toast.success(
          result.resumed ? `Melanjutkan Mini Tryout ${type}.` : `Mini Tryout ${type} dimulai.`,
        )
        isNavigating = true
        router.push(`/cpns/dashboard/tryout/${result.sessionId}`)
      }
    } catch {
      toast.error('Mini Tryout belum bisa dimulai')
    } finally {
      if (!isNavigating) {
        startLockRef.current = null
        setLoadingType(null)
      }
    }
  }

  const handleStartMiniTryout = async (type: MiniTryoutType) => {
    const activeSession = hydratedActiveSessionsByType[type]
    if (activeSession) {
      await startMiniTryoutSession(type)
      return
    }

    if (!hasToken) {
      toast.error('Token belum tersedia', {
        description: `Mini Tryout baru membutuhkan ${TRYOUT_TOKEN_COST} token.`,
      })
      return
    }

    setConfirmType(type)
  }

  const confirmProduct = confirmType
    ? (MINI_TRYOUT_PRODUCTS.find((product) => product.type === confirmType) ?? null)
    : null

  return (
    <div data-experience-mode="learning" data-program="cpns" className="st-product space-y-6">
      <PageAnimateContainer className="space-y-6">
        <PageAnimateItem>
          <PageHeader
            title="Uji satu bagian sebelum mencoba sesi penuh."
            description="Pilih TWK, TIU, atau TKP untuk mengukur satu bagian secara terpisah sebelum kembali ke Full Tryout."
            aside={
              <div className="st-flat-card flex min-w-52 items-center justify-between gap-4 p-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Saldo token</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">{quota}</p>
                </div>
                <Ticket className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              </div>
            }
          />
        </PageAnimateItem>

        {totalActiveSessions > 0 && (
          <PageAnimateItem>
            <div
              className="st-card flex items-start gap-3 border-info-border bg-info-muted p-4"
              role="status"
            >
              <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-info" />
              <div>
                <p className="font-semibold text-info">
                  Ada {totalActiveSessions} sesi yang bisa dilanjutkan
                </p>
                <p className="mt-1 text-sm leading-6 text-info">
                  Sesi aktif tidak memakai token baru saat kamu melanjutkannya.
                </p>
              </div>
            </div>
          </PageAnimateItem>
        )}

        {!hasToken && totalActiveSessions === 0 && (
          <PageAnimateItem>
            <div
              className="flex flex-col gap-3 rounded-xl border border-warning-border bg-warning-muted p-4 sm:flex-row sm:items-center sm:justify-between"
              role="status"
            >
              <div>
                <p className="font-semibold text-warning">Token belum tersedia</p>
                <p className="mt-1 text-sm text-warning">
                  Kamu membutuhkan {TRYOUT_TOKEN_COST} token untuk memulai Mini Tryout baru.
                </p>
              </div>
              <Button
                type="button"
                onClick={() => router.push('/cpns/dashboard/beli-paket')}
                variant="outline"
                className="shrink-0"
              >
                Beli Token
              </Button>
            </div>
          </PageAnimateItem>
        )}

        <div className="grid gap-5 lg:grid-cols-3">
          {MINI_TRYOUT_PRODUCTS.map((product) => {
            const style = PRODUCT_STYLES[product.type]
            const activeSession = hydratedActiveSessionsByType[product.type]
            const activeDetails = getActiveSessionDetails(activeSession)
            const isLoading = loadingType === product.type
            const { Icon } = style

            return (
              <PageAnimateItem key={product.type}>
                <article className="st-card-md flex h-full flex-col p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex size-11 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span
                      className={cn(
                        'rounded-md px-2 py-1 text-xs font-medium',
                        style.badgeClassName,
                      )}
                    >
                      {product.type}
                    </span>
                  </div>

                  <div className="mt-5">
                    <h2 className="text-lg font-semibold tracking-tight text-foreground">
                      {product.title}
                    </h2>
                    <p className="mt-1 text-xs font-medium text-muted-foreground">
                      {product.subtitle}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      {product.description}
                    </p>
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-2">
                    <div className="border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-medium text-muted-foreground">Soal</p>
                      <p className="mt-1 text-lg font-semibold text-foreground">
                        {product.questionCount}
                      </p>
                    </div>
                    <div className="border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-medium text-muted-foreground">Ambang</p>
                      <p className="mt-1 text-lg font-semibold text-foreground">
                        {product.passingGrade}
                      </p>
                    </div>
                    <div className="border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-medium text-muted-foreground">Maks</p>
                      <p className="mt-1 text-lg font-semibold text-foreground">
                        {product.maxScore}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {product.focusItems.map((item) => (
                      <span
                        key={`${product.type}-${item}`}
                        className="rounded-md border border-border bg-white px-2 py-1 text-xs font-medium text-muted-foreground"
                      >
                        {item}
                      </span>
                    ))}
                  </div>

                  {activeSession && (
                    <div className="mt-5 rounded-lg border border-info-border bg-info-muted p-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-info">
                        <Clock3 className="h-4 w-4" /> Sesi aktif
                      </div>
                      {activeDetails && (
                        <p className="mt-1 text-xs font-medium text-info">{activeDetails}</p>
                      )}
                    </div>
                  )}

                  <div className="mt-auto pt-5">
                    <p className="mb-3 text-xs font-medium text-muted-foreground">
                      {product.tokenCost} token untuk sesi baru
                    </p>
                    <Button
                      type="button"
                      onClick={() => handleStartMiniTryout(product.type)}
                      disabled={Boolean(loadingType) || (!activeSession && !hasToken)}
                      className="w-full"
                    >
                      {isLoading ? (
                        <LoadingSpinner label={`Menyiapkan mini tryout ${product.type}`} />
                      ) : (
                        <ArrowRight className="h-5 w-5" />
                      )}
                      {isLoading
                        ? 'Menyiapkan...'
                        : activeSession
                          ? `Lanjutkan ${product.type}`
                          : `Mulai ${product.type}`}
                    </Button>
                  </div>
                </article>
              </PageAnimateItem>
            )
          })}
        </div>

        <PageAnimateItem>
          <div className="st-flat-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Setelah Mini Tryout</p>
              <h3 className="mt-1 text-lg font-semibold text-foreground">
                Validasi kesiapan di Full Tryout.
              </h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Gunakan hasil satu bagian untuk menentukan apa yang perlu dilatih, lalu uji kembali
                ketiganya dalam satu sesi.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => router.push('/cpns/dashboard/tryout')}
              variant="outline"
              className="shrink-0"
            >
              Buka Full Tryout <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </PageAnimateItem>
      </PageAnimateContainer>

      {confirmProduct && (
        <TokenUsageConfirmModal
          isOpen={Boolean(confirmType)}
          title={`Mulai ${confirmProduct.title}?`}
          description={`${confirmProduct.title} baru akan memakai ${TRYOUT_TOKEN_COST} token dari saldo kamu.`}
          details={[
            { label: 'Soal', value: confirmProduct.questionCount },
            { label: 'Ambang', value: confirmProduct.passingGrade },
            { label: 'Skor maks', value: confirmProduct.maxScore },
          ]}
          quota={quota}
          isLoading={loadingType === confirmProduct.type}
          onCancel={() => !loadingType && setConfirmType(null)}
          onConfirm={() => startMiniTryoutSession(confirmProduct.type)}
        />
      )}
    </div>
  )
}
