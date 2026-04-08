'use client'

import React from 'react'
import { X, CheckCircle, Clock, AlertCircle } from 'lucide-react'

interface MockSnapModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    onPending: () => void
    onError: () => void
    orderId: string
    amount: number
    packageName: string
}

export default function MockSnapModal({
    isOpen,
    onClose,
    onSuccess,
    onPending,
    onError,
    orderId,
    amount,
    packageName
}: MockSnapModalProps) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border-2 border-gray-100">
                {/* Header */}
                <div className="bg-white px-6 py-4 border-b flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-black tracking-wide text-gray-500 uppercase">
                            Midtrans Mock
                        </span>
                        <span className="text-xs font-bold text-gray-400 border border-gray-200 px-1.5 py-0.5 rounded bg-gray-50">TEST MODE</span>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    <div className="text-center mb-6">
                        <p className="text-gray-500 text-sm mb-1">Total Payment</p>
                        <h2 className="text-3xl font-bold text-gray-900 font-mono">
                            Rp {amount.toLocaleString('id-ID')}
                        </h2>
                        <p className="text-sm text-gray-500 mt-2 bg-gray-50 py-1 px-3 rounded-full inline-block border border-gray-100">
                            Order ID: <span className="font-mono text-gray-700">{orderId}</span>
                        </p>
                        <p className="mt-2 text-sm font-semibold text-gray-700">{packageName}</p>
                    </div>

                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
                        <h3 className="font-bold text-blue-900 text-sm mb-1">Pembayaran Mock (Simulasi)</h3>
                        <p className="text-xs text-blue-700 leading-relaxed">
                            Karena ini mode testing, Anda bisa memilih hasil pembayaran tanpa keluar uang asli.
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="space-y-3">
                        <button
                            onClick={onSuccess}
                            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.98]"
                        >
                            <CheckCircle size={18} />
                            Bayar Sekarang (Success)
                        </button>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={onPending}
                                className="py-3 bg-white border border-yellow-400 text-yellow-700 hover:bg-yellow-50 rounded-lg font-bold flex items-center justify-center gap-2 transition-all"
                            >
                                <Clock size={16} />
                                Pending
                            </button>
                            <button
                                onClick={onError}
                                className="py-3 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-lg font-bold flex items-center justify-center gap-2 transition-all"
                            >
                                <AlertCircle size={16} />
                                Gagal
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-3 border-t text-center">
                    <p className="text-[10px] text-gray-400">
                        Secure Payment by Mocktrans (Siap Tempur Simulation)
                    </p>
                </div>
            </div>
        </div>
    )
}
