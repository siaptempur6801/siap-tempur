import { signout } from '@/app/auth/actions'
import UnifiedAdminShell from '@/components/admin/UnifiedAdminShell'
import { adminLandingPath,hasAdminSurface } from '@/lib/admin-nav'
import { createV2Client,getAuthUser } from '@/lib/utils/supabase/server'
import { authorizationService } from '@/src/services/authorization.service'
import { getActivePassScopes } from '@/src/services/tempur-pass.service'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import React from 'react'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Gerbang Admin Workspace.
 *
 * ## Yang berubah dan kenapa
 *
 * Sebelumnya gerbang ini memakai dua boolean yang di-hardcode:
 *
 *     const canAccessAdmin = permissions.has(ADMIN_ACCESS)
 *     const canAccessContent = CONTENT_PERMISSIONS.some(...)
 *     if (!canAccessAdmin && !canAccessContent) redirect('/cpns/dashboard')
 *     if (!canAccessAdmin && !pathname.startsWith('/admin/content')) redirect('/admin/content/review')
 *
 * Dua akibatnya:
 *
 * 1. Pendaratan non-admin di-hardcode ke `/admin/content/review`. `CONTENT_EDITOR`
 *    — yang pekerjaannya menulis soal — selalu mendarat di antrean REVIEW.
 * 2. `SCHOOL_ADMIN` (hanya `organization.manage` + `report.read`) tidak punya
 *    `admin.access` maupun permission content, jadi ia dilempar diam-diam ke
 *    `/cpns/dashboard` tanpa penjelasan apa pun. Itu dead-end navigation, yang
 *    dilarang `docs/ADMIN_UI_UX_STANDARD.md` §4.
 *
 * Sekarang gerbang ini memakai model yang sama dengan sidebar
 * (`lib/admin-nav.ts`), sehingga apa yang boleh dibuka dan apa yang terlihat di
 * menu tidak pernah berbeda.
 *
 * ## Kenapa TIDAK ada redirect per-halaman di sini
 *
 * Menendang pengguna keluar dari halaman yang izinnya kurang akan membuat URL
 * yang salah ketik terasa seperti halaman hilang, dan berisiko loop bila
 * `landingPath` sendiri tidak diizinkan. Halaman yang bersangkutan tetap
 * dirender dan menampilkan "Akses tidak tersedia" — jujur, tanpa loop. Yang
 * WAJIB adalah query datanya tidak berjalan sebelum izin diperiksa; itu
 * ditangani masing-masing halaman.
 */

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createV2Client()
    const pathname = (await headers()).get('x-pathname') || '/admin'
    const { user } = await getAuthUser()

    if (!user) {
        redirect(`/login?returnTo=${encodeURIComponent(pathname)}`)
    }

    const authorization = await authorizationService.getCurrentAuthorization()
    if (!authorization) redirect('/login?returnTo=%2Fadmin')

    const permissions = authorization.permissions
    const landingPath = adminLandingPath(permissions)

    // Tidak punya permukaan admin sama sekali -> beri tahu, jangan diam-diam
    // dilempar. `?admin=no-access` dibaca dashboard peserta untuk menampilkan
    // penjelasan; tanpa itu pun pengguna tetap mendarat di tempat yang masuk akal.
    if (!landingPath || !hasAdminSurface(permissions)) {
        redirect('/cpns/dashboard?admin=no-access')
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
            permissions={permissions}
            hasActiveTempurPass={hasTempurPass}
            landingPath={landingPath}
            signoutAction={signout}
        >
            {children}
        </UnifiedAdminShell>
    )
}
