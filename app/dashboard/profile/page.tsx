import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ProfileClient from '@/components/profile/ProfileClient'

export default async function ProfilePage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Fetch profile data
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    if (!profile) {
        // Create default profile if not exists
        const { data: newProfile } = await supabase
            .from('profiles')
            .insert({
                id: user.id,
                full_name: user.user_metadata?.full_name || null,
                subscription_status: 'free'
            })
            .select()
            .single()

        return <ProfileClient profile={newProfile || { id: user.id, full_name: null, avatar_url: null, bio: null, subscription_status: 'free' }} user={{ email: user.email!, created_at: user.created_at! }} />
    }

    return <ProfileClient profile={profile} user={{ email: user.email!, created_at: user.created_at! }} />
}
