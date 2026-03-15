'use client'

import React, { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import PaperBackground from '@/components/PaperBackground'
import { motion } from 'framer-motion'
import Link from 'next/link'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error(error)
    }, [error])

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 relative bg-[#fdfbf7] overflow-hidden font-handwriting">
            <PaperBackground />

            <div className="relative z-10 max-w-md w-full text-center">
                {/* Error Sketchy Illustration */}
                <motion.div
                    initial={{ rotate: 3, scale: 0.9, opacity: 0 }}
                    animate={{ rotate: 0, scale: 1, opacity: 1 }}
                    className="mb-8 relative inline-block"
                >
                    <div className="absolute -inset-4 bg-red-100/50 rotate-2 rounded-sm z-0"></div>
                    <div className="relative z-10 bg-white border-4 border-gray-900 p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                        <div className="flex items-center justify-center mb-4">
                            <div className="w-20 h-20 bg-red-100 border-4 border-red-600 rounded-full flex items-center justify-center animate-pulse">
                                <AlertTriangle size={40} className="text-red-600" />
                            </div>
                        </div>
                        <h2 className="text-4xl font-black text-gray-900 block mb-2 uppercase">Aduh!</h2>
                        <span className="text-xl font-bold text-red-600 uppercase tracking-widest">Sistem Lelah</span>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Ada Kesalahan Teknis...</h2>
                    <p className="text-lg text-gray-600 mb-8 italic">
                        Sepertinya server kami sedang butuh istirahat sejenak. Jangan biarkan ini mematahkan semangat belajarmu!
                    </p>

                    <div className="flex flex-col gap-4">
                        <button
                            onClick={() => reset()}
                            className="flex items-center justify-center gap-3 px-8 py-4 bg-blue-600 text-white border-2 border-gray-900 text-2xl font-bold shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
                        >
                            <RefreshCw size={24} />
                            Coba Lagi
                        </button>

                        <Link
                            href="/cpns/dashboard"
                            className="flex items-center justify-center gap-3 px-8 py-4 bg-white text-gray-900 border-2 border-gray-900 text-xl font-bold hover:bg-gray-50 transition-colors"
                        >
                            <Home size={20} />
                            Ke Dashboard
                        </Link>
                    </div>

                    {process.env.NODE_ENV === 'development' && (
                        <div className="mt-8 p-4 bg-red-50 border-2 border-dashed border-red-200 text-left overflow-auto max-h-40 font-mono text-xs text-red-800">
                            <p className="font-bold mb-2 uppercase tracking-widest">Debug Info:</p>
                            <pre>{error.message}</pre>
                            {error.digest && <p className="mt-2 opacity-50">Digest: {error.digest}</p>}
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    )
}
