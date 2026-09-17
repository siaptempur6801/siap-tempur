import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createV2Client } from '@/lib/utils/supabase/server'
import SeoNavbarClient from '@/components/SeoNavbarClient'
import {
    TkaBenefits,
    TkaCta,
    TkaFaq,
    TkaFlow,
    TkaFooter,
    TkaHero,
    TkaLevels,
    TkaSubjects,
} from '@/components/home/tka-landing/sections'
import { TKA_AVAILABLE_LEVELS, isTkaLevelAvailable, parseTkaLevel, tkaLevelPath } from '@/src/tka/context'

export const metadata: Metadata = {
    title: 'Persiapan TKA SD, SMP, SMA - SiapTempur',
    description: 'Persiapan TKA untuk jenjang SD, SMP, dan SMA dengan latihan, tryout, pembahasan, analisis hasil, serta remedial dalam satu akun SiapTempur.',
    alternates: { canonical: '/tka' },
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function TkaHomePage() {
    const supabase = await createV2Client()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return <PublicTkaLanding />

    const fallbackLevel = TKA_AVAILABLE_LEVELS[0] ?? 'SMP'
    const cookieStore = await cookies()
    const preferredLevel = parseTkaLevel(cookieStore.get('tka-level')?.value)
    if (preferredLevel && isTkaLevelAvailable(preferredLevel)) {
        redirect(tkaLevelPath(preferredLevel))
    }

    const { data: program, error: programError } = await supabase
        .from('programs')
        .select('id')
        .eq('code', 'TKA')
        .maybeSingle()
    if (programError) throw programError
    if (!program) redirect(tkaLevelPath(fallbackLevel))

    const { data: tracks, error: trackError } = await supabase
        .from('tracks')
        .select('id, code')
        .eq('program_id', program.id)
        .in('code', [...TKA_AVAILABLE_LEVELS])
    if (trackError) throw trackError

    const trackIds = (tracks ?? []).map((track) => String(track.id))
    const { data: activeUserTrack, error: userTrackError } = trackIds.length > 0
        ? await supabase
            .from('user_tracks')
            .select('track_id')
            .eq('user_id', user.id)
            .in('track_id', trackIds)
            .in('status', ['active', 'ACTIVE'])
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        : { data: null, error: null }
    if (userTrackError) throw userTrackError

    const activeTrack = activeUserTrack
        ? (tracks ?? []).find((track) => String(track.id) === String(activeUserTrack.track_id))
        : null
    const activeLevel = parseTkaLevel(activeTrack?.code)

    redirect(tkaLevelPath(activeLevel ?? fallbackLevel))
}

function PublicTkaLanding() {
    return (
        <main data-experience-mode="marketing" data-program="tka" className="st-product min-h-screen overflow-x-clip bg-[var(--st-paper)] font-body text-[var(--st-ink)]">
            <SeoNavbarClient isAuthenticated={false} programLabel="TKA" />
            <TkaHero />
            <TkaBenefits />
            <TkaLevels />
            <TkaFlow />
            <TkaSubjects />
            <TkaFaq />
            <TkaCta />
            <TkaFooter />
        </main>
    )
}
