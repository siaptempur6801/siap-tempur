'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, Loader2 } from 'lucide-react'
import { startMiniTryout, startTryout } from '@/app/actions/practice'
import { toast } from 'sonner'
import { MINI_TRYOUT_PRODUCTS, TRYOUT_TOKEN_COST } from '@/lib/constants'
import TokenUsageConfirmModal from './TokenUsageConfirmModal'
import { acquireSingleFlightLock, releaseSingleFlightLock } from '@/lib/single-flight-lock'

interface RetakeButtonProps {
    isCombined: boolean
    singleType?: 'TWK' | 'TIU' | 'TKP' | null
    quota: number
}

export default function RetakeButton({ isCombined, singleType, quota }: RetakeButtonProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [showTokenConfirm, setShowTokenConfirm] = useState(false)
    const retakeLockRef = useRef(false)
    const router = useRouter()

    const handleRetake = async () => {
        if (!acquireSingleFlightLock(retakeLockRef)) return
        let isNavigating = false
        setIsLoading(true)
        try {
            let result
            if (isCombined) {
                result = await startTryout()
            } else if (singleType) {
                result = await startMiniTryout(singleType)
            } else {
                toast.error('Invalid practice type')
                return
            }

            if (result.error) {
                toast.error(result.error)
            } else if (result.sessionId) {
                toast.success(result.resumed ? 'Melanjutkan sesi tersimpan.' : isCombined ? 'Tryout baru dimulai!' : 'Mini tryout baru dimulai!')
                router.push(`/cpns/dashboard/tryout/${result.sessionId}`)
                isNavigating = true
            }
        } catch (error) {
            console.error('Failed to retake:', error)
            toast.error('Terjadi kesalahan saat memulai ulang tryout')
        } finally {
            if (!isNavigating) {
                releaseSingleFlightLock(retakeLockRef)
                setIsLoading(false)
            }
        }
    }

    const requestRetake = () => {
        if (quota < TRYOUT_TOKEN_COST) {
            toast.error('Token habis!', {
                description: 'Ulangi tryout membutuhkan 1 token untuk membuat sesi baru.',
                action: {
                    label: 'Beli Token',
                    onClick: () => router.push('/cpns/dashboard/beli-paket'),
                },
            })
            return
        }

        setShowTokenConfirm(true)
    }

    const miniProduct = singleType
        ? MINI_TRYOUT_PRODUCTS.find((product) => product.type === singleType) ?? null
        : null
    const title = isCombined
        ? 'Ulangi Full Tryout SKD?'
        : `Ulangi ${miniProduct?.title ?? 'Mini Tryout'}?`
    const description = isCombined
        ? `Sesi full tryout baru akan memakai ${TRYOUT_TOKEN_COST} token dari saldo kamu.`
        : `Sesi mini tryout baru akan memakai ${TRYOUT_TOKEN_COST} token dari saldo kamu.`
    const details = isCombined
        ? [
            { label: 'Soal', value: 110 },
            { label: 'Durasi', value: '100 Menit' },
        ]
        : [
            { label: 'Soal', value: miniProduct?.questionCount ?? '-' },
            { label: 'Kategori', value: singleType ?? '-' },
        ]

    return (
        <>
            <button
                onClick={requestRetake}
                disabled={isLoading}
                className="flex justify-center items-center gap-3 px-8 py-4 rounded-2xl border-2 border-gray-900 bg-white hover:bg-gray-50 text-gray-900 font-black text-xl transition-all st-shadow-md active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isLoading ? (
                    <Loader2 size={24} className="animate-spin" />
                ) : (
                    <RefreshCw size={24} />
                )}
                {isLoading ? 'Memulai...' : isCombined ? 'Ulangi Tryout' : 'Ulangi Mini Tryout'}
            </button>

            <TokenUsageConfirmModal
                isOpen={showTokenConfirm}
                title={title}
                description={description}
                details={details}
                quota={quota}
                isLoading={isLoading}
                onCancel={() => !isLoading && setShowTokenConfirm(false)}
                onConfirm={handleRetake}
            />
        </>
    )
}
