'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import { ArrowRight, Brain, Clock3, Dumbbell, Loader2, ShieldCheck, UserCheck, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { startDrillingMateri } from '@/app/actions/practice'
import TokenUsageConfirmModal from '@/components/practice/TokenUsageConfirmModal'
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
    badgeClassName: string
    accentClassName: string
}

const DRILL_STYLES: Record<MiniTryoutType, DrillStyle> = {
    TWK: {
        Icon: ShieldCheck,
        sectionTitle: SUBJECTS.TWK.name,
        badgeClassName: 'bg-red-100 text-red-800',
        accentClassName: 'bg-red-50',
    },
    TIU: {
        Icon: Brain,
        sectionTitle: SUBJECTS.TIU.name,
        badgeClassName: 'bg-yellow-100 text-yellow-900',
        accentClassName: 'bg-yellow-50',
    },
    TKP: {
        Icon: UserCheck,
        sectionTitle: SUBJECTS.TKP.name,
        badgeClassName: 'bg-blue-100 text-blue-800',
        accentClassName: 'bg-blue-50',
    },
}

const DRILLING_MATERI_MAX_XP = DRILLING_MATERI_QUESTION_COUNT * 5

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
    if (activeSession.answeredQuestions > 0) {
        items.push(`${activeSession.answeredQuestions}/${DRILLING_MATERI_QUESTION_COUNT} terjawab`)
    }
    const startedAt = formatStartedAt(activeSession.startedAt)
    if (startedAt) items.push(startedAt)
    return items.join(' · ')
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

    const materialsByType = useMemo(() => MINI_TRYOUT_TYPES.map((type) => ({
        type,
        materials: materials.filter((material) => material.type === type),
    })), [materials])

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
                        ? `Melanjutkan Latihan Fokus ${material.subCategory}.`
                        : `Latihan Fokus ${material.subCategory} dimulai.`
                )
                isNavigating = true
                router.push(`/cpns/dashboard/tryout/${result.sessionId}`)
            }
        } catch {
            toast.error('Latihan Fokus belum bisa dimulai. Coba lagi.')
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
            toast.error('Token kamu belum cukup.', {
                description: `Setiap Latihan Fokus membutuhkan ${TRYOUT_TOKEN_COST} token.`,
            })
            return
        }
        setConfirmMaterial(material)
    }

    return (
        <div className="st-product space-y-8 font-body text-[var(--st-ink)]">
            <header className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
                <div className="max-w-3xl">
                    <div className="st-kicker"><Dumbbell size={14} /> Latihan Fokus</div>
                    <h1 className="st-heading-display mt-5 text-4xl sm:text-5xl md:text-6xl">
                        Perkuat materi yang paling perlu kamu kuasai.
                    </h1>
                    <p className="st-muted mt-4 max-w-2xl text-base font-semibold leading-relaxed md:text-lg">
                        Pilih satu materi TWK, TIU, atau TKP lalu kerjakan {DRILLING_MATERI_QUESTION_COUNT} soal yang fokus pada bagian tersebut. Gunakan sesi ini untuk memperbaiki kelemahan sebelum mini tryout atau full tryout berikutnya.
                    </p>
                </div>

                <div className="grid grid-cols-3 gap-2 sm:min-w-[360px]">
                    <SummaryTile value={String(DRILLING_MATERI_QUESTION_COUNT)} label="soal / materi" />
                    <SummaryTile value={String(TRYOUT_TOKEN_COST)} label="token / sesi" accent />
                    <SummaryTile value={String(quota)} label="token kamu" />
                </div>
            </header>

            {totalActiveSessions > 0 && (
                <section className="st-card flex items-center gap-3 bg-blue-50 p-4 text-sm font-bold text-blue-900" role="status">
                    <Clock3 size={18} className="shrink-0" />
                    <span>{totalActiveSessions} Latihan Fokus masih aktif dan bisa kamu lanjutkan.</span>
                </section>
            )}

            {!hasToken && totalActiveSessions === 0 && (
                <section className="st-card flex flex-col gap-3 bg-red-50 p-4 text-sm font-bold text-red-800 sm:flex-row sm:items-center sm:justify-between" role="status">
                    <span>Token kamu belum cukup untuk memulai sesi baru.</span>
                    <button
                        type="button"
                        onClick={() => router.push('/cpns/dashboard/beli-paket')}
                        className="st-button inline-flex min-h-11 items-center justify-center bg-white px-4 py-2 text-xs uppercase tracking-wider text-red-800"
                    >
                        Lihat paket token
                    </button>
                </section>
            )}

            {materials.length === 0 ? (
                <section className="st-card-md p-8 text-center">
                    <h2 className="st-heading text-2xl">Materi Latihan Fokus belum tersedia.</h2>
                    <p className="st-muted mt-2 text-sm font-semibold">Pilihan materi akan muncul setelah bank soal siap digunakan.</p>
                </section>
            ) : (
                <div className="space-y-10">
                    {materialsByType.map(({ type, materials: sectionMaterials }) => {
                        if (sectionMaterials.length === 0) return null
                        const style = DRILL_STYLES[type]
                        const { Icon } = style

                        return (
                            <section key={type} className="space-y-4" aria-labelledby={`focused-${type}`}>
                                <div className="flex items-center gap-3">
                                    <div className={cn('flex h-11 w-11 items-center justify-center border-2 border-[var(--st-ink)] shadow-[3px_3px_0_var(--st-ink)]', style.badgeClassName)}>
                                        <Icon size={22} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">Bagian SKD</p>
                                        <h2 id={`focused-${type}`} className="st-heading text-2xl">{type} · {style.sectionTitle}</h2>
                                    </div>
                                </div>

                                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                                    {sectionMaterials.map((material) => {
                                        const activeSession = hydratedActiveSessionsByKey[material.key]
                                        const activeDetails = getActiveSessionDetails(activeSession)
                                        const isLoading = loadingKey === material.key
                                        const hasEnoughQuestions = material.questionCount >= DRILLING_MATERI_QUESTION_COUNT

                                        return (
                                            <article key={material.key} className={cn('st-card-md flex h-full flex-col p-5 md:p-6', style.accentClassName)}>
                                                <div className="flex items-start justify-between gap-3">
                                                    <span className={cn('st-pill', style.badgeClassName)}>{material.type}</span>
                                                    <span className="st-pill bg-[var(--st-yellow)]">{TRYOUT_TOKEN_COST} token</span>
                                                </div>

                                                <h3 className="st-heading mt-5 text-2xl">{material.subCategory}</h3>
                                                <p className="st-muted mt-2 flex-1 text-sm font-semibold leading-relaxed">
                                                    Fokus pada {material.subCategory}, kerjakan soal bertahap, lalu gunakan hasilnya untuk menentukan langkah belajar berikutnya.
                                                </p>

                                                <div className="mt-5 grid grid-cols-2 gap-2">
                                                    <MiniStat label="Jumlah soal" value={String(DRILLING_MATERI_QUESTION_COUNT)} />
                                                    <MiniStat label="Maks. XP" value={String(DRILLING_MATERI_MAX_XP)} />
                                                </div>

                                                <div className="mt-3 flex items-center gap-2 border-2 border-[var(--st-ink)] bg-[var(--st-yellow-soft)] px-3 py-2 text-xs font-bold">
                                                    <Zap size={15} className="shrink-0 text-amber-700" /> XP mengikuti hasil akhir sesi.
                                                </div>

                                                {activeSession && (
                                                    <div className="mt-3 border-2 border-[var(--st-ink)] bg-blue-50 px-3 py-3 text-sm text-blue-900">
                                                        <div className="flex items-center gap-2 font-black"><Clock3 size={15} /> Sesi tersimpan</div>
                                                        {activeDetails && <p className="mt-1 text-xs font-semibold">{activeDetails}</p>}
                                                    </div>
                                                )}

                                                {!hasEnoughQuestions && (
                                                    <div className="mt-3 border-2 border-[var(--st-ink)] bg-orange-50 px-3 py-2 text-xs font-bold text-orange-800">
                                                        Materi ini masih disiapkan dan belum dapat dimulai.
                                                    </div>
                                                )}

                                                <button
                                                    type="button"
                                                    onClick={() => handleStartDrill(material)}
                                                    disabled={Boolean(loadingKey) || !hasEnoughQuestions || (!activeSession && !hasToken)}
                                                    className="st-button mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 bg-blue-600 px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    {isLoading ? (
                                                        <><Loader2 size={18} className="animate-spin" /> Menyiapkan...</>
                                                    ) : (
                                                        <>{!activeSession && !hasToken ? 'Token belum cukup' : activeSession ? 'Lanjutkan Latihan Fokus' : 'Mulai Latihan Fokus'} <ArrowRight size={17} /></>
                                                    )}
                                                </button>
                                            </article>
                                        )
                                    })}
                                </div>
                            </section>
                        )
                    })}
                </div>
            )}

            {confirmMaterial && (
                <TokenUsageConfirmModal
                    isOpen={Boolean(confirmMaterial)}
                    title={`Mulai Latihan Fokus ${confirmMaterial.subCategory}?`}
                    description={`Sesi ${confirmMaterial.subCategory} akan memakai ${TRYOUT_TOKEN_COST} token. Setelah selesai, hasilnya akan masuk ke perkembangan belajarmu.`}
                    details={[
                        { label: 'Materi', value: confirmMaterial.subCategory },
                        { label: 'Soal', value: DRILLING_MATERI_QUESTION_COUNT },
                        { label: 'Maks. XP', value: DRILLING_MATERI_MAX_XP },
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

function SummaryTile({ value, label, accent = false }: { value: string; label: string; accent?: boolean }) {
    return (
        <div className={cn('st-card p-3 text-center', accent && 'bg-[var(--st-yellow)]')}>
            <div className="text-2xl font-black">{value}</div>
            <div className="mt-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-gray-600">{label}</div>
        </div>
    )
}

function MiniStat({ label, value }: { label: string; value: string }) {
    return (
        <div className="border-2 border-[var(--st-ink)] bg-white p-2.5">
            <div className="text-[10px] font-black uppercase tracking-wide text-gray-500">{label}</div>
            <div className="mt-0.5 text-xl font-black">{value}</div>
        </div>
    )
}
