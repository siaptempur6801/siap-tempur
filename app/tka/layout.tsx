import { headers } from 'next/headers'
import { signout } from '@/app/auth/actions'
import TkaDashboardShell from '@/components/tka/TkaDashboardShell'
import { createClient } from '@/lib/utils/supabase/server'
import { isTkaLevelAvailable, parseTkaLevel, type TkaLevel } from '@/src/tka/context'
import { getActivePassScopes } from '@/src/services/tempur-pass.service'

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

    // Permukaan marketing TKA selalu tampil tanpa chrome aplikasi — juga untuk pengguna login:
    // 1. halaman pengenalan `/tka`, dan
    // 2. halaman jenjang yang belum tersedia (`/tka/sd`, `/tka/sma` → "coming soon").
    // Sub-halaman jenjang (mis. `/tka/sd/focus`) tetap memakai shell karena itu permukaan aplikasi.
    const isMarketingLanding = pathname === '/tka' || pathname === '/tka/'
    const levelLanding = parseTkaLevel(pathname?.match(/^\/tka\/([^/]+)\/?$/i)?.[1])
    const isComingSoonLanding = Boolean(levelLanding && !isTkaLevelAvailable(levelLanding))
    // Pengunjung anonim juga bebas chrome di seluruh permukaan publik.
    if (!user || isMarketingLanding || isComingSoonLanding) return <>{children}</>

    const activeLevel = levelFromPath(pathname)

    const [{ data: profile }, activePassScopes] = await Promise.all([
        supabase
            .from('profiles')
            .select('avatar_url, full_name, display_name')
            .eq('id', user.id)
            .maybeSingle(),
        // Pass dinilai per jenjang: user dengan pass TKA SD tidak dianggap ber-pass di SMP.
        // Semua scope diambil sekaligus supaya kartu profil bisa menjelaskan cakupan pass-nya
        // (mis. "Pass aktif · SD" saat pengguna membuka jenjang lain).
        getActivePassScopes(user.id),
    ])

    // Script Midtrans Snap sengaja TIDAK dimuat di sini. Satu-satunya halaman TKA
    // yang memakainya adalah /tka/[level]/pass, dan halaman itu memuatnya sendiri.
    // Memuatnya di layout berarti skrip pembayaran pihak ketiga (beserta iframe
    // popup Midtrans) ikut ter-load di dashboard, sesi ujian, dan halaman hasil.
    return (
        <>
            <TkaDashboardShell
                user={user}
                profile={profile}
                activePassScopes={activePassScopes}
                level={activeLevel}
                signoutAction={signout}
            >
                {children}
            </TkaDashboardShell>
        </>
    )
}
