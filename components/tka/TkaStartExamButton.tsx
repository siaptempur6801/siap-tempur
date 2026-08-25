'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Play } from 'lucide-react'
import { toast } from 'sonner'
import { startTkaExam } from '@/app/actions/tka-practice'

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
        <div className="mt-4">
            <button
                type="button"
                onClick={() => void start()}
                disabled={Boolean(disabledReason) || loading}
                title={disabledReason || 'Mulai tryout'}
                aria-describedby={errorMessage ? `${examSlug}-start-error` : undefined}
                className="inline-flex w-full min-w-0 items-center justify-center gap-2 overflow-hidden border-2 border-gray-900 bg-blue-700 px-4 py-2.5 text-center font-black leading-tight text-white shadow-[3px_3px_0_0_#111] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600 disabled:shadow-none"
            >
                {loading ? <Loader2 size={18} className="shrink-0 animate-spin" /> : <Play size={18} className="shrink-0" />}
                <span className="min-w-0 whitespace-normal break-words">{label}</span>
            </button>
            {errorMessage && (
                <p id={`${examSlug}-start-error`} role="alert" className="mt-2 text-sm font-bold text-red-700">
                    {errorMessage}
                </p>
            )}
        </div>
    )
}
