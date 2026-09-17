import { headers } from 'next/headers'
import { signout } from '@/app/auth/actions'
import TkaDashboardShell from '@/components/tka/TkaDashboardShell'
import { createClient } from '@/lib/utils/supabase/server'
import { parseTkaLevel, type TkaLevel } from '@/src/tka/context'
import { hasActiveTempurPass } from '@/src/services/tempur-pass.service'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const DEFAULT_TKA_LEVEL: TkaLevel = 'SMP'

function levelFromPath(pathname: string | null): TkaLevel {
    const match = pathname?.match(/^\/tka\/(sd|smp|sma)(?:\/|$)/i)
    return parseTkaLevel(match?.[1]) ?? DEFAULT_TKA_LEVEL
}

export default async function TkaRootLayout({ children }: { children: React.ReactNode }) {
    const [supabase, requestHeaders] = await Promise.all([
        createClient(),
        headers(),
    ])
    const { data: { user } } = await supabase.auth.getUser()

    const pathname = requestHeaders.get('x-pathname')

    // Halaman pengenalan TKA (`/tka`) adalah permukaan marketing: selalu tampil tanpa chrome
    // aplikasi — juga saat dibuka pengguna yang sudah login (mis. dari tautan logo di shell).
    // Di luar itu, pengunjung anonim tetap bebas chrome (marketing & coming soon publik).
    const isMarketingLanding = pathname === '/tka' || pathname === '/tka/'
    if (!user || isMarketingLanding) return <>{children}</>

    const [{ data: profile }, hasTempurPass] = await Promise.all([
        supabase
            .from('profiles')
            .select('avatar_url, full_name, display_name')
            .eq('id', user.id)
            .maybeSingle(),
        hasActiveTempurPass(user.id),
    ])

    const activeLevel = levelFromPath(pathname)

    // Script Midtrans Snap sengaja TIDAK dimuat di sini. Satu-satunya halaman TKA
    // yang memakainya adalah /tka/[level]/pass, dan halaman itu memuatnya sendiri.
    // Memuatnya di layout berarti skrip pembayaran pihak ketiga (beserta iframe
    // popup Midtrans) ikut ter-load di dashboard, sesi ujian, dan halaman hasil.
    return (
        <>
            <TkaDashboardShell
                level={activeLevel}
                user={user}
                profile={profile}
                hasActiveTempurPass={hasTempurPass}
                signoutAction={signout}
            >
                {children}
            </TkaDashboardShell>
        </>
    )
}
