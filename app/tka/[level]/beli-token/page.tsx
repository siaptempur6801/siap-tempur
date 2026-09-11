import { notFound, redirect } from 'next/navigation'
import TokenPackagesPage from '@/components/dashboard/TokenPackagesPage'
import { createV2Client } from '@/lib/utils/supabase/server'
import { parseTkaLevel, tkaLevelPath } from '@/src/tka/context'
import { walletService } from '@/src/services/wallet.service'

export const dynamic = 'force-dynamic'

export default async function TkaBuyTokensPage({ params }: { params: Promise<{ level: string }> }) {
    const { level: rawLevel } = await params
    const level = parseTkaLevel(rawLevel)
    if (!level) notFound()
    const supabase = await createV2Client()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) redirect(`/login?returnTo=${encodeURIComponent(`${tkaLevelPath(level)}/beli-token`)}`)

    const tokenBalance = await walletService.getExamTokenBalance(user.id)

    return (
        <main data-experience-mode="commerce" data-program={`tka-${level.toLowerCase()}`} className="min-h-screen px-4 py-6 md:px-8 md:py-8">
            <div className="mx-auto max-w-6xl space-y-6 md:space-y-8">
                <TokenPackagesPage program="TKA" level={level} tokenBalance={tokenBalance} />
            </div>
        </main>
    )
}
