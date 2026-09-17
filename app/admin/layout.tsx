import React from 'react'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { signout } from '@/app/auth/actions'
import UnifiedAdminShell from '@/components/admin/UnifiedAdminShell'
import { createV2Client } from '@/lib/utils/supabase/server'
import { authorizationService } from '@/src/services/authorization.service'
import { PERMISSIONS } from '@/src/auth/permissions'
import { getActivePassScopes } from '@/src/services/tempur-pass.service'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const CONTENT_PERMISSIONS = [
    PERMISSIONS.CONTENT_READ,
    PERMISSIONS.CONTENT_CREATE,
    PERMISSIONS.CONTENT_UPDATE,
    PERMISSIONS.CONTENT_REVIEW,
    PERMISSIONS.CONTENT_PUBLISH,
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createV2Client()
    const pathname = (await headers()).get('x-pathname') || '/admin'
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect(`/login?returnTo=${encodeURIComponent(pathname)}`)
    }

    const authorization = await authorizationService.getCurrentAuthorization()
    if (!authorization) redirect('/login?returnTo=%2Fadmin')

    const permissions = new Set(authorization.permissions)
    const canAccessAdmin = permissions.has(PERMISSIONS.ADMIN_ACCESS)
    const canAccessContent = CONTENT_PERMISSIONS.some((permission) => permissions.has(permission))

    if (!canAccessAdmin && !canAccessContent) {
        redirect('/cpns/dashboard')
    }

    const isContentRoute = pathname.startsWith('/admin/content')
    if (!canAccessAdmin && !isContentRoute) {
        redirect('/admin/content/review')
    }

    const [{ data: profile }, hasTempurPass] = await Promise.all([
        supabase
            .from('profiles')
            .select('avatar_url, full_name')
            .eq('id', user.id)
            .maybeSingle(),
        getActivePassScopes(user.id).then((scopes) => scopes.length > 0),
    ])

    return (
        <UnifiedAdminShell
            user={user}
            profile={profile}
            roles={authorization.roles}
            permissions={authorization.permissions}
            hasActiveTempurPass={hasTempurPass}
            signoutAction={signout}
        >
            {children}
        </UnifiedAdminShell>
    )
}
