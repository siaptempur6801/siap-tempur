'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Play } from 'lucide-react'
import { toast } from 'sonner'
import { startTkaExam } from '@/app/actions/tka-practice'
import { trackProductEvent } from '@/lib/product-analytics'

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
                className="inline-flex min-h-11 w-full min-w-0 items-center justify-center gap-2 overflow-hidden rounded-xl border border-emerald-600 bg-emerald-600 px-4 py-2.5 text-center text-sm font-semibold leading-tight text-white shadow-sm transition-colors hover:border-emerald-700 hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500 disabled:shadow-none"
            >
                {loading ? <Loader2 size={17} className="shrink-0 animate-spin" aria-hidden="true"/> : <Play size={17} className="shrink-0" aria-hidden="true"/>}
                <span className="min-w-0 whitespace-normal break-words">{label}</span>
            </button>
            {errorMessage && (
                <p id={`${examSlug}-start-error`} role="alert" className="mt-2 text-sm font-semibold text-red-700">
                    {errorMessage}
                </p>
            )}
        </div>
    )
}
