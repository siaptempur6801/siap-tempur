'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BrainCircuit } from 'lucide-react'
import { startTkaSmpDiagnostic } from '@/app/actions/tka-diagnostic'
import { trackProductEvent } from '@/lib/product-analytics'
import { LoadingSpinner } from '@/components/ui/LoadingState'

export default function TkaDiagnosticStartButton({
    disabledReason,
}: {
    disabledReason?: string | null
}) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const start = async () => {
        if (loading || disabledReason) return
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
                return
            }
            if (result?.sessionId) {
                trackProductEvent('px_exam_start', {
                    program: 'tka_smp',
                    surface: 'diagnostic',
                    mode: 'diagnostic',
                })
                router.push(`/tka/smp/diagnostic/${result.sessionId}`)
            }
        } catch {
            setError('Tes diagnostik belum dapat dimulai.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div>
            <button
                type="button"
                onClick={() => void start()}
                disabled={Boolean(disabledReason) || loading}
                className="st-focus inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-black text-white shadow-[0_10px_24px_rgba(79,70,229,0.2)] transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none sm:w-auto"
            >
                {loading ? <LoadingSpinner label="Menyiapkan tes diagnostik" size="sm" /> : <BrainCircuit size={17} />}
                {loading ? 'Menyiapkan tes...' : disabledReason || 'Mulai Tes Diagnostik'}
            </button>
            {error && <p role="alert" className="mt-2 text-sm font-bold text-red-700">{error}</p>}
        </div>
    )
}
