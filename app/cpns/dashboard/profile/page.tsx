import { createClient } from '@/lib/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import ProfileClient from '@/components/profile/ProfileClient'
import { getLevel } from '@/lib/dashboard'
import { calculateCurrentStreak } from '@/lib/utils'

export default async function ProfilePage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Parallel Fetching for Performance
    const [profileResult, rawSessionsResult, transactionsResult, usageSessionsResult] = await Promise.all([
        // 1. Fetch Profile Data
        supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single(),

        // 2. Fetch Sessions for Statistics (XP)
        supabase
            .from('test_sessions')
            .select('total_score')
            .eq('user_id', user.id)
            .eq('status', 'completed'),

        // 3. Fetch Transactions
        supabase
            .from('transactions')
            .select('id, created_at, amount, status, package_name, order_id, snap_token')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),

        // 4. Fetch Usage History
        supabase
            .from('test_sessions')
            .select('id, start_time, mode')
            .eq('user_id', user.id)
            .in('mode', ['tryout', 'practice'])
            .order('start_time', { ascending: false })
    ])

    const { data: profile } = profileResult
    const { data: rawSessions } = rawSessionsResult
    const { data: transactions } = transactionsResult
    const { data: usageSessions } = usageSessionsResult

    // Calculate XP and Level
    const totalXP = rawSessions?.reduce((sum, s) => sum + (s.total_score || 0), 0) || 0
    const levelInfo = getLevel(totalXP)



    if (profile) {
        profile.streak_count = calculateCurrentStreak(profile.streak_count, profile.last_activity_date);
    }

    if (!profile) {
        // Create default profile if not exists
        const { data: newProfile } = await supabase
            .from('profiles')
            .insert({
                id: user.id,
                full_name: user.user_metadata?.full_name || null
            })
            .select()
            .single()

        return (
            <Suspense fallback={<div className="flex h-screen items-center justify-center font-handwriting text-2xl">Memuat Profil...</div>}>
                <ProfileClient
                    profile={newProfile || { id: user.id, full_name: null, avatar_url: null, bio: null }}
                    user={{ id: user.id, email: user.email!, created_at: user.created_at! }}
                    transactions={transactions || []}
                    usageSessions={usageSessions || []}
                    level={levelInfo.level}
                />
            </Suspense>
        )
    }

    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center font-handwriting text-2xl">Memuat Profil...</div>}>
            <ProfileClient
                profile={profile}
                user={{ id: user.id, email: user.email!, created_at: user.created_at! }}
                transactions={transactions || []}
                usageSessions={usageSessions || []}
                level={levelInfo.level}
            />
        </Suspense>
    )
}
