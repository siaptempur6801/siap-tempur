import { createClient } from '@/lib/utils/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

export default async function PracticeSessionLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const pathname = (await headers()).get('x-pathname') ?? ''

  if (!user) {
    const returnTo = pathname.startsWith('/cpns/dashboard/tryout/')
      ? pathname
      : '/cpns/dashboard/tryout'
    redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`)
  }

  const isActiveSession = /^\/cpns\/dashboard\/tryout\/[^/]+$/.test(pathname)

  if (!isActiveSession) return children

  return (
    <div className="h-screen overflow-hidden bg-background">
      {/* Full-screen layout without sidebar for practice sessions */}
      <main className="h-full overflow-y-auto">
        <div className="p-3 md:p-5 xl:p-6 max-w-[1600px] mx-auto">{children}</div>
      </main>
    </div>
  )
}
