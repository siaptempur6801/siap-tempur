'use client'

import { LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface SidebarSignoutButtonProps {
    signoutAction: () => Promise<{ success: boolean }>
}

export default function SidebarSignoutButton({ signoutAction }: SidebarSignoutButtonProps) {
    const router = useRouter()

    const handleSignout = async () => {
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
    }

    return (
        <button
            onClick={handleSignout}
            className="flex items-center gap-3 px-4 py-2 text-sm text-red-500 hover:bg-red-500/10 rounded-lg w-full transition"
        >
            <LogOut size={18} />
            Keluar
        </button>
    )
}
