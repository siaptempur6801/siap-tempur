import { notFound, redirect } from 'next/navigation'
import { isTkaLevelAvailable, parseTkaLevel, tkaLevelPath } from '@/src/tka/context'

export const dynamic = 'force-dynamic'

export default async function TkaBuyTokensPage({ params }: { params: Promise<{ level: string }> }) {
  const { level: rawLevel } = await params
  const level = parseTkaLevel(rawLevel)
  if (!level || !isTkaLevelAvailable(level)) notFound()
  // Semua jenjang aktif memakai halaman pass sebagai etalase paket.
  redirect(`${tkaLevelPath(level)}/pass`)
}
