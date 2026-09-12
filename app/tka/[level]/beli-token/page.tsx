import { notFound, redirect } from 'next/navigation'
import { parseTkaLevel, tkaLevelPath } from '@/src/tka/context'

export const dynamic = 'force-dynamic'

export default async function TkaBuyTokensPage({ params }: { params: Promise<{ level: string }> }) {
    const { level: rawLevel } = await params
    const level = parseTkaLevel(rawLevel)
    if (!level) notFound()
    if (level === 'SMP') redirect(`${tkaLevelPath(level)}/pass`)
    redirect(tkaLevelPath(level))
}
