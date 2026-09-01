import Script from 'next/script'
import { headers } from 'next/headers'
import { signout } from '@/app/auth/actions'
import TkaDashboardShell from '@/components/tka/TkaDashboardShell'
import { env } from '@/lib/env'
import { createClient } from '@/lib/utils/supabase/server'
import { parseTkaLevel, type TkaLevel } from '@/src/tka/context'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function levelFromPath(pathname: string | null): TkaLevel {
    const match = pathname?.match(/^\/tka\/(sd|smp|sma)(?:\/|$)/i)
    return parseTkaLevel(match?.[1]) ?? 'SMP'
}

export default async function TkaRootLayout({ children }: { children: React.ReactNode }) {
    const [supabase, requestHeaders] = await Promise.all([
        createClient(),
        headers(),
    ])
    const { data: { user } } = await supabase.auth.getUser()

    // Public TKA marketing and coming-soon surfaces stay accessible without app chrome.
    if (!user) return <>{children}</>

    const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_url, full_name, display_name')
        .eq('id', user.id)
        .maybeSingle()

    const activeLevel = levelFromPath(requestHeaders.get('x-pathname'))
    const nonce = requestHeaders.get('x-nonce') || undefined

    return (
        <>
            <Script
                id="midtrans-snap"
                src={env.midtransSnapScriptUrl()}
                data-client-key={env.midtransClientKey()}
                strategy="afterInteractive"
                nonce={nonce}
            />
            <TkaDashboardShell
                level={activeLevel}
                user={user}
                profile={profile}
                signoutAction={signout}
            >
                {children}
            </TkaDashboardShell>
        </>
    )
}
