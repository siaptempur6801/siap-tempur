'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import {
    ArrowRight,
    Brain,
    CheckCircle2,
    Clock3,
    Loader2,
    ShieldCheck,
    Target,
    Ticket,
    Trophy,
    UserCheck,
    Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import { startMiniTryout } from '@/app/actions/practice'
import PaperBackground from '@/components/PaperBackground'
import TokenUsageConfirmModal from '@/components/practice/TokenUsageConfirmModal'
import { PageAnimateContainer, PageAnimateItem } from '@/components/ui/PageAnimate'
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
    badgeClassName: string
    iconClassName: string
    borderClassName: string
    softClassName: string
    buttonClassName: string
}

const PRODUCT_STYLES: Record<MiniTryoutType, ProductStyle> = {
    TWK: {
        Icon: ShieldCheck,
        badgeClassName: 'bg-red-100 text-red-700 border-red-300',
        iconClassName: 'bg-red-100 text-red-700 border-red-300',
        borderClassName: 'border-red-200',
        softClassName: 'bg-red-50 text-red-700 border-red-200',
        buttonClassName: 'bg-red-600 hover:bg-red-700 text-white border-red-800',
    },
    TIU: {
        Icon: Brain,
        badgeClassName: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        iconClassName: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        borderClassName: 'border-yellow-200',
        softClassName: 'bg-yellow-50 text-yellow-800 border-yellow-200',
        buttonClassName: 'bg-yellow-400 hover:bg-yellow-500 text-gray-900 border-gray-900',
    },
    TKP: {
        Icon: UserCheck,
        badgeClassName: 'bg-blue-100 text-blue-700 border-blue-300',
        iconClassName: 'bg-blue-100 text-blue-700 border-blue-300',
        borderClassName: 'border-blue-200',
        softClassName: 'bg-blue-50 text-blue-700 border-blue-200',
        buttonClassName: 'bg-blue-600 hover:bg-blue-700 text-white border-blue-800',
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

    if (activeSession.answeredQuestions > 0) {
        items.push(`${activeSession.answeredQuestions} terjawab`)
    }

    const startedAt = formatStartedAt(activeSession.startedAt)
    if (startedAt) {
        items.push(startedAt)
    }

    return items.join(' | ')
}

export default function MiniTryoutClient({ activeSessionsByType, quota }: MiniTryoutClientProps) {
    const router = useRouter()
    const [loadingType, setLoadingType] = useState<MiniTryoutType | null>(null)
    const [confirmType, setConfirmType] = useState<MiniTryoutType | null>(null)
    const [hydratedActiveSessionsByType, setHydratedActiveSessionsByType] = useState(activeSessionsByType)
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
            if (!document.hidden) {
                hydrateActiveSessionsFromLocalStorage()
            }
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
            toast.error('Gagal memulai mini tryout')
        } finally {
            if (!isNavigating) {
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
            toast.error('Token mini tryout habis!', {
                description: 'Setiap produk mini tryout membutuhkan 1 token.',
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
            <PageAnimateContainer className="relative z-10 mx-auto max-w-6xl space-y-8 p-4 pb-20 font-handwriting md:p-8">
                <PageAnimateItem className="space-y-4">
                    <div className="inline-flex items-center gap-2 border-2 border-gray-900 bg-green-200 px-3 py-1.5 text-xs font-black uppercase tracking-widest text-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] -rotate-1">
                        <Zap size={14} className="fill-current" />
                        <span>Mini Tryout SKD</span>
                    </div>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div className="space-y-2">
                            <h1 className="text-4xl font-black text-gray-900 md:text-5xl">
                                Latihan Fokus TWK, TIU, dan TKP
                            </h1>
                            <p className="max-w-3xl text-lg font-sans leading-relaxed text-gray-600">
                                Pilih satu kategori SKD untuk latihan terukur dengan sistem pengerjaan, penyimpanan progres, scoring, dan pembahasan yang sama seperti tryout utama. Setiap produk mini tryout membutuhkan {TRYOUT_TOKEN_COST} token.
                            </p>
                        </div>
                        <div className="grid grid-cols-3 gap-2 font-sans text-sm sm:min-w-[360px]">
                            <div className="border-2 border-gray-900 bg-white px-3 py-3 text-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                                <div className="text-2xl font-black text-gray-900">3</div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">Produk</div>
                            </div>
                            <div className="border-2 border-gray-900 bg-white px-3 py-3 text-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                                <div className="text-2xl font-black text-gray-900">110</div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">Bank Soal</div>
                            </div>
                            <div className="border-2 border-gray-900 bg-white px-3 py-3 text-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                                <div className="text-2xl font-black text-gray-900">{TRYOUT_TOKEN_COST}</div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">Token/Produk</div>
                            </div>
                        </div>
                    </div>
                </PageAnimateItem>

                {totalActiveSessions > 0 && (
                    <PageAnimateItem>
                        <div className="flex w-full items-center gap-3 border-2 border-dashed border-blue-300 bg-blue-50 px-4 py-3 font-sans text-sm font-bold text-blue-700 shadow-[3px_3px_0px_0px_rgba(147,197,253,0.45)]">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-blue-300 bg-white text-blue-700">
                                <Clock3 size={16} />
                            </div>
                            <span>
                                {totalActiveSessions} sesi mini tryout masih aktif dan bisa dilanjutkan.
                            </span>
                        </div>
                    </PageAnimateItem>
                )}

                {!hasToken && totalActiveSessions === 0 && (
                    <PageAnimateItem>
                        <div className="flex w-full flex-col gap-3 border-2 border-dashed border-red-300 bg-red-50 px-4 py-3 font-sans text-sm font-bold text-red-700 shadow-[3px_3px_0px_0px_rgba(252,165,165,0.45)] sm:flex-row sm:items-center sm:justify-between">
                            <span>Token kamu habis. Setiap produk mini tryout membutuhkan {TRYOUT_TOKEN_COST} token.</span>
                            <button
                                type="button"
                                onClick={() => router.push('/cpns/dashboard/beli-paket')}
                                className="w-full border-2 border-red-700 bg-white px-3 py-2 text-xs font-black uppercase tracking-widest text-red-700 shadow-[2px_2px_0px_0px_rgba(185,28,28,0.5)] transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none sm:w-auto"
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
                                <article
                                    className={cn(
                                        'relative flex h-full flex-col overflow-hidden border-4 border-gray-900 bg-white p-5 shadow-[7px_7px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]',
                                        style.borderClassName
                                    )}
                                >
                                    <div className="absolute inset-0 z-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
                                    <div className="relative z-10 flex h-full flex-col gap-5">
                                        <div className="flex items-start justify-between gap-3">
                                            <div
                                                className={cn(
                                                    'flex h-14 w-14 items-center justify-center border-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]',
                                                    style.iconClassName
                                                )}
                                            >
                                                <Icon className="h-7 w-7" />
                                            </div>
                                            <span
                                                className={cn(
                                                    'border-2 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest',
                                                    style.badgeClassName
                                                )}
                                            >
                                                {product.type}
                                            </span>
                                        </div>

                                        <div className="space-y-2">
                                            <h2 className="text-3xl font-black text-gray-900">{product.title}</h2>
                                            <p className="text-sm font-black uppercase tracking-widest text-gray-400">{product.subtitle}</p>
                                            <p className="font-sans text-sm leading-relaxed text-gray-600">{product.description}</p>
                                        </div>

                                        <div className="grid grid-cols-3 gap-2 font-sans">
                                            <div className="border-2 border-gray-200 bg-gray-50 p-2">
                                                <div className="text-[10px] font-black uppercase text-gray-400">Soal</div>
                                                <div className="text-xl font-black text-gray-900">{product.questionCount}</div>
                                            </div>
                                            <div className="border-2 border-gray-200 bg-gray-50 p-2">
                                                <div className="text-[10px] font-black uppercase text-gray-400">Target</div>
                                                <div className="text-xl font-black text-gray-900">{product.passingGrade}</div>
                                            </div>
                                            <div className="border-2 border-gray-200 bg-gray-50 p-2">
                                                <div className="text-[10px] font-black uppercase text-gray-400">Maks</div>
                                                <div className="text-xl font-black text-gray-900">{product.maxScore}</div>
                                            </div>
                                        </div>

                                        <div className={cn('flex items-center gap-2 border-2 px-3 py-2 font-sans text-sm font-black', style.softClassName)}>
                                            <Ticket size={16} />
                                            <span>Biaya akses: {product.tokenCost} token per produk</span>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            {product.focusItems.map((item) => (
                                                <span
                                                    key={`${product.type}-${item}`}
                                                    className={cn(
                                                        'border px-2 py-1 text-[11px] font-bold font-sans',
                                                        style.softClassName
                                                    )}
                                                >
                                                    {item}
                                                </span>
                                            ))}
                                        </div>

                                        {activeSession && (
                                            <div className="border-2 border-dashed border-blue-300 bg-blue-50 px-3 py-3 font-sans text-sm text-blue-700">
                                                <div className="flex items-center gap-2 font-bold">
                                                    <Clock3 size={15} />
                                                    <span>Sesi tersimpan</span>
                                                </div>
                                                {activeDetails && (
                                                    <p className="mt-1 text-xs font-medium">{activeDetails}</p>
                                                )}
                                            </div>
                                        )}

                                        <div className="mt-auto pt-2">
                                            <button
                                                type="button"
                                                onClick={() => handleStartMiniTryout(product.type)}
                                                disabled={Boolean(loadingType) || (!activeSession && !hasToken)}
                                                className={cn(
                                                    'group flex w-full items-center justify-center gap-2 border-2 px-4 py-3 text-lg font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none disabled:cursor-not-allowed disabled:opacity-60',
                                                    style.buttonClassName
                                                )}
                                            >
                                                {isLoading ? (
                                                    <>
                                                        <Loader2 className="h-5 w-5 animate-spin" />
                                                        Menyiapkan...
                                                    </>
                                                ) : (
                                                    <>
                                                        {!activeSession && !hasToken ? 'Token Habis' : `${activeSession ? 'Lanjutkan' : 'Mulai'} ${product.type}`}
                                                        <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </article>
                            </PageAnimateItem>
                        )
                    })}
                </div>

                <PageAnimateItem>
                    <div className="grid gap-4 border-4 border-gray-900 bg-yellow-50 p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] md:grid-cols-[auto_1fr_auto] md:items-center">
                        <div className="flex h-12 w-12 items-center justify-center border-2 border-gray-900 bg-yellow-300 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                            <Trophy className="h-6 w-6 text-gray-900" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-gray-900">Full tryout tetap untuk simulasi akhir.</h3>
                            <p className="font-sans text-sm leading-relaxed text-gray-600">
                                Gunakan mini tryout untuk memperbaiki satu kategori, lalu validasi kesiapan di full tryout SKD 110 soal.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2 font-sans text-xs font-black uppercase">
                            <span className="inline-flex items-center gap-1 border-2 border-green-300 bg-green-100 px-2 py-1 text-green-700">
                                <CheckCircle2 size={14} />
                                Scoring
                            </span>
                            <span className="inline-flex items-center gap-1 border-2 border-blue-300 bg-blue-100 px-2 py-1 text-blue-700">
                                <Target size={14} />
                                Pembahasan
                            </span>
                        </div>
                    </div>
                </PageAnimateItem>
            </PageAnimateContainer>

            {confirmProduct && (
                <TokenUsageConfirmModal
                    isOpen={Boolean(confirmType)}
                    title={`Mulai ${confirmProduct.title}?`}
                    description={`${confirmProduct.title} baru akan memakai ${TRYOUT_TOKEN_COST} token dari saldo kamu. Progres tetap tersimpan kalau kamu keluar sebelum selesai.`}
                    details={[
                        { label: 'Soal', value: confirmProduct.questionCount },
                        { label: 'Target', value: confirmProduct.passingGrade },
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
