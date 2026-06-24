import React from 'react'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { signout } from '@/app/auth/actions'
import AdminShell from '@/components/admin/AdminShell'
import { createClient } from '@/lib/utils/supabase/server'
import { canAccessArticleAdmin, getCurrentUserRole, isAdminRole } from '@/lib/utils/admin'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AdminRootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const pathname = (await headers()).get('x-pathname') || '/cpns/admin'
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login?next=/cpns/admin')
    }

    const actor = await getCurrentUserRole()
    const isArticleRoute = pathname.startsWith('/cpns/admin/articles')
    const canAccessRoute = actor
        ? isAdminRole(actor.role) || (isArticleRoute && canAccessArticleAdmin(actor.role))
        : false

    if (!canAccessRoute) {
        redirect('/cpns/dashboard')
    }

    if (actor && !isAdminRole(actor.role) && pathname === '/cpns/admin') {
        redirect('/cpns/admin/articles')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_url, full_name, role')
        .eq('id', user.id)
        .maybeSingle()

    return (
        <AdminShell user={user} profile={profile} role={actor?.role || profile?.role || 'user'} signoutAction={signout}>
            {children}
        </AdminShell>
    )
}
