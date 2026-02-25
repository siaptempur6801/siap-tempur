import { isAdmin } from '@/utils/admin'
import { redirect } from 'next/navigation'
import React from 'react'
import { ShieldAlert } from 'lucide-react'

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const isUserAdmin = await isAdmin()

    if (!isUserAdmin) {
        redirect('/dashboard')
    }

    return (
        <div className="flex flex-col gap-8">
            <div className="bg-red-50 border-2 border-red-500/20 text-red-700 p-5 rounded-3xl shadow-[4px_4px_0px_0px_rgba(239,68,68,0.1)] flex items-start gap-4">
                <div className="bg-red-500 text-white p-2.5 rounded-2xl shadow-sm shrink-0">
                    <ShieldAlert size={24} />
                </div>
                <div>
                    <p className="font-handwriting text-xl font-black mb-0.5">Admin Mode Active</p>
                    <p className="text-sm font-medium opacity-80 font-body">Anda sedang dalam mode Administrator. Harap berhati-hati dalam mengubah data kritikal.</p>
                </div>
            </div>
            {children}
        </div>
    )
}
