import { notFound, redirect } from 'next/navigation'
import { Dumbbell } from 'lucide-react'
import TkaLearningHierarchy from '@/components/tka/TkaLearningHierarchy'
import { createV2Client } from '@/lib/utils/supabase/server'
import { isTkaLevelAvailable, parseTkaLevel, tkaContext, tkaLevelPath } from '@/src/tka/context'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function TkaFocusPage({ params }: { params: Promise<{ level: string }> }) {
    const { level: rawLevel } = await params
    const level = parseTkaLevel(rawLevel)
    if (!level || !isTkaLevelAvailable(level)) notFound()

    const base = tkaLevelPath(level)
    const supabase = await createV2Client()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) redirect(`/login?returnTo=${encodeURIComponent(`${base}/focus`)}`)

    const context = tkaContext(level)
    const { data: program, error: programError } = await supabase
        .from('programs')
        .select('id')
        .eq('code', context.programCode)
        .maybeSingle()
    if (programError) throw programError
    if (!program) notFound()

    const { data: track, error: trackError } = await supabase
        .from('tracks')
        .select('id')
        .eq('program_id', program.id)
        .eq('code', context.trackCode)
        .maybeSingle()
    if (trackError) throw trackError
    if (!track) notFound()

    const { data: userTrack, error: userTrackError } = await supabase
        .from('user_tracks')
        .select('status')
        .eq('user_id', user.id)
        .eq('track_id', track.id)
        .maybeSingle()
    if (userTrackError) throw userTrackError

    const activeTrack = userTrack?.status.toLowerCase() === 'active'

    return (
        <main data-experience-mode="learning" data-program="tka-smp" className="min-h-screen px-4 py-6 md:px-8 md:py-8">
            <div className="mx-auto max-w-6xl space-y-6 md:space-y-8">
                <header className="border-b border-slate-200/80 pb-6 text-slate-950">
                    <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700 ring-1 ring-indigo-200/50">
                        <Dumbbell size={14} className="text-indigo-600" aria-hidden="true" />
                        <span>Latihan Fokus · TKA {level}</span>
                    </div>
                    <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                        Latihan Fokus per Materi
                    </h1>
                    <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">
                        Pilih bab atau materi yang ingin kamu perkuat. Setiap sesi berisi 10 butir soal terarah dengan pembahasan instan untuk mematangkan konsep.
                    </p>
                </header>

                <TkaLearningHierarchy activeTrack={activeTrack} level={level} />
            </div>
        </main>
    )
}
