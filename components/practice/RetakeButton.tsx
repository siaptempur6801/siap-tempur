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
                toast.success(result.resumed ? 'Melanjutkan sesi tersimpan.' : 'Sesi baru dimulai!')
                router.push(`/cpns/dashboard/latihan/${result.sessionId}`)
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
            className="flex justify-center items-center gap-3 px-8 py-4 rounded-2xl border-2 border-gray-900 bg-white hover:bg-gray-50 text-gray-900 font-black text-xl transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {isLoading ? (
                <Loader2 size={24} className="animate-spin" />
            ) : (
                <RefreshCw size={24} />
            )}
            {isLoading ? 'Memulai...' : 'Ulangi Latihan'}
        </button>
    )
}
