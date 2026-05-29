'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import PaperBackground from '@/components/PaperBackground'

export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error('Dashboard Error:', error)
    }, [error])

    return (
        <div className="w-full flex-1 flex flex-col relative font-body items-center justify-center min-h-[60vh]">
            <PaperBackground variant="light" />
            
            <div className="relative z-10 text-center space-y-6 max-w-lg p-8 bg-white border-2 border-gray-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-xl rotate-1">
                {/* Tape Effect */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-32 h-8 bg-red-100/80 border-l border-r border-white/50 shadow-sm -rotate-2"></div>

                <div className="flex justify-center">
                    <AlertTriangle className="w-20 h-20 text-red-500 animate-pulse" />
                </div>
                
                <h2 className="font-handwriting text-4xl font-bold text-gray-900">Waduh, Ada Masalah!</h2>
                
                <p className="font-handwriting text-xl text-gray-600">
                    Sepertinya ada gangguan pada komponen dashboard ini. Jangan panik, cukup muat ulang.
                </p>

                <button
                    onClick={() => reset()}
                    className="mt-4 flex items-center justify-center w-full py-4 gap-2 font-handwriting text-2xl font-bold rounded-lg transition-all cursor-pointer shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] bg-red-500 text-white border-2 border-gray-900"
                >
                    <RotateCcw className="w-6 h-6" />
                    Coba Lagi
                </button>
            </div>
        </div>
    )
}
