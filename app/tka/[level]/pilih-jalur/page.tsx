import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import TkaPilihJalurContent from '@/components/tka/TkaPilihJalurContent'
import { isTkaLevelAvailable, parseTkaLevel } from '@/src/tka/context'

export const metadata: Metadata = {
  title: 'Pilih Jalur TKA — SIAP TEMPUR',
  description:
    'Pilih jalur latihan TKA per jenjang: tes diagnostik, latihan fokus, mini tryout, dan full tryout.',
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Pilih Jalur **TKA** — halaman tersendiri, fokus ke jenjang yang sedang dibuka.
 */
export default async function TkaPilihJalurPage({
  params,
}: {
  params: Promise<{ level: string }>
}) {
  const { level: rawLevel } = await params
  const level = parseTkaLevel(rawLevel)
  if (!level || !isTkaLevelAvailable(level)) notFound()

  return (
    <main
      data-experience-mode="learning"
      data-program={`tka-${level.toLowerCase()}`}
      className="min-h-screen px-4 py-6 md:px-8 md:py-8"
    >
      <div className="mx-auto max-w-6xl">
        <TkaPilihJalurContent level={level} />
      </div>
    </main>
  )
}
