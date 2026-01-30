'use client'

import { useState, useRef, useEffect } from 'react'
import { LogOut, User, Crown } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface MobileProfileDropdownProps {
    user: any
    profile: any
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

    const displayName = profile?.full_name || user.user_metadata?.full_name || 'User'
    const isPremium = profile?.subscription_status === 'premium'
    const avatarUrl = profile?.avatar_url

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden border border-border hover:ring-2 hover:ring-primary/20 transition-all"
            >
                {avatarUrl ? (
                    <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                    <span className="text-sm font-bold text-primary">{user.email?.[0]?.toUpperCase()}</span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-background border border-border rounded-xl shadow-xl z-50 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
                    <div className="p-4 border-b border-border bg-secondary/10">
                        <p className="font-bold text-base truncate">{displayName}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>

                        <div className="mt-2.5">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase inline-flex items-center gap-1 ${isPremium
                                ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30'
                                : 'bg-secondary text-muted-foreground border border-border'
                                }`}>
                                {isPremium ? <Crown size={10} className="fill-current" /> : null}
                                {isPremium ? 'PREMIUM MEMBER' : 'FREE MEMBER'}
                            </span>
                        </div>
                    </div>

                    <div className="p-2">
                        <Link
                            href="/dashboard/profile"
                            className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg hover:bg-secondary transition-colors"
                            onClick={() => setIsOpen(false)}
                        >
                            <User size={16} />
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
                            className="flex w-full items-center gap-3 px-3 py-2.5 text-sm text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                            <LogOut size={16} />
                            Keluar
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
