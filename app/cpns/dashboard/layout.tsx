import { createClient } from '@/lib/utils/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { signout } from '@/app/auth/actions'
import DashboardShell from '@/components/dashboard/DashboardShell'
import { logger } from '@/lib/logger'
import { hasActivePass } from '@/src/services/tempur-pass.service'
import { walletService } from '@/src/services/wallet.service'

type UserMetadata = {
  full_name?: string
  name?: string
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const requestHeaders = await headers()
  const pathname = requestHeaders.get('x-pathname') ?? ''

  if (!user) {
    redirect('/login')
  }

  // Sesi pengerjaan tryout punya layout full-screen sendiri
  // (`tryout/[sessionId]/layout.tsx`) yang menyatakan "tanpa sidebar".
  // Karena layout bersarang tidak menggantikan layout induk, shell di sini harus dilewati
  // agar soal tidak dirender di dalam kerangka dashboard.
  const isSessionSurface = /^\/cpns\/dashboard\/tryout\/[^/]+$/.test(pathname)
  if (isSessionSurface) return <>{children}</>

  let { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) {
    const userMetadata = user.user_metadata as UserMetadata | undefined
    const displayName = userMetadata?.full_name || userMetadata?.name || null
    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        full_name: displayName,
        display_name: displayName,
      })
      .select()
      .single()

    if (!insertError) {
      profile = newProfile
    } else {
      logger.warn('[DashboardLayout] Failed to create profile:', { error: insertError })
    }
  }

  const [tokenBalance, hasTempurPass] = await Promise.all([
    walletService.getExamTokenBalance(user.id),
    hasActivePass(user.id, 'cpns'),
  ])

  return (
    <>
      <DashboardShell
        user={user}
        profile={profile}
        tokenBalance={tokenBalance}
        hasActiveTempurPass={hasTempurPass}
        signoutAction={signout}
      >
        {children}
      </DashboardShell>
    </>
  )
}
