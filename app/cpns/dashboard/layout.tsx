import { createClient } from '@/lib/utils/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { signout } from '@/app/auth/actions'
import DashboardShell from '@/components/dashboard/DashboardShell'
import Script from 'next/script'
import { logger } from '@/lib/logger'

type UserMetadata = {
    full_name?: string
    name?: string
}

type DashboardProfile = {
    role?: string | null
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

    // Fetch profile for status and details
    // We use maybeSingle() to avoid errors if profile doesn't exist yet
    let { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

    // If profile doesn't exist, create it (new user or first time in dashboard)
    if (!profile) {
        const userMetadata = user.user_metadata as UserMetadata | undefined
        const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert({
                id: user.id,
                full_name: userMetadata?.full_name || userMetadata?.name || null,
                tryout_quota: 0
            })
            .select()
            .single()

        if (!insertError) {
            profile = newProfile
        } else {
            logger.warn('[DashboardLayout] Failed to create profile:', { error: insertError })
        }
    }

    const isAdminUser = (profile as DashboardProfile | null)?.role === 'admin'

    return (
        <>
            <Script
                src="https://app.midtrans.com/snap/snap.js"
                data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
                strategy="afterInteractive"
                nonce={nonce}
            />
            <DashboardShell user={user} profile={profile} signoutAction={signout} isAdmin={isAdminUser}>
                {children}
            </DashboardShell>
        </>
    )
}

