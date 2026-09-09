'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BrainCircuit } from 'lucide-react'
import { startTkaSmpDiagnostic } from '@/app/actions/tka-diagnostic'
import { trackProductEvent } from '@/lib/product-analytics'
import { LoadingSpinner } from '@/components/ui/LoadingState'
import { acquireSingleFlightLock, releaseSingleFlightLock } from '@/lib/single-flight-lock'

export default function TkaDiagnosticStartButton({
    disabledReason,
}: {
    disabledReason?: string | null
}) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const startLockRef = useRef(false)

    const start = async () => {
        if (disabledReason || !acquireSingleFlightLock(startLockRef)) return
        let isNavigating = false
        setLoading(true)
        setError(null)
        try {
            const result = await startTkaSmpDiagnostic()
            if (result?.error) {
                setError(result.error)
                return
            }
            if (result?.completedId) {
                router.push(`/tka/smp/diagnostic/${result.completedId}/result`)
                isNavigating = true
                return
            }
            if (result?.sessionId) {
                trackProductEvent('px_exam_start', {
                    program: 'tka_smp',
                    surface: 'diagnostic',
                    mode: 'diagnostic',
                })
                router.push(`/tka/smp/diagnostic/${result.sessionId}`)
                isNavigating = true
            }
        } catch {
            setError('Tes diagnostik belum dapat dimulai.')
        } finally {
            if (!isNavigating) {
                releaseSingleFlightLock(startLockRef)
                setLoading(false)
            }
        }
    }

    return (
        <div>
            <button
                type="button"
                onClick={() => void start()}
                disabled={Boolean(disabledReason) || loading}
                className="st-focus inline-flex min-h-11 w-full items-center justify-center gap-2.5 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-sm shadow-indigo-600/20 transition-all duration-150 hover:bg-indigo-700 hover:shadow-md hover:shadow-indigo-600/25 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none sm:w-auto"
            >
                {loading ? <LoadingSpinner label="Menyiapkan tes diagnostik" size="sm" /> : <BrainCircuit size={17} aria-hidden="true" />}
                <span>{loading ? 'Menyiapkan tes...' : disabledReason || 'Mulai Tes Diagnostik'}</span>
            </button>
            {error && <p role="alert" className="mt-2 text-sm font-bold text-red-700">{error}</p>}
        </div>
    )
}
