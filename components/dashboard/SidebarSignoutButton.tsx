'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { LogOut } from 'lucide-react'

interface SidebarSignoutButtonProps {
    signoutAction: (redirectTo?: string) => Promise<{ success: boolean }>
    redirectTo?: string
    compact?: boolean
    variant?: 'brand' | 'soft'
}

export default function SidebarSignoutButton({
    signoutAction,
    redirectTo = '/',
    compact = false,
    variant = 'brand',
}: SidebarSignoutButtonProps) {
    const [showModal, setShowModal] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [mounted, setMounted] = useState(false)
    const soft = variant === 'soft'

    useEffect(() => {
        const timer = setTimeout(() => setMounted(true), 0)
        return () => clearTimeout(timer)
    }, [])

    const handleSignout = async () => {
        setIsLoading(true)
        const result = await signoutAction(redirectTo)
        if (!result?.success) {
            setIsLoading(false)
        }
    }

    return (
        <>
            <button
                type="button"
                onClick={() => setShowModal(true)}
                aria-label={compact ? 'Keluar' : undefined}
                className={compact
                    ? soft
                        ? 'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition'
                        : 'st-focus flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-700 transition hover:bg-red-100'
                    : soft
                        ? 'inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition'
                        : 'flex min-h-9 w-full items-center gap-2 rounded-md border-2 border-transparent px-3 py-1.5 font-display text-sm font-bold text-red-600 transition hover:border-red-200 hover:bg-red-50 hover:shadow-sm'}
            >
                <LogOut size={soft ? 14 : 16} />
                {compact ? null : 'Keluar'}
            </button>

            {/* Logout Confirmation Modal */}
            {showModal && mounted && createPortal(
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
                    {soft ? (
                        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xl max-w-sm w-full p-6 text-center animate-in zoom-in-95 duration-200 relative">
                            <div className="w-12 h-12 bg-rose-50 text-rose-600 ring-1 ring-rose-200/70 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-2xs">
                                <LogOut size={22} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-950">Yakin ingin keluar?</h3>
                            <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                                Kamu akan keluar dari sesi TKA. Jawaban tryout yang sedang berlangsung tersimpan aman di akunmu.
                            </p>
                            <div className="grid grid-cols-2 gap-2.5 w-full mt-5">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    disabled={isLoading}
                                    className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs transition active:scale-[0.98]"
                                >
                                    Batal
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSignout}
                                    disabled={isLoading}
                                    className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? 'Keluar...' : 'Ya, Keluar'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-[#fff9c4] border-2 border-gray-900 rounded-xl st-shadow-lg max-w-sm w-full p-8 animate-in zoom-in-95 duration-200 relative overflow-hidden">
                            {/* Tape Effect */}
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-32 h-8 bg-red-100/80 border-l border-r border-white/50 shadow-sm -rotate-2"></div>

                            <div className="relative z-10 flex flex-col items-center text-center space-y-4 font-display">
                                <div className="w-16 h-16 bg-red-100 border-2 border-red-600 rounded-full flex items-center justify-center mb-2 rotate-3 shadow-sm">
                                    <LogOut size={32} className="text-red-600" />
                                </div>

                                <h3 className="text-3xl font-bold text-gray-900">Yakin mau keluar?</h3>

                                <p className="text-lg text-gray-700 font-medium leading-relaxed">
                                    Nanti kangen lho belajar bareng kita. Yakin udah selesai belajarnya?
                                </p>

                                <div className="grid grid-cols-2 gap-4 w-full mt-4">
                                    <button
                                        onClick={() => setShowModal(false)}
                                        disabled={isLoading}
                                        className="px-4 py-2 rounded-lg border-2 border-gray-900 bg-white hover:bg-gray-50 transition font-bold st-shadow-sm active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        onClick={handleSignout}
                                        disabled={isLoading}
                                        className="px-4 py-2 rounded-lg bg-red-600 text-white border-2 border-gray-900 hover:bg-red-700 transition font-bold st-shadow-sm active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        {isLoading ? 'Keluar...' : 'Ya, Keluar'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>,
                document.body
            )}
        </>
    )
}
