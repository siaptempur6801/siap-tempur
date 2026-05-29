import React from 'react'
import { redirect } from 'next/navigation'
import { signout } from '@/app/auth/actions'
import AdminShell from '@/components/admin/AdminShell'
import { createClient } from '@/lib/utils/supabase/server'
import { isAdmin } from '@/lib/utils/admin'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AdminRootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login?next=/cpns/admin')
    }

    const isUserAdmin = await isAdmin()
    if (!isUserAdmin) {
        redirect('/cpns/dashboard')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_url, full_name')
        .eq('id', user.id)
        .maybeSingle()

    return (
        <AdminShell user={user} profile={profile} signoutAction={signout}>
            {children}
        </AdminShell>
    )
}
