
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import PracticeClient from './PracticeClient'

export default async function PracticeListingPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Fetch profile for quota
    const { data: profile } = await supabase
        .from('profiles')
        .select('tryout_quota')
        .eq('id', user.id)
        .single()

    const quota = profile?.tryout_quota ?? 0

    return <PracticeClient quota={quota} />
}
