'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, Loader2 } from 'lucide-react'
import { startPractice, startTryout } from '@/app/actions/practice'
import { toast } from 'sonner'

interface RetakeButtonProps {
    isCombined: boolean
    singleType?: 'TWK' | 'TIU' | 'TKP' | null
}

export default function RetakeButton({ isCombined, singleType }: RetakeButtonProps) {
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    const handleRetake = async () => {
        setIsLoading(true)
        try {
            let result
            if (isCombined) {
                result = await startTryout()
            } else if (singleType) {
                result = await startPractice(singleType)
            } else {
                toast.error('Invalid practice type')
                return
            }

            if (result.error) {
                toast.error(result.error)
            } else if (result.sessionId) {
                toast.success('Sesi baru dimulai!')
                router.push(`/dashboard/latihan/${result.sessionId}`)
            }
        } catch (error) {
            console.error('Failed to retake:', error)
            toast.error('Terjadi kesalahan saat memulai ulang latihan')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <button
            onClick={handleRetake}
            disabled={isLoading}
            className="flex justify-center items-center gap-2 px-6 py-3 rounded-xl border border-primary text-primary hover:bg-primary/5 font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {isLoading ? (
                <Loader2 size={18} className="animate-spin" />
            ) : (
                <RefreshCw size={18} />
            )}
            {isLoading ? 'Memulai...' : 'Ulangi Latihan'}
        </button>
    )
}
