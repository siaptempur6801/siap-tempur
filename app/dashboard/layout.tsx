import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { signout } from '@/app/auth/actions'
import DashboardShell from '@/components/dashboard/DashboardShell'

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
    const { data: profile } = await supabase.from('profiles').select('subscription_status, full_name, avatar_url').eq('id', user.id).single()

    return (
        <DashboardShell user={user} profile={profile} signoutAction={signout}>
            {children}
        </DashboardShell>
    )
}

