import { isAdmin } from '@/utils/admin'
import { redirect } from 'next/navigation'
import React from 'react'

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
        <div className="flex flex-col gap-6">
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-sm">
                <p className="font-bold flex items-center gap-2">
                    🛡️ Admin Mode Active
                </p>
                <p className="text-sm">Anda sedang dalam mode Administrator. Harap berhati-hati dalam mengubah data.</p>
            </div>
            {children}
        </div>
    )
}
