import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ProfileClient from '@/components/profile/ProfileClient'
import { processStatistics, SessionData } from '@/lib/statistics'

export default async function ProfilePage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // 1. Fetch Profile Data
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    // 2. Fetch Sessions for Statistics
    const { data: rawSessions } = await supabase
        .from('test_sessions')
        .select(`
            id,
            start_time,
            total_score,
            score_twk,
            score_tiu,
            score_tkp,
            status,
            mode
        `)
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('start_time', { ascending: true })

    // 3. Process Statistics
    const statsData = processStatistics(rawSessions as unknown as SessionData[])

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

        return <ProfileClient
            profile={newProfile || { id: user.id, full_name: null, avatar_url: null, bio: null, subscription_status: 'free' }}
            user={{ email: user.email!, created_at: user.created_at! }}
            statsData={statsData}
        />
    }

    return <ProfileClient
        profile={profile}
        user={{ email: user.email!, created_at: user.created_at! }}
        statsData={statsData}
    />
}
