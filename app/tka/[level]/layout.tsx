import Script from 'next/script'
import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { signout } from '@/app/auth/actions'
import TkaDashboardShell from '@/components/tka/TkaDashboardShell'
import { env } from '@/lib/env'
import { createClient } from '@/lib/utils/supabase/server'
import { parseTkaLevel } from '@/src/tka/context'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function TkaDashboardLayout({
    children,
    params,
}: {
    children: React.ReactNode
    params: Promise<{ level: string }>
}) {
    const { level: levelParam } = await params
    const level = parseTkaLevel(levelParam)
    if (!level) notFound()

    if (level !== 'SMP') {
        return <>{children}</>
    }

    const [supabase, requestHeaders] = await Promise.all([
        createClient(),
        headers(),
    ])
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        const requestedPath = requestHeaders.get('x-pathname') || '/tka/smp'
        redirect(`/login?returnTo=${encodeURIComponent(requestedPath)}`)
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_url, full_name, display_name')
        .eq('id', user.id)
        .maybeSingle()

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
                level={level}
                user={user}
                profile={profile}
                signoutAction={signout}
            >
                {children}
            </TkaDashboardShell>
        </>
    )
}