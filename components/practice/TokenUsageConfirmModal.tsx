'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, Loader2, Ticket } from 'lucide-react'
import { TRYOUT_TOKEN_COST } from '@/lib/constants'

type TokenUsageConfirmModalProps = {
    isOpen: boolean
    title: string
    description: string
    details: Array<{ label: string; value: string | number }>
    quota: number
    confirmLabel?: string
    isLoading: boolean
    onConfirm: () => void
    onCancel: () => void
}

export default function TokenUsageConfirmModal({
    isOpen,
    title,
    description,
    details,
    quota,
    confirmLabel = `Gunakan ${TRYOUT_TOKEN_COST} Token`,
    isLoading,
    onConfirm,
    onCancel,
}: TokenUsageConfirmModalProps) {
    const remainingQuota = Math.max(0, quota - TRYOUT_TOKEN_COST)

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm font-handwriting">
                    <motion.div
                        initial={{ scale: 0.92, opacity: 0, y: 16 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.92, opacity: 0, y: 16 }}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="token-confirm-title"
                        className="w-full max-w-md border-4 border-gray-900 bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
                    >
                        <div className="border-b-4 border-gray-900 bg-yellow-300 px-5 py-4">
                            <div className="flex items-center gap-3">
                                <AlertTriangle className="h-7 w-7 shrink-0 text-gray-900" />
                                <h2 id="token-confirm-title" className="text-2xl font-black text-gray-900">
                                    Konfirmasi Token
                                </h2>
                            </div>
                        </div>

                        <div className="space-y-5 p-5">
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black text-gray-900">{title}</h3>
                                <p className="font-sans text-sm font-semibold leading-relaxed text-gray-600">
                                    {description}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3 font-sans">
                                {details.map((detail) => (
                                    <div key={detail.label} className="border-2 border-gray-200 bg-gray-50 p-3 text-center">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                            {detail.label}
                                        </p>
                                        <p className="mt-1 text-xl font-black text-gray-900">{detail.value}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-2 gap-3 font-sans">
                                <div className="border-2 border-blue-300 bg-blue-50 p-3">
                                    <div className="flex items-center gap-2 text-blue-700">
                                        <Ticket size={16} />
                                        <p className="text-[10px] font-black uppercase tracking-widest">Token Saat Ini</p>
                                    </div>
                                    <p className="mt-1 text-2xl font-black text-gray-900">{quota}</p>
                                </div>
                                <div className="border-2 border-red-300 bg-red-50 p-3">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-red-700">Setelah Mulai</p>
                                    <p className="mt-1 text-2xl font-black text-gray-900">{remainingQuota}</p>
                                </div>
                            </div>

                            <p className="border-2 border-dashed border-gray-300 bg-gray-50 px-3 py-2 font-sans text-xs font-bold leading-relaxed text-gray-500">
                                Token hanya dipakai untuk sesi baru. Kalau sesi sudah tersimpan, lanjutkan sesi tidak memakai token tambahan.
                            </p>

                            <div className="flex flex-col gap-3 pt-1 sm:flex-row">
                                <button
                                    type="button"
                                    onClick={onCancel}
                                    disabled={isLoading}
                                    className="flex-1 border-2 border-gray-900 bg-white px-4 py-3 font-black text-gray-900 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    Batal
                                </button>
                                <button
                                    type="button"
                                    onClick={onConfirm}
                                    disabled={isLoading}
                                    className="flex flex-1 items-center justify-center gap-2 border-2 border-gray-900 bg-blue-600 px-4 py-3 font-black text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition hover:translate-x-px hover:translate-y-px hover:shadow-none disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Ticket size={18} />}
                                    {isLoading ? 'Memulai...' : confirmLabel}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
