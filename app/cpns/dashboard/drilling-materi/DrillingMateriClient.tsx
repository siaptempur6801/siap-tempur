'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import { ArrowRight, Brain, Clock3, Dumbbell, Loader2, ShieldCheck, UserCheck } from 'lucide-react'
import { toast } from 'sonner'
import { startDrillingMateri } from '@/app/actions/practice'
import PaperBackground from '@/components/PaperBackground'
import TokenUsageConfirmModal from '@/components/practice/TokenUsageConfirmModal'
import { PageAnimateContainer, PageAnimateItem } from '@/components/ui/PageAnimate'
import { MINI_TRYOUT_TYPES, SUBJECTS, TRYOUT_TOKEN_COST, type MiniTryoutType } from '@/lib/constants'
import { DRILLING_MATERI_QUESTION_COUNT } from '@/lib/practice-session'
import { getPracticeSessionStorageKey, getResumeQuestionNumberFromStoredProgress } from '@/lib/practice-progress'
import { cn } from '@/lib/utils'

export type DrillingMateriItem = {
    key: string
    type: MiniTryoutType
    subCategory: string
    questionCount: number
}

export type DrillingActiveSession = {
    sessionId: string
    startedAt: string | null
    resumeQuestionNumber: number
    answeredQuestions: number
}

export type DrillingActiveSessions = Record<string, DrillingActiveSession | undefined>

type DrillingMateriClientProps = {
    activeSessionsByKey: DrillingActiveSessions
    materials: DrillingMateriItem[]
    quota: number
}

type DrillStyle = {
    Icon: LucideIcon
    sectionTitle: string
    borderClassName: string
    badgeClassName: string
    buttonClassName: string
    softClassName: string
}

const DRILL_STYLES: Record<MiniTryoutType, DrillStyle> = {
    TWK: {
        Icon: ShieldCheck,
        sectionTitle: SUBJECTS.TWK.name,
        borderClassName: 'border-red-300',
        badgeClassName: 'bg-red-100 text-red-700 border-red-300',
        buttonClassName: 'bg-red-600 text-white border-red-800 hover:bg-red-700',
        softClassName: 'bg-red-50 text-red-700 border-red-200',
    },
    TIU: {
        Icon: Brain,
        sectionTitle: SUBJECTS.TIU.name,
        borderClassName: 'border-yellow-300',
        badgeClassName: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        buttonClassName: 'bg-yellow-400 text-gray-900 border-gray-900 hover:bg-yellow-500',
        softClassName: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    },
    TKP: {
        Icon: UserCheck,
        sectionTitle: SUBJECTS.TKP.name,
        borderClassName: 'border-blue-300',
        badgeClassName: 'bg-blue-100 text-blue-700 border-blue-300',
        buttonClassName: 'bg-blue-600 text-white border-blue-800 hover:bg-blue-700',
        softClassName: 'bg-blue-50 text-blue-700 border-blue-200',
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

function getActiveSessionDetails(activeSession: DrillingActiveSession | undefined) {
    if (!activeSession) return null

    const items = [`Soal ${activeSession.resumeQuestionNumber}`]
    if (activeSession.answeredQuestions > 0) items.push(`${activeSession.answeredQuestions}/${DRILLING_MATERI_QUESTION_COUNT} terjawab`)

    const startedAt = formatStartedAt(activeSession.startedAt)
    if (startedAt) items.push(startedAt)

    return items.join(' | ')
}

export default function DrillingMateriClient({ activeSessionsByKey, materials, quota }: DrillingMateriClientProps) {
    const router = useRouter()
    const [loadingKey, setLoadingKey] = useState<string | null>(null)
    const [confirmMaterial, setConfirmMaterial] = useState<DrillingMateriItem | null>(null)
    const [hydratedActiveSessionsByKey, setHydratedActiveSessionsByKey] = useState(activeSessionsByKey)
    const startLockRef = useRef<string | null>(null)
    const hasToken = quota >= TRYOUT_TOKEN_COST

    const hydrateActiveSessionsFromLocalStorage = useCallback(() => {
        if (typeof window === 'undefined') return

        const nextActiveSessions = { ...activeSessionsByKey }
        materials.forEach((material) => {
            const activeSession = activeSessionsByKey[material.key]
            if (!activeSession) return

            const storedResumeQuestionNumber = getResumeQuestionNumberFromStoredProgress(
                window.localStorage.getItem(getPracticeSessionStorageKey(activeSession.sessionId))
            )
            if (!storedResumeQuestionNumber) return

            nextActiveSessions[material.key] = {
                ...activeSession,
                resumeQuestionNumber: Math.max(activeSession.resumeQuestionNumber, storedResumeQuestionNumber),
            }
        })

        setHydratedActiveSessionsByKey(nextActiveSessions)
    }, [activeSessionsByKey, materials])

    useEffect(() => {
        setHydratedActiveSessionsByKey(activeSessionsByKey)
        hydrateActiveSessionsFromLocalStorage()
    }, [activeSessionsByKey, hydrateActiveSessionsFromLocalStorage])

    useEffect(() => {
        if (typeof window === 'undefined') return

        window.addEventListener('focus', hydrateActiveSessionsFromLocalStorage)
        window.addEventListener('pageshow', hydrateActiveSessionsFromLocalStorage)
        return () => {
            window.removeEventListener('focus', hydrateActiveSessionsFromLocalStorage)
            window.removeEventListener('pageshow', hydrateActiveSessionsFromLocalStorage)
        }
    }, [hydrateActiveSessionsFromLocalStorage])

    const materialsByType = useMemo(() => {
        return MINI_TRYOUT_TYPES.map((type) => ({
            type,
            materials: materials.filter((material) => material.type === type),
        }))
    }, [materials])

    const totalActiveSessions = useMemo(
        () => Object.values(hydratedActiveSessionsByKey).filter(Boolean).length,
        [hydratedActiveSessionsByKey]
    )

    const startDrill = async (material: DrillingMateriItem) => {
        if (startLockRef.current) return

        startLockRef.current = material.key
        let isNavigating = false
        try {
            setLoadingKey(material.key)
            const result = await startDrillingMateri(material.type, material.subCategory)

            if (result?.error) {
                toast.error(result.error)
                return
            }

            if (result?.success && result?.sessionId) {
                toast.success(
                    result.resumed
                        ? `Melanjutkan drilling ${material.subCategory}.`
                        : `Drilling ${material.subCategory} dimulai.`
                )
                isNavigating = true
                router.push(`/cpns/dashboard/tryout/${result.sessionId}`)
            }
        } catch {
            toast.error('Gagal memulai drilling materi')
        } finally {
            if (!isNavigating) {
                startLockRef.current = null
                setLoadingKey(null)
            }
        }
    }

    const handleStartDrill = async (material: DrillingMateriItem) => {
        const activeSession = hydratedActiveSessionsByKey[material.key]
        if (activeSession) {
            await startDrill(material)
            return
        }

        if (!hasToken) {
            toast.error('Token drilling materi habis!', {
                description: 'Setiap materi drilling membutuhkan 1 token.',
            })
            return
        }

        setConfirmMaterial(material)
    }

    return (
        <div className="relative min-h-screen w-full">
            <PaperBackground />
            <PageAnimateContainer className="relative z-10 mx-auto max-w-6xl space-y-8 p-4 pb-20 font-handwriting md:p-8">
                <PageAnimateItem className="space-y-4">
                    <div className="inline-flex items-center gap-2 border-2 border-gray-900 bg-purple-100 px-3 py-1.5 text-xs font-black uppercase tracking-widest text-purple-700 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] -rotate-1">
                        <Dumbbell size={14} />
                        <span>Drilling Materi</span>
                    </div>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div className="space-y-2">
                            <h1 className="text-4xl font-black text-gray-900 md:text-5xl">
                                Latihan Materi yang Mau Kamu Kuasai
                            </h1>
                            <p className="max-w-3xl text-lg font-sans leading-relaxed text-gray-600">
                                Pilih materi yang ingin kamu perkuat, lalu kerjakan 30 soal acak yang fokus di materi itu saja. Cocok untuk mengulang bagian yang masih sering salah sebelum lanjut ke mini tryout atau full tryout.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 font-sans text-sm sm:min-w-[280px]">
                            <div className="border-2 border-gray-900 bg-white px-3 py-3 text-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                                <div className="text-2xl font-black text-gray-900">{DRILLING_MATERI_QUESTION_COUNT}</div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">Soal/Materi</div>
                            </div>
                            <div className="border-2 border-gray-900 bg-white px-3 py-3 text-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                                <div className="text-2xl font-black text-gray-900">1</div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">Token/Materi</div>
                            </div>
                        </div>
                    </div>
                </PageAnimateItem>

                {totalActiveSessions > 0 && (
                    <PageAnimateItem>
                        <div className="flex w-full items-center gap-3 border-2 border-dashed border-purple-300 bg-purple-50 px-4 py-3 font-sans text-sm font-bold text-purple-700 shadow-[3px_3px_0px_0px_rgba(216,180,254,0.45)]">
                            <Clock3 size={16} />
                            <span>{totalActiveSessions} sesi drilling materi masih aktif dan bisa dilanjutkan.</span>
                        </div>
                    </PageAnimateItem>
                )}

                {!hasToken && totalActiveSessions === 0 && (
                    <PageAnimateItem>
                        <div className="flex w-full flex-col gap-3 border-2 border-dashed border-red-300 bg-red-50 px-4 py-3 font-sans text-sm font-bold text-red-700 shadow-[3px_3px_0px_0px_rgba(252,165,165,0.45)] sm:flex-row sm:items-center sm:justify-between">
                            <span>Token kamu habis. Setiap materi drilling membutuhkan {TRYOUT_TOKEN_COST} token.</span>
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

                {materials.length === 0 ? (
                    <PageAnimateItem>
                        <div className="border-2 border-gray-900 bg-white p-6 text-center shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
                            <h2 className="text-2xl font-black text-gray-900">Materi Drilling Belum Tersedia</h2>
                            <p className="mt-2 font-sans text-sm text-gray-600">
                                Materi latihan akan muncul setelah bank soal siap digunakan.
                            </p>
                        </div>
                    </PageAnimateItem>
                ) : (
                    materialsByType.map(({ type, materials: sectionMaterials }) => {
                        if (sectionMaterials.length === 0) return null

                        const style = DRILL_STYLES[type]
                        const { Icon } = style

                        return (
                            <PageAnimateItem key={type} className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className={cn('flex h-11 w-11 items-center justify-center border-2 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]', style.badgeClassName)}>
                                        <Icon className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-gray-900">{type}</h2>
                                        <p className="font-sans text-sm font-bold text-gray-500">{style.sectionTitle}</p>
                                    </div>
                                </div>

                                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                                    {sectionMaterials.map((material) => {
                                        const activeSession = hydratedActiveSessionsByKey[material.key]
                                        const activeDetails = getActiveSessionDetails(activeSession)
                                        const isLoading = loadingKey === material.key
                                        const hasEnoughQuestions = material.questionCount >= DRILLING_MATERI_QUESTION_COUNT

                                        return (
                                            <article
                                                key={material.key}
                                                className={cn('relative flex h-full flex-col overflow-hidden border-4 border-gray-900 bg-white p-5 shadow-[7px_7px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]', style.borderClassName)}
                                            >
                                                <div className="absolute inset-0 z-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
                                                <div className="relative z-10 flex h-full flex-col gap-5">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <span className={cn('border-2 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest', style.badgeClassName)}>
                                                            {material.type}
                                                        </span>
                                                        <span className="border border-gray-900 bg-yellow-100 px-2 py-1 text-[11px] font-bold text-gray-900 font-sans">
                                                            1 token
                                                        </span>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <h3 className="text-3xl font-black text-gray-900">{material.subCategory}</h3>
                                                        <p className="font-sans text-sm leading-relaxed text-gray-600">
                                                            Fokus latihan di materi {material.subCategory}. Kerjakan soal bertahap, tandai yang ragu, lalu cek pembahasan setelah selesai.
                                                        </p>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-2 font-sans">
                                                        <div className="border-2 border-gray-200 bg-gray-50 p-2">
                                                            <div className="text-[10px] font-black uppercase text-gray-400">Target</div>
                                                            <div className="text-xl font-black text-gray-900">{DRILLING_MATERI_QUESTION_COUNT}</div>
                                                        </div>
                                                        <div className="border-2 border-gray-200 bg-gray-50 p-2">
                                                            <div className="text-[10px] font-black uppercase text-gray-400">Mode</div>
                                                            <div className="text-xl font-black text-gray-900">Acak</div>
                                                        </div>
                                                    </div>

                                                    {activeSession && (
                                                        <div className="border-2 border-dashed border-purple-300 bg-purple-50 px-3 py-3 font-sans text-sm text-purple-700">
                                                            <div className="flex items-center gap-2 font-bold">
                                                                <Clock3 size={15} />
                                                                <span>Sesi drilling tersimpan</span>
                                                            </div>
                                                            {activeDetails && <p className="mt-1 text-xs font-medium">{activeDetails}</p>}
                                                        </div>
                                                    )}

                                                    {!hasEnoughQuestions && (
                                                        <div className="border-2 border-dashed border-orange-300 bg-orange-50 px-3 py-2 font-sans text-xs font-bold text-orange-700">
                                                            Materi ini sedang disiapkan dan belum bisa dimulai.
                                                        </div>
                                                    )}

                                                    <div className="mt-auto pt-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleStartDrill(material)}
                                                            disabled={Boolean(loadingKey) || !hasEnoughQuestions || (!activeSession && !hasToken)}
                                                            className={cn('group flex w-full items-center justify-center gap-2 border-2 px-4 py-3 text-lg font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none disabled:cursor-not-allowed disabled:opacity-60', style.buttonClassName)}
                                                        >
                                                            {isLoading ? (
                                                                <>
                                                                    <Loader2 className="h-5 w-5 animate-spin" />
                                                                    Menyiapkan...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    {!activeSession && !hasToken ? 'Token Habis' : `${activeSession ? 'Lanjutkan' : 'Mulai'} Drilling`}
                                                                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            </article>
                                        )
                                    })}
                                </div>
                            </PageAnimateItem>
                        )
                    })
                )}
            </PageAnimateContainer>

            {confirmMaterial && (
                <TokenUsageConfirmModal
                    isOpen={Boolean(confirmMaterial)}
                    title={`Mulai Drilling ${confirmMaterial.subCategory}?`}
                    description={`Drilling ${confirmMaterial.subCategory} akan memakai ${TRYOUT_TOKEN_COST} token dari saldo kamu. Sesi berisi ${DRILLING_MATERI_QUESTION_COUNT} soal dan progres tetap tersimpan kalau kamu keluar sebelum selesai.`}
                    details={[
                        { label: 'Materi', value: confirmMaterial.subCategory },
                        { label: 'Soal', value: DRILLING_MATERI_QUESTION_COUNT },
                    ]}
                    quota={quota}
                    isLoading={loadingKey === confirmMaterial.key}
                    onCancel={() => !loadingKey && setConfirmMaterial(null)}
                    onConfirm={() => startDrill(confirmMaterial)}
                />
            )}
        </div>
    )
}
