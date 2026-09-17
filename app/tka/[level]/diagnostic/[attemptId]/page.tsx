import { notFound, redirect } from 'next/navigation'
import TkaDiagnosticSessionClient from '@/components/tka/TkaDiagnosticSessionClient'
import { createClient } from '@/lib/utils/supabase/server'
import { tkaFullExamRpcService } from '@/src/services/tka-full-exam-rpc.service'
import { isTkaLevelAvailable, parseTkaLevel, tkaLevelPath } from '@/src/tka/context'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const DIAGNOSTIC_SLUG = 'tka-smp-diagnostic-awal'

export default async function TkaDiagnosticSessionPage({
    params,
}: {
    params: Promise<{ level: string; attemptId: string }>
}) {
    const { level: rawLevel, attemptId } = await params
    const level = parseTkaLevel(rawLevel)
    if (!level) notFound()
    const base = tkaLevelPath(level)
    if (!isTkaLevelAvailable(level)) redirect(base)

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) redirect(`/login?returnTo=${encodeURIComponent(`${base}/diagnostic/${attemptId}`)}`)

    let state
    try {
        state = await tkaFullExamRpcService.getState(attemptId)
    } catch {
        redirect(`${base}/diagnostic`)
    }

    const { data: exam } = await supabase
        .from('exams')
        .select('id, slug')
        .eq('id', state.examId)
        .eq('slug', DIAGNOSTIC_SLUG)
        .maybeSingle()
    if (!exam?.id) redirect(base)

    if (state.status === 'completed') redirect(`${base}/diagnostic/${attemptId}/result`)
    if (!state.activeSectionId || state.questions.length === 0) redirect(`${base}/diagnostic`)

    return <TkaDiagnosticSessionClient state={state} />
}
