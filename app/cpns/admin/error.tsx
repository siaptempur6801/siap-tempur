'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

export default function AdminError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error('Admin Panel Error:', error)
    }, [error])

    return (
        <div className="w-full flex-1 flex flex-col items-center justify-center min-h-[60vh] bg-gray-50 p-6">
            <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-sm border border-red-200 text-center space-y-6">
                <div className="flex justify-center">
                    <div className="p-4 bg-red-100 rounded-full">
                        <AlertTriangle className="w-12 h-12 text-red-600" />
                    </div>
                </div>
                
                <h2 className="text-2xl font-bold text-gray-900">Kesalahan Sistem Admin</h2>
                
                <p className="text-gray-600">
                    Terjadi kesalahan saat memuat komponen admin. Pastikan Anda memiliki koneksi yang stabil dan akses yang valid.
                </p>

                <div className="p-4 bg-gray-100 rounded-lg text-left overflow-auto">
                    <code className="text-xs text-red-600 font-mono break-all">
                        {error.message || "Unknown error"}
                    </code>
                </div>

                <button
                    onClick={() => reset()}
                    className="w-full flex items-center justify-center py-3 px-4 gap-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
                >
                    <RotateCcw className="w-5 h-5" />
                    Coba Muat Ulang
                </button>
            </div>
        </div>
    )
}
