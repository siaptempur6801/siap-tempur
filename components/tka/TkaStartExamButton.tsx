'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Play } from 'lucide-react'
import { toast } from 'sonner'
import { startTkaExam } from '@/app/actions/tka-practice'
import { trackProductEvent } from '@/lib/product-analytics'
import { LoadingSpinner } from '@/components/ui/LoadingState'

export default function TkaStartExamButton({
    level,
    examSlug,
    disabledReason,
}: {
    level: string
    examSlug: string
    disabledReason?: string | null
}) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    const start = async () => {
        if (disabledReason || loading) return
        setLoading(true)
        setErrorMessage(null)
        try {
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
            }
        } catch {
            setErrorMessage('Gagal memulai tryout TKA.')
        } finally {
            setLoading(false)
        }
    }

    const label = loading ? 'Menyiapkan...' : disabledReason || 'Mulai Tryout'

    return (
        <div className="mt-5">
            <button
                type="button"
                onClick={() => void start()}
                disabled={Boolean(disabledReason) || loading}
                title={disabledReason || 'Mulai tryout'}
                aria-describedby={errorMessage ? `${examSlug}-start-error` : undefined}
                className="st-focus inline-flex min-h-11 w-full min-w-0 items-center justify-center gap-2 overflow-hidden rounded-xl bg-indigo-600 px-4 py-3 text-center text-sm font-black leading-tight text-white shadow-[0_10px_22px_rgba(79,70,229,0.22)] transition hover:bg-indigo-700 hover:shadow-[0_12px_26px_rgba(79,70,229,0.28)] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
            >
                {loading ? <LoadingSpinner label="Menyiapkan tryout TKA" size="sm" /> : <Play size={17} className="shrink-0" aria-hidden="true"/>}
                <span className="min-w-0 whitespace-normal break-words">{label}</span>
            </button>
            {errorMessage && (
                <p id={`${examSlug}-start-error`} role="alert" className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-black text-red-700">
                    {errorMessage}
                </p>
            )}
        </div>
    )
}
