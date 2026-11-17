import { notFound } from 'next/navigation'
import { parseTkaLevel } from '@/src/tka/context'

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
