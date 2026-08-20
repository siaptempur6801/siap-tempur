import React from 'react'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { signout } from '@/app/auth/actions'
import AdminShell from '@/components/admin/AdminShell'
import { createV2Client } from '@/lib/utils/supabase/server'
import { authorizationService } from '@/src/services/authorization.service'
import { PERMISSIONS } from '@/src/auth/permissions'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AdminRootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createV2Client()
    const pathname = (await headers()).get('x-pathname') || '/cpns/admin'
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login?next=/cpns/admin')
    }

    const authorization = await authorizationService.getAuthorizationForUser(user.id)
    const permissions = new Set(authorization.permissions)
    const isArticleRoute = pathname.startsWith('/cpns/admin/articles')
    const canAccessArticles = [
        PERMISSIONS.CONTENT_READ,
        PERMISSIONS.CONTENT_CREATE,
        PERMISSIONS.CONTENT_UPDATE,
        PERMISSIONS.CONTENT_REVIEW,
        PERMISSIONS.CONTENT_PUBLISH,
    ].some((permission) => permissions.has(permission))
    const canAccessAdmin = permissions.has(PERMISSIONS.ADMIN_ACCESS)

    if (!(canAccessAdmin || (isArticleRoute && canAccessArticles))) {
        redirect('/cpns/dashboard')
    }

    if (!canAccessAdmin && pathname === '/cpns/admin') {
        redirect('/cpns/admin/articles')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_url, full_name')
        .eq('id', user.id)
        .maybeSingle()

    return (
        <AdminShell
            user={user}
            profile={profile}
            role={authorization.roles[0] || 'user'}
            signoutAction={signout}
        >
            {children}
        </AdminShell>
    )
}
