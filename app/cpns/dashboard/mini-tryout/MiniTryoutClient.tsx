'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import { ArrowRight, Brain, Clock3, ShieldCheck, Ticket, UserCheck } from 'lucide-react'
import { toast } from 'sonner'
import { startMiniTryout } from '@/app/actions/practice'
import PaperBackground from '@/components/PaperBackground'
import TokenUsageConfirmModal from '@/components/practice/TokenUsageConfirmModal'
import { PageAnimateContainer, PageAnimateItem } from '@/components/ui/PageAnimate'
import { LoadingSpinner } from '@/components/ui/LoadingState'
import { MINI_TRYOUT_PRODUCTS, TRYOUT_TOKEN_COST, type MiniTryoutType } from '@/lib/constants'
import { getPracticeSessionStorageKey, getResumeQuestionNumberFromStoredProgress } from '@/lib/practice-progress'
import { cn } from '@/lib/utils'

export type MiniTryoutActiveSession = {
    sessionId: string
    startedAt: string | null
    resumeQuestionNumber: number
    answeredQuestions: number
}

export type MiniTryoutActiveSessions = Partial<Record<MiniTryoutType, MiniTryoutActiveSession>>

type MiniTryoutClientProps = {
    activeSessionsByType: MiniTryoutActiveSessions
    quota: number
}

type ProductStyle = {
    Icon: LucideIcon
    iconClassName: string
    badgeClassName: string
    buttonClassName: string
}

const PRODUCT_STYLES: Record<MiniTryoutType, ProductStyle> = {
    TWK: {
        Icon: ShieldCheck,
        iconClassName: 'bg-red-50 text-red-700',
        badgeClassName: 'bg-red-50 text-red-700',
        buttonClassName: 'bg-red-600 text-white hover:bg-red-700',
    },
    TIU: {
        Icon: Brain,
        iconClassName: 'bg-amber-50 text-amber-800',
        badgeClassName: 'bg-amber-50 text-amber-800',
        buttonClassName: 'bg-amber-300 text-slate-950 hover:bg-amber-400',
    },
    TKP: {
        Icon: UserCheck,
        iconClassName: 'bg-blue-50 text-blue-700',
        badgeClassName: 'bg-blue-50 text-blue-700',
        buttonClassName: 'bg-blue-600 text-white hover:bg-blue-700',
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
    const [hydratedActiveSessionsByType, setHydratedActiveSessionsByType] = useState(activeSessionsByType)
    const startLockRef = useRef<MiniTryoutType | null>(null)
    const hasToken = quota >= TRYOUT_TOKEN_COST

    const hydrateActiveSessionsFromLocalStorage = useCallback(() => {
        if (typeof window === 'undefined') return

        const nextActiveSessions = { ...activeSessionsByType }

        MINI_TRYOUT_PRODUCTS.forEach((product) => {
            const activeSession = activeSessionsByType[product.type]
            if (!activeSession) return

            const storedResumeQuestionNumber = getResumeQuestionNumberFromStoredProgress(
                window.localStorage.getItem(getPracticeSessionStorageKey(activeSession.sessionId))
            )

            if (!storedResumeQuestionNumber) return

            nextActiveSessions[product.type] = {
                ...activeSession,
                resumeQuestionNumber: Math.max(activeSession.resumeQuestionNumber, storedResumeQuestionNumber),
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
        [hydratedActiveSessionsByType]
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
                toast.success(result.resumed ? `Melanjutkan Mini Tryout ${type}.` : `Mini Tryout ${type} dimulai.`)
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
        ? MINI_TRYOUT_PRODUCTS.find((product) => product.type === confirmType) ?? null
        : null

    return (
        <div className="relative min-h-screen w-full">
            <PaperBackground />
            <PageAnimateContainer className="relative z-10 mx-auto max-w-6xl space-y-7 px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:py-9">
                <PageAnimateItem>
                    <div className="st-kicker">Mini Tryout SKD</div>
                    <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-3xl">
                            <h1 className="st-heading text-3xl sm:text-4xl lg:text-5xl">Uji satu bagian sebelum mencoba sesi penuh.</h1>
                            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                                Pilih TWK, TIU, atau TKP. Mini Tryout membantu kamu mengukur satu bagian secara terpisah sebelum kembali ke Full Tryout.
                            </p>
                        </div>
                        <div className="st-flat-card flex min-w-52 items-center justify-between gap-4 p-4">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Saldo token</p>
                                <p className="mt-1 text-2xl font-black text-slate-950">{quota}</p>
                            </div>
                            <Ticket className="h-6 w-6 text-blue-700" />
                        </div>
                    </div>
                </PageAnimateItem>

                {totalActiveSessions > 0 && (
                    <PageAnimateItem>
                        <div className="st-card flex items-start gap-3 border-blue-600 bg-blue-50 p-4">
                            <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
                            <div>
                                <p className="font-black text-slate-950">Ada {totalActiveSessions} sesi yang bisa dilanjutkan</p>
                                <p className="mt-1 text-sm leading-6 text-slate-600">Sesi aktif tidak memakai token baru saat kamu melanjutkannya.</p>
                            </div>
                        </div>
                    </PageAnimateItem>
                )}

                {!hasToken && totalActiveSessions === 0 && (
                    <PageAnimateItem>
                        <div className="flex flex-col gap-3 border-2 border-amber-300 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="font-black text-amber-950">Token belum tersedia</p>
                                <p className="mt-1 text-sm text-amber-900">Kamu membutuhkan {TRYOUT_TOKEN_COST} token untuk memulai Mini Tryout baru.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => router.push('/cpns/dashboard/beli-paket')}
                                className="st-button st-focus min-h-11 bg-white px-4 py-2.5 text-sm text-blue-700"
                            >
                                Beli Token
                            </button>
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
                                        <div className={cn('flex h-12 w-12 items-center justify-center border-2 border-slate-900', style.iconClassName)}>
                                            <Icon className="h-6 w-6" />
                                        </div>
                                        <span className={cn('st-pill', style.badgeClassName)}>{product.type}</span>
                                    </div>

                                    <div className="mt-5">
                                        <h2 className="text-2xl font-black tracking-tight text-slate-950">{product.title}</h2>
                                        <p className="mt-1 text-xs font-black uppercase tracking-[0.1em] text-slate-500">{product.subtitle}</p>
                                        <p className="mt-3 text-sm leading-6 text-slate-600">{product.description}</p>
                                    </div>

                                    <div className="mt-5 grid grid-cols-3 gap-2">
                                        <div className="border border-slate-200 bg-slate-50 p-3">
                                            <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Soal</p>
                                            <p className="mt-1 text-xl font-black text-slate-950">{product.questionCount}</p>
                                        </div>
                                        <div className="border border-slate-200 bg-slate-50 p-3">
                                            <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Ambang</p>
                                            <p className="mt-1 text-xl font-black text-slate-950">{product.passingGrade}</p>
                                        </div>
                                        <div className="border border-slate-200 bg-slate-50 p-3">
                                            <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Maks</p>
                                            <p className="mt-1 text-xl font-black text-slate-950">{product.maxScore}</p>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex flex-wrap gap-1.5">
                                        {product.focusItems.map((item) => (
                                            <span key={`${product.type}-${item}`} className="border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-600">
                                                {item}
                                            </span>
                                        ))}
                                    </div>

                                    {activeSession && (
                                        <div className="mt-5 border-2 border-blue-200 bg-blue-50 p-3">
                                            <div className="flex items-center gap-2 text-sm font-black text-blue-800">
                                                <Clock3 className="h-4 w-4" /> Sesi aktif
                                            </div>
                                            {activeDetails && <p className="mt-1 text-xs font-semibold text-blue-700">{activeDetails}</p>}
                                        </div>
                                    )}

                                    <div className="mt-auto pt-5">
                                        <p className="mb-3 text-xs font-semibold text-slate-500">{product.tokenCost} token untuk sesi baru</p>
                                        <button
                                            type="button"
                                            onClick={() => handleStartMiniTryout(product.type)}
                                            disabled={Boolean(loadingType) || (!activeSession && !hasToken)}
                                            className={cn(
                                                'st-button st-focus flex min-h-12 w-full items-center justify-center gap-2 px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60',
                                                style.buttonClassName
                                            )}
                                        >
                                            {isLoading ? <LoadingSpinner label={`Menyiapkan mini tryout ${product.type}`} /> : <ArrowRight className="h-5 w-5" />}
                                            {isLoading ? 'Menyiapkan...' : activeSession ? `Lanjutkan ${product.type}` : `Mulai ${product.type}`}
                                        </button>
                                    </div>
                                </article>
                            </PageAnimateItem>
                        )
                    })}
                </div>

                <PageAnimateItem>
                    <div className="st-flat-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Setelah Mini Tryout</p>
                            <h3 className="mt-1 text-xl font-black text-slate-950">Validasi kesiapan di Full Tryout.</h3>
                            <p className="mt-1 text-sm leading-6 text-slate-600">Gunakan hasil satu bagian untuk menentukan apa yang perlu dilatih, lalu uji kembali ketiganya dalam satu sesi.</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => router.push('/cpns/dashboard/tryout')}
                            className="st-button st-focus inline-flex min-h-11 shrink-0 items-center justify-center gap-2 bg-white px-4 py-2.5 text-sm text-slate-950"
                        >
                            Buka Full Tryout <ArrowRight className="h-4 w-4" />
                        </button>
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
