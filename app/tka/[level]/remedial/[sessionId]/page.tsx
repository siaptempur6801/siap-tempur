import { notFound, redirect } from 'next/navigation'
import { createV2Client } from '@/lib/utils/supabase/server'
import TkaRemedialModeClient from '@/components/tka/TkaRemedialModeClient'
import { isTkaLevelAvailable, parseTkaLevel, tkaLevelPath } from '@/src/tka/context'
import { tkaRemedialService } from '@/src/services/tka-remedial.service'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function TkaRemedialPage({
    params,
}: {
    params: Promise<{ level: string; sessionId: string }>
}) {
    const { level: rawLevel, sessionId } = await params
    const level = parseTkaLevel(rawLevel)
    if (!level) notFound()

    const base = tkaLevelPath(level)
    if (!isTkaLevelAvailable(level)) redirect(base)

    const supabase = await createV2Client()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) redirect(`/login?returnTo=${encodeURIComponent(`${base}/remedial/${sessionId}`)}`)

    const remedial = await tkaRemedialService.getSession(sessionId)
    if (!remedial.session) redirect(base)

    return <TkaRemedialModeClient initialSession={remedial.session} initialItems={remedial.items}/>
}
