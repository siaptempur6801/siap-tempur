'use client'

import { useState, useRef, useEffect } from 'react'
import { LogOut, User, Crown, Ticket, GraduationCap } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface MobileProfileDropdownProps {
    user: {
        email?: string
        user_metadata?: {
            full_name?: string
        }
    }
    profile: {
        avatar_url?: string
        full_name?: string
        tryout_quota?: number
        tryout_quota_utbk?: number
    } | null
    signoutAction: () => Promise<{ success: boolean }>
}

export default function MobileProfileDropdown({ user, profile, signoutAction }: MobileProfileDropdownProps) {
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [])

    const displayName = profile?.full_name ||
        user.user_metadata?.full_name ||
        (user as any).user_metadata?.name ||
        'Pejuang Tryout'
    const avatarUrl = profile?.avatar_url

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-10 h-10 rounded-full bg-white border-2 border-gray-900 flex items-center justify-center overflow-hidden hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
            >
                {avatarUrl ? (
                    <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                    <span className="text-sm font-bold font-handwriting text-gray-900">{user.email?.[0]?.toUpperCase() || '?'}</span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-lg z-50 animate-in fade-in zoom-in-95 duration-200 overflow-hidden font-handwriting">
                    {/* Pattern Overlay */}
                    <div className="absolute inset-0 opacity-10 pointer-events-none z-0" style={{ backgroundImage: "radial-gradient(#000 1px, transparent 1px)", backgroundSize: "10px 10px" }}></div>

                    <div className="p-4 border-b-2 border-gray-900 bg-yellow-50 relative z-10">
                        <p className="font-bold text-xl truncate text-gray-900">{displayName}</p>
                        <p className="text-sm text-gray-600 truncate font-sans">{user.email}</p>

                        <div className="mt-2.5 flex items-center gap-2">
                            <span className="text-xs px-2 py-0.5 font-bold uppercase inline-flex items-center gap-1 border border-gray-900 bg-blue-100 text-blue-900 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                                <Ticket size={12} className="fill-current" />
                                {profile?.tryout_quota ?? 0}
                            </span>
                            <span className="text-xs px-2 py-0.5 font-bold uppercase inline-flex items-center gap-1 border border-gray-900 bg-pink-100 text-pink-900 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                                <GraduationCap size={12} className="fill-current" />
                                {profile?.tryout_quota_utbk ?? 0}
                            </span>
                        </div>
                    </div>

                    <div className="p-2 relative z-10">
                        <Link
                            href="/dashboard/profile"
                            className="flex items-center gap-3 px-3 py-2.5 text-lg font-bold text-gray-700 rounded-md hover:bg-blue-50 hover:text-blue-600 transition-colors"
                            onClick={() => setIsOpen(false)}
                        >
                            <User size={18} />
                            Profil Saya
                        </Link>

                        <button
                            onClick={async () => {
                                const result = await signoutAction()
                                if (result?.success) {
                                    toast.success('Berhasil keluar!', {
                                        description: 'Sampai jumpa lagi!'
                                    })
                                    // Delay redirect to allow toast to be seen
                                    setTimeout(() => {
                                        window.location.href = '/'
                                    }, 1500)
                                }
                            }}
                            className="flex w-full items-center gap-3 px-3 py-2.5 text-lg font-bold text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        >
                            <LogOut size={18} />
                            Keluar
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
