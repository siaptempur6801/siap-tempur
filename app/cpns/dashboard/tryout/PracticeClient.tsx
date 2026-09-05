'use client'

import { startTryout } from '@/app/actions/practice'
import { AlertCircle, ArrowRight, BookOpen, CheckCircle2, Clock3, ShieldCheck, Ticket } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { PageAnimateContainer, PageAnimateItem } from '@/components/ui/PageAnimate'
import PaperBackground from '@/components/PaperBackground'
import { TRYOUT_TOKEN_COST } from '@/lib/constants'
import TokenUsageConfirmModal from '@/components/practice/TokenUsageConfirmModal'
import { LoadingSpinner } from '@/components/ui/LoadingState'

interface PracticeClientProps {
    quota: number
    activeSessionId: string | null
    activeResumeQuestionNumber: number | null
    activeAnsweredQuestions: number | null
    activeStartedAt: string | null
}

function getSessionStorageKey(sessionId: string) {
    return `cpns-practice-session:${sessionId}`
}

function formatRemainingTime(startedAt: string | null, durationMinutes = 100) {
    if (!startedAt) return null

    const remainingMs = new Date(startedAt).getTime() + durationMinutes * 60 * 1000 - Date.now()
    if (remainingMs <= 0) return 'Waktu habis'

    const remainingMinutes = Math.ceil(remainingMs / 60000)
    return `Sisa sekitar ${remainingMinutes} menit`
}

function loadStoredResumeQuestionNumber(sessionId: string | null) {
    if (!sessionId || typeof window === 'undefined') return null

    try {
        const raw = window.localStorage.getItem(getSessionStorageKey(sessionId))
        if (!raw) return null

        const parsed = JSON.parse(raw) as { currentQuestionIndex?: number }
        if (typeof parsed.currentQuestionIndex === 'number' && parsed.currentQuestionIndex >= 0) {
            return parsed.currentQuestionIndex + 1
        }
    } catch {
        // Ignore invalid local cache and fall back to server value.
    }

    return null
}

export default function PracticeClient({
    quota,
    activeSessionId,
    activeResumeQuestionNumber,
    activeAnsweredQuestions,
    activeStartedAt,
}: PracticeClientProps) {
    const [loadingTryout, setLoadingTryout] = useState(false)
    const [showTokenConfirm, setShowTokenConfirm] = useState(false)
    const [hydratedResumeQuestionNumber, setHydratedResumeQuestionNumber] = useState<number | null>(activeResumeQuestionNumber)
    const [resumeTimeLabel, setResumeTimeLabel] = useState<string | null>(null)
    const router = useRouter()

    const hydrateResumeQuestionNumber = useCallback(() => {
        if (!activeSessionId) {
            setHydratedResumeQuestionNumber(activeResumeQuestionNumber)
            return
        }

        const storedResumeQuestionNumber = loadStoredResumeQuestionNumber(activeSessionId)
        setHydratedResumeQuestionNumber(storedResumeQuestionNumber || activeResumeQuestionNumber)
    }, [activeSessionId, activeResumeQuestionNumber])

    useEffect(() => {
        hydrateResumeQuestionNumber()
    }, [hydrateResumeQuestionNumber])

    useEffect(() => {
        if (typeof window === 'undefined') return

        const handleVisibilityChange = () => {
            if (!document.hidden) hydrateResumeQuestionNumber()
        }

        window.addEventListener('focus', hydrateResumeQuestionNumber)
        window.addEventListener('pageshow', hydrateResumeQuestionNumber)
        document.addEventListener('visibilitychange', handleVisibilityChange)

        return () => {
            window.removeEventListener('focus', hydrateResumeQuestionNumber)
            window.removeEventListener('pageshow', hydrateResumeQuestionNumber)
            document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
    }, [hydrateResumeQuestionNumber])

    useEffect(() => {
        if (!activeStartedAt) {
            setResumeTimeLabel(null)
            return
        }

        const updateTimeLabel = () => setResumeTimeLabel(formatRemainingTime(activeStartedAt))
        updateTimeLabel()
        const interval = window.setInterval(updateTimeLabel, 30000)
        return () => window.clearInterval(interval)
    }, [activeStartedAt])

    const resumeDetails = useMemo(() => {
        const items: string[] = []
        if ((activeAnsweredQuestions ?? 0) > 0) items.push(`${activeAnsweredQuestions} soal terjawab`)
        if (resumeTimeLabel) items.push(resumeTimeLabel)
        return items
    }, [activeAnsweredQuestions, resumeTimeLabel])

    const hasSavedProgress = (activeAnsweredQuestions ?? 0) > 0 || (hydratedResumeQuestionNumber ?? 1) > 1
    const bannerMessage = activeSessionId
        ? hasSavedProgress && hydratedResumeQuestionNumber
            ? `Sesi kamu masih aktif. Lanjutkan dari soal ${hydratedResumeQuestionNumber} tanpa memakai token baru.`
            : 'Sesi kamu masih aktif dan bisa dilanjutkan tanpa memakai token baru.'
        : null

    const startTryoutSession = async () => {
        let isNavigating = false
        try {
            setLoadingTryout(true)
            const result = await startTryout()

            if (result?.error) {
                toast.error(result.error)
                return
            }

            if (result?.success && result?.sessionId) {
                toast.success(result.resumed ? 'Melanjutkan Full Tryout.' : 'Full Tryout dimulai.')
                isNavigating = true
                router.push(`/cpns/dashboard/tryout/${result.sessionId}`)
            }
        } catch {
            toast.error('Full Tryout belum bisa dimulai')
        } finally {
            if (!isNavigating) setLoadingTryout(false)
        }
    }

    const handleStartTryout = async () => {
        if (activeSessionId) {
            await startTryoutSession()
            return
        }

        if (quota <= 0) {
            toast.error('Token belum tersedia', {
                description: 'Beli token untuk memulai Full Tryout baru.',
                action: {
                    label: 'Beli Token',
                    onClick: () => router.push('/cpns/dashboard/beli-paket'),
                },
            })
            return
        }

        setShowTokenConfirm(true)
    }

    return (
        <div className="relative min-h-screen w-full">
            <PaperBackground />
            <PageAnimateContainer className="relative z-10 mx-auto max-w-6xl space-y-7 px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:py-9">
                <PageAnimateItem>
                    <div className="st-kicker">
                        <BookOpen size={14} /> Full Tryout SKD
                    </div>
                    <div className="mt-4 max-w-3xl">
                        <h1 className="st-heading text-3xl sm:text-4xl lg:text-5xl">Uji kesiapanmu dalam satu sesi penuh.</h1>
                        <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                            Kerjakan TWK, TIU, dan TKP dalam satu sesi. Setelah selesai, lihat skor per bagian dan tinjau pembahasan untuk menentukan fokus latihan berikutnya.
                        </p>
                    </div>
                </PageAnimateItem>

                {activeSessionId && bannerMessage && (
                    <PageAnimateItem>
                        <div className="st-card flex flex-col gap-3 border-blue-600 bg-blue-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-start gap-3">
                                <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
                                <div>
                                    <p className="font-black text-slate-950">Lanjutkan sesi aktif</p>
                                    <p className="mt-1 text-sm leading-6 text-slate-600">{bannerMessage}</p>
                                    {hasSavedProgress && resumeDetails.length > 0 && (
                                        <p className="mt-1 text-xs font-bold text-blue-700">{resumeDetails.join(' • ')}</p>
                                    )}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleStartTryout}
                                disabled={loadingTryout}
                                className="st-button st-focus inline-flex min-h-11 shrink-0 items-center justify-center gap-2 bg-blue-600 px-4 py-2.5 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {loadingTryout ? <LoadingSpinner label="Menyiapkan full tryout" size="sm" /> : <ArrowRight className="h-4 w-4" />}
                                {loadingTryout ? 'Menyiapkan...' : 'Lanjutkan'}
                            </button>
                        </div>
                    </PageAnimateItem>
                )}

                <PageAnimateItem>
                    <section className="st-card-md overflow-hidden">
                        <div className="grid lg:grid-cols-[1.2fr_0.8fr]">
                            <div className="p-5 sm:p-7 lg:p-8">
                                <div className="flex flex-wrap gap-2">
                                    <span className="st-pill bg-red-50 text-red-700">TWK · 30 soal</span>
                                    <span className="st-pill bg-amber-50 text-amber-800">TIU · 35 soal</span>
                                    <span className="st-pill bg-blue-50 text-blue-700">TKP · 45 soal</span>
                                </div>

                                <h2 className="mt-6 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">110 soal dalam 100 menit</h2>
                                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                                    Full Tryout memakai {TRYOUT_TOKEN_COST} token untuk sesi baru. Sesi yang sudah aktif bisa dilanjutkan tanpa memakai token lagi.
                                </p>

                                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                                    {[
                                        'Mencakup tiga bagian SKD',
                                        'Progres sesi aktif tersimpan',
                                        'Skor per bagian setelah selesai',
                                        'Pembahasan jawaban tersedia di hasil',
                                    ].map((item) => (
                                        <div key={item} className="flex items-start gap-2 text-sm font-semibold text-slate-700">
                                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                                            <span>{item}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-7 flex items-center gap-3 border-t-2 border-slate-900 pt-5">
                                    <div className="flex h-11 w-11 items-center justify-center border-2 border-slate-900 bg-yellow-100">
                                        <Ticket className="h-5 w-5 text-blue-700" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Saldo token</p>
                                        <p className="text-2xl font-black text-slate-950">{quota} <span className="text-sm text-slate-500">token</span></p>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t-2 border-slate-900 bg-blue-50 p-5 sm:p-7 lg:border-l-2 lg:border-t-0 lg:p-8">
                                <div className="flex h-full flex-col justify-between gap-6">
                                    <div>
                                        <div className="flex h-11 w-11 items-center justify-center border-2 border-slate-900 bg-white">
                                            <ShieldCheck className="h-5 w-5 text-blue-700" />
                                        </div>
                                        <h3 className="mt-4 text-xl font-black text-slate-950">Siap mulai sesi baru?</h3>
                                        <p className="mt-2 text-sm leading-6 text-slate-600">
                                            Pastikan kamu punya waktu yang cukup dan koneksi internet yang stabil. Waktu mulai berjalan setelah sesi berhasil dibuat.
                                        </p>
                                    </div>

                                    {quota > 0 || activeSessionId ? (
                                        <button
                                            type="button"
                                            onClick={handleStartTryout}
                                            disabled={loadingTryout}
                                            className="st-button st-focus flex min-h-12 w-full items-center justify-center gap-2 bg-blue-600 px-5 py-3 text-base text-white disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            {loadingTryout ? <LoadingSpinner label="Menyiapkan full tryout" /> : <ArrowRight className="h-5 w-5" />}
                                            {loadingTryout ? 'Menyiapkan sesi...' : activeSessionId ? 'Lanjutkan Full Tryout' : 'Mulai Full Tryout'}
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => router.push('/cpns/dashboard/beli-paket')}
                                            className="st-button st-focus flex min-h-12 w-full items-center justify-center gap-2 bg-white px-5 py-3 text-base text-blue-700"
                                        >
                                            <Ticket className="h-5 w-5" /> Beli Token
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>
                </PageAnimateItem>

                <PageAnimateItem className="grid gap-4 md:grid-cols-3">
                    <div className="st-flat-card p-5">
                        <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Sebelum mulai</p>
                        <h3 className="mt-2 font-black text-slate-950">Siapkan 100 menit.</h3>
                        <p className="mt-1 text-sm leading-6 text-slate-600">Pilih waktu yang cukup agar sesi tidak perlu sering ditinggalkan.</p>
                    </div>
                    <div className="st-flat-card p-5">
                        <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Saat mengerjakan</p>
                        <h3 className="mt-2 font-black text-slate-950">Tandai soal yang ingin ditinjau.</h3>
                        <p className="mt-1 text-sm leading-6 text-slate-600">Gunakan penanda untuk kembali ke soal yang masih ingin kamu periksa.</p>
                    </div>
                    <div className="st-flat-card p-5">
                        <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Jika perlu keluar</p>
                        <h3 className="mt-2 font-black text-slate-950">Progres sesi tetap disimpan.</h3>
                        <p className="mt-1 text-sm leading-6 text-slate-600">Kamu bisa kembali ke sesi aktif selama sesi tersebut belum selesai.</p>
                    </div>
                </PageAnimateItem>

                <PageAnimateItem>
                    <div className="flex items-start gap-3 border-2 border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
                        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                        <p className="leading-6"><strong>Satu token digunakan saat membuat Full Tryout baru.</strong> Keluar dari sesi tidak mengembalikan token; lanjutkan sesi aktif yang sama untuk menyelesaikannya.</p>
                    </div>
                </PageAnimateItem>
            </PageAnimateContainer>

            <TokenUsageConfirmModal
                isOpen={showTokenConfirm}
                title="Mulai Full Tryout SKD?"
                description={`Full Tryout baru akan memakai ${TRYOUT_TOKEN_COST} token dari saldo kamu. Waktu 100 menit berjalan setelah sesi berhasil dibuat.`}
                details={[
                    { label: 'Soal', value: 110 },
                    { label: 'Durasi', value: '100 menit' },
                ]}
                quota={quota}
                isLoading={loadingTryout}
                onCancel={() => !loadingTryout && setShowTokenConfirm(false)}
                onConfirm={startTryoutSession}
            />
        </div>
    )
}
