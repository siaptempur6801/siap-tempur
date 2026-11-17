import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { parseTkaLevel } from '@/src/tka/context'

// Seluruh `/tka/<jenjang>/**` adalah permukaan aplikasi (wajib login) atau halaman
// "segera hadir"; halaman pemasaran TKA yang diindeks adalah `/tka`.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function TkaLevelLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ level: string }>
}) {
  const { level: levelParam } = await params
  if (!parseTkaLevel(levelParam)) notFound()
  return <>{children}</>
}
