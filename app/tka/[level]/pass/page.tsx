import { redirect } from 'next/navigation'
import { parseTkaLevel, tkaLevelPath } from '@/src/tka/context'

export default async function LegacyAccessRoute({
  params,
}: {
  params: Promise<{ level: string }>
}): Promise<never> {
  const { level: rawLevel } = await params
  const level = parseTkaLevel(rawLevel)
  redirect(level ? tkaLevelPath(level) : '/tka')
}
