import { notFound } from 'next/navigation'
import AccountProfilePage from '@/components/profile/AccountProfilePage'
import { parseTkaLevel, tkaLevelPath } from '@/src/tka/context'

export const dynamic = 'force-dynamic'

export default async function TkaProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ level: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { level: rawLevel } = await params
  const level = parseTkaLevel(rawLevel)
  if (!level) notFound()
  return (
    <main
      data-experience-mode="account"
      data-program={`tka-${level.toLowerCase()}`}
      className="min-h-screen px-4 py-6 md:px-8 md:py-8"
    >
      <div className="mx-auto max-w-6xl space-y-6 md:space-y-8">
        <AccountProfilePage
          searchParams={searchParams}
          profilePath={`${tkaLevelPath(level)}/profile`}
          tka
        />
      </div>
    </main>
  )
}
