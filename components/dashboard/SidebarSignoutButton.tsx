'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface SidebarSignoutButtonProps {
    signoutAction: () => Promise<{ success: boolean }>
}

export default function SidebarSignoutButton({ signoutAction }: SidebarSignoutButtonProps) {
    const router = useRouter()
    const [showModal, setShowModal] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const handleSignout = async () => {
        setIsLoading(true)
        const result = await signoutAction()
        if (result?.success) {
            toast.success('Berhasil keluar!', {
                description: 'Sampai jumpa lagi!'
            })
            // Delay redirect to allow toast to be seen
            setTimeout(() => {
                window.location.href = '/'
            }, 1500)
        } else {
            setIsLoading(false)
        }
    }

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-3 px-4 py-2 font-handwriting text-xl font-bold text-red-600 hover:bg-red-50 rounded-md w-full transition border-2 border-transparent hover:border-red-200 hover:shadow-sm"
            >
                <LogOut size={20} />
                Keluar
            </button>

            {/* Logout Confirmation Modal */}
            {showModal && mounted && createPortal(
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-[#fff9c4] border-2 border-gray-900 rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-sm w-full p-8 animate-in zoom-in-95 duration-200 relative overflow-hidden">
                        {/* Tape Effect */}
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-32 h-8 bg-red-100/80 border-l border-r border-white/50 shadow-sm -rotate-2"></div>

                        <div className="relative z-10 flex flex-col items-center text-center space-y-4 font-handwriting">
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
                                    className="px-4 py-2 rounded-lg border-2 border-gray-900 bg-white hover:bg-gray-50 transition font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleSignout}
                                    disabled={isLoading}
                                    className="px-4 py-2 rounded-lg bg-red-600 text-white border-2 border-gray-900 hover:bg-red-700 transition font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? 'Keluar...' : 'Ya, Keluar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    )
}
