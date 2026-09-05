'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dumbbell } from 'lucide-react'
import { toast } from 'sonner'
import { startTkaDrill } from '@/app/actions/tka-practice'
import { trackProductEvent } from '@/lib/product-analytics'
import { LoadingSpinner } from '@/components/ui/LoadingState'

export default function TkaStartDrillButton({
    level,
    subjectCode,
    knowledgeNodeName,
    disabledReason,
}: {
    level: string
    subjectCode: string
    knowledgeNodeName: string
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
            const result = await startTkaDrill(level, subjectCode, knowledgeNodeName)
            if (result?.error) {
                setErrorMessage(result.error)
                return
            }
            if (result?.success && result.sessionId) {
                trackProductEvent('px_exam_start', {
                    program: 'tka_smp',
                    surface: 'diagnostic',
                    mode: 'latihan_fokus',
                    cta: 'diagnostic_recommendation_drill',
                })
                toast.success(result.resumed ? 'Melanjutkan latihan fokus tersimpan.' : `Latihan ${knowledgeNodeName} dimulai!`)
                router.push(`/tka/${level.toLowerCase()}/tryout/${result.sessionId}`)
            }
        } catch {
            setErrorMessage('Gagal memulai latihan fokus.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="mt-4">
            <button
                type="button"
                data-testid="diagnostic-start-drill"
                onClick={() => void start()}
                disabled={Boolean(disabledReason) || loading}
                aria-label={`Latih topik ${knowledgeNodeName}`}
                aria-describedby={errorMessage ? `drill-${subjectCode}-${knowledgeNodeName}-error` : undefined}
                className="st-focus inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white shadow-[0_8px_18px_rgba(79,70,229,0.18)] transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
            >
                {loading ? <LoadingSpinner label="Menyiapkan latihan" size="sm" /> : <Dumbbell size={16} aria-hidden="true" />}
                {loading ? 'Menyiapkan latihan...' : 'Latih topik ini'}
            </button>
            <p className="mt-2 text-center text-[11px] font-bold text-slate-400">10 soal fokus · sekitar 15 menit</p>
            {errorMessage && (
                <p id={`drill-${subjectCode}-${knowledgeNodeName}-error`} role="alert" className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-black text-red-700">
                    {errorMessage}
                </p>
            )}
        </div>
    )
}
