import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { signout } from '@/app/auth/actions'
import DashboardShell from '@/components/dashboard/DashboardShell'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

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
        const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert({
                id: user.id,
                full_name: user.user_metadata?.full_name || (user as any).user_metadata?.name || null,
                tryout_quota: 0
            })
            .select()
            .single()

        if (!insertError) {
            profile = newProfile
        } else {
            console.error('[DashboardLayout] Failed to create profile:', insertError)
        }
    }

    return (
        <DashboardShell user={user} profile={profile} signoutAction={signout}>
            {children}
        </DashboardShell>
    )
}

