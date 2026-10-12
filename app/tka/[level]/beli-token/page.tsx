import { notFound, redirect } from 'next/navigation'
import MidtransSnapScript from '@/components/payments/MidtransSnapScript'
import TokenPackagesPage from '@/components/dashboard/TokenPackagesPage'
import PageHeader from '@/components/ui/PageHeader'
import { createV2Client } from '@/lib/utils/supabase/server'
import { walletService } from '@/src/services/wallet.service'
import { isTkaLevelAvailable, parseTkaLevel, tkaContext, tkaLevelPath } from '@/src/tka/context'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function TkaBuyTokensPage({ params }: { params: Promise<{ level: string }> }) {
  const { level: rawLevel } = await params
  const level = parseTkaLevel(rawLevel)
  if (!level || !isTkaLevelAvailable(level)) notFound()

  const base = tkaLevelPath(level)
  const supabase = await createV2Client()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/login?returnTo=${encodeURIComponent(`${base}/beli-token`)}`)
  if (level !== 'SMP') redirect(base)

  const context = tkaContext(level)
  const { data: program, error } = await supabase
    .from('programs')
    .select('id')
    .eq('code', context.programCode)
    .maybeSingle()
  if (error) throw error
  const tokenBalance = program
    ? await walletService.getExamTokenBalance(user.id, program.id)
    : 0

  return (
    <main
      data-experience-mode="learning"
      data-program={`tka-${level.toLowerCase()}`}
      className="min-h-screen px-4 py-6 md:px-8 md:py-8"
    >
      <div className="mx-auto max-w-6xl space-y-6 md:space-y-8">
        <MidtransSnapScript />
        <PageHeader
          eyebrow="Akses belajar · TKA SMP"
          title="Beli Token TKA"
          description="Gunakan token TKA untuk memulai Tryout, Mini Tryout, dan Latihan Fokus. Sesi aktif bisa dilanjutkan tanpa potongan token tambahan."
        />
        <TokenPackagesPage program="TKA" level={level} tokenBalance={tokenBalance} />
      </div>
    </main>
  )
}
