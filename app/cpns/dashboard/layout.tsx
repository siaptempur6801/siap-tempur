import { createClient } from '@/lib/utils/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { signout } from '@/app/auth/actions'
import DashboardShell from '@/components/dashboard/DashboardShell'
import Script from 'next/script'
import { logger } from '@/lib/logger'
import { env } from '@/lib/env'
import { authorizationService } from '@/src/services/authorization.service'
import { walletService } from '@/src/services/wallet.service'

type UserMetadata = {
    full_name?: string
    name?: string
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const nonce = (await headers()).get('x-nonce') || undefined

    if (!user) {
        redirect('/login')
    }

    let { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

    if (!profile) {
        const userMetadata = user.user_metadata as UserMetadata | undefined
        const displayName = userMetadata?.full_name || userMetadata?.name || null
        const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert({
                id: user.id,
                full_name: displayName,
                display_name: displayName,
            })
            .select()
            .single()

        if (!insertError) {
            profile = newProfile
        } else {
            logger.warn('[DashboardLayout] Failed to create profile:', { error: insertError })
        }
    }

    const [authorization, tokenBalance] = await Promise.all([
        authorizationService.getAuthorizationForUser(user.id),
        walletService.getExamTokenBalance(user.id),
    ])
    const permissions = authorization?.permissions ?? []
    const isAdminUser = permissions.includes('admin.access')
    const canAccessArticles = [
        'content.read',
        'content.create',
        'content.update',
        'content.review',
        'content.publish',
    ].some((permission) => permissions.includes(permission as never))

    return (
        <>
            <Script
                id="midtrans-snap-script"
                src={env.midtransSnapScriptUrl()}
                data-client-key={env.midtransClientKey()}
                strategy="afterInteractive"
                nonce={nonce}
            />
            <DashboardShell
                user={user}
                profile={profile}
                tokenBalance={tokenBalance}
                signoutAction={signout}
                isAdmin={isAdminUser}
                canAccessArticles={canAccessArticles}
            >
                {children}
            </DashboardShell>
        </>
    )
}
