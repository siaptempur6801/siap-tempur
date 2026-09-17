import React from 'react'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { signout } from '@/app/auth/actions'
import AdminShell from '@/components/admin/AdminShell'
import { createV2Client } from '@/lib/utils/supabase/server'
import { authorizationService } from '@/src/services/authorization.service'
import { PERMISSIONS } from '@/src/auth/permissions'
import { getActivePassScopes } from '@/src/services/tempur-pass.service'

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
    const isReviewRoute = pathname.startsWith('/cpns/admin/review')
    const contentPermissions = [
        PERMISSIONS.CONTENT_READ,
        PERMISSIONS.CONTENT_CREATE,
        PERMISSIONS.CONTENT_UPDATE,
        PERMISSIONS.CONTENT_REVIEW,
        PERMISSIONS.CONTENT_PUBLISH,
    ]
    const canAccessArticles = contentPermissions.some((permission) => permissions.has(permission))
    const canAccessReview = [
        ...contentPermissions,
        PERMISSIONS.QUESTION_MANAGE,
    ].some((permission) => permissions.has(permission))
    const canAccessAdmin = permissions.has(PERMISSIONS.ADMIN_ACCESS)

    if (!(canAccessAdmin || (isArticleRoute && canAccessArticles) || (isReviewRoute && canAccessReview))) {
        redirect('/cpns/dashboard')
    }

    if (!canAccessAdmin && pathname === '/cpns/admin') {
        redirect(canAccessReview ? '/cpns/admin/review' : '/cpns/admin/articles')
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
        <AdminShell
            user={user}
            profile={profile}
            role={authorization.roles[0] || 'user'}
            permissions={authorization.permissions}
            hasActiveTempurPass={hasTempurPass}
            signoutAction={signout}
        >
            {children}
        </AdminShell>
    )
}
