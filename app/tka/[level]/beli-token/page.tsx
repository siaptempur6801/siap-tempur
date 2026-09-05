import { notFound, redirect } from 'next/navigation'
import TokenPackagesPage from '@/components/dashboard/TokenPackagesPage'
import { createV2Client } from '@/lib/utils/supabase/server'
import { parseTkaLevel, tkaLevelPath } from '@/src/tka/context'

export const dynamic = 'force-dynamic'

export default async function TkaBuyTokensPage({ params }: { params: Promise<{ level: string }> }) {
    const { level: rawLevel } = await params
    const level = parseTkaLevel(rawLevel)
    if (!level) notFound()
    const supabase = await createV2Client()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) redirect(`/login?returnTo=${encodeURIComponent(`${tkaLevelPath(level)}/beli-token`)}`)

    return (
        <main className="min-h-screen px-4 py-5 md:px-8 md:py-8">
            <TokenPackagesPage program="TKA" />
        </main>
    )
}
