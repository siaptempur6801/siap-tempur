'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Play } from 'lucide-react'
import { toast } from 'sonner'
import { startTkaExam } from '@/app/actions/tka-practice'
import { trackProductEvent } from '@/lib/product-analytics'
import { LoadingSpinner } from '@/components/ui/LoadingState'
import { acquireSingleFlightLock, releaseSingleFlightLock } from '@/lib/single-flight-lock'

export default function TkaStartExamButton({
    level,
    examSlug,
    disabledReason,
    activeAttemptId,
}: {
    level: string
    examSlug: string
    disabledReason?: string | null
    activeAttemptId?: string | null
}) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const startLockRef = useRef(false)
    const hasActiveAttempt = Boolean(activeAttemptId)

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
                setErrorMessage(result.error)
                return
            }
            if (result?.success && result.sessionId) {
                trackProductEvent('px_exam_start', {
                    program: 'tka_smp',
                    surface: 'exam',
                    mode: examSlug.includes('full') ? 'full_tryout' : 'mini_tryout',
                })
                toast.success(result.resumed ? 'Melanjutkan tryout tersimpan.' : 'Tryout TKA dimulai!')
                router.push(`/tka/${level.toLowerCase()}/tryout/${result.sessionId}`)
                isNavigating = true
            }
        } catch {
            setErrorMessage('Gagal memulai tryout TKA.')
        } finally {
            if (!isNavigating) {
                releaseSingleFlightLock(startLockRef)
                setLoading(false)
            }
        }
    }

    const label = loading
        ? 'Menyiapkan...'
        : hasActiveAttempt
            ? 'Lanjutkan Tryout'
            : disabledReason || 'Mulai Tryout'

    return (
        <div className="mt-5">
            <button
                type="button"
                onClick={() => void start()}
                disabled={(!hasActiveAttempt && Boolean(disabledReason)) || loading}
                title={hasActiveAttempt ? 'Lanjutkan tryout yang sedang berjalan' : disabledReason || 'Mulai tryout'}
                aria-describedby={errorMessage ? `${examSlug}-start-error` : undefined}
                className="st-focus inline-flex min-h-11 w-full min-w-0 items-center justify-center gap-2 overflow-hidden rounded-lg bg-blue-600 px-4 py-3 text-center text-sm font-black leading-tight text-white shadow-none transition hover:bg-blue-700 shadow-none disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
            >
                {loading ? <LoadingSpinner label="Menyiapkan tryout TKA" size="sm" /> : <Play size={17} className="shrink-0" aria-hidden="true"/>}
                <span className="min-w-0 whitespace-normal break-words">{label}</span>
            </button>
            {errorMessage && (
                <p id={`${examSlug}-start-error`} role="alert" className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-black text-red-700">
                    {errorMessage}
                </p>
            )}
        </div>
    )
}
