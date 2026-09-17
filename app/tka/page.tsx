import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { createV2Client } from '@/lib/utils/supabase/server'
import SeoNavbarClient from '@/components/SeoNavbarClient'
import { tkaNavItems } from '@/components/home/tka-landing/content'
import ReadingProgress from '@/components/blog/ReadingProgress'
import FullPageRedirect from '@/components/tka/FullPageRedirect'
import {
    TkaBenefits,
    TkaCta,
    TkaFaq,
    TkaFlow,
    TkaFooter,
    TkaHero,
    TkaLevels,
    TkaSubjects,
} from '@/components/home/tka-landing/sections'
import { TKA_AVAILABLE_LEVELS, isTkaLevelAvailable, parseTkaLevel, tkaLevelPath } from '@/src/tka/context'

export const metadata: Metadata = {
    title: 'Persiapan TKA SD, SMP, SMA - SiapTempur',
    description: 'Persiapan TKA untuk jenjang SD, SMP, dan SMA dengan latihan, tryout, pembahasan, analisis hasil, serta remedial dalam satu akun SiapTempur.',
    alternates: { canonical: '/tka' },
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function TkaHomePage({
    searchParams,
}: {
    searchParams: Promise<{ landing?: string }>
}) {
    const { landing } = await searchParams
    const supabase = await createV2Client()
    const { data: { user } } = await supabase.auth.getUser()

    // `?landing=1` (dari tautan logo di shell TKA) memaksa halaman pengenalan tampil
    // walau pengguna sudah login; tanpa itu perilaku lama tetap: redirect ke jenjang aktif.
    if (!user || landing === '1') return <PublicTkaLanding loggedIn={Boolean(user)} />

    // Halaman pengenalan (`/tka`) dan halaman jenjang memakai segmen layout yang sama, tetapi
    // chrome-nya berbeda (tanpa sidebar vs dengan sidebar). Pada navigasi klien, router memakai
    // ulang layout yang sudah ter-mount sehingga sidebar hilang bila redirect diterapkan sebagai
    // navigasi lunak. Karena itu: permintaan dokumen memakai `redirect()` (307), sedangkan
    // navigasi klien dipaksa memuat dokumen penuh lewat `FullPageRedirect`.
    /**
     * Alihkan ke halaman jenjang dengan **memuat dokumen penuh**.
     *
     * Redirect server (`redirect()`) memicu navigasi lunak: router memakai ulang layout `/tka`
     * yang sudah ter-mount — padahal layout itu dirender tanpa chrome untuk halaman pengenalan —
     * sehingga sidebar hilang setelah masuk dari onboarding/tautan lain. Memuat dokumen penuh
     * membuat server merender layout sesuai path tujuan.
     *
     * Catatan: deteksi "ini navigasi klien?" lewat header `rsc` tidak bisa dipakai karena Next
     * tidak meneruskan header internal itu ke `headers()`.
     */
    function goToLevel(target: string) {
        return <FullPageRedirect href={target} />
    }

    const fallbackLevel = TKA_AVAILABLE_LEVELS[0] ?? 'SMP'
    const cookieStore = await cookies()
    const preferredLevel = parseTkaLevel(cookieStore.get('tka-level')?.value)
    if (preferredLevel && isTkaLevelAvailable(preferredLevel)) {
        return goToLevel(tkaLevelPath(preferredLevel))
    }

    const { data: program, error: programError } = await supabase
        .from('programs')
        .select('id')
        .eq('code', 'TKA')
        .maybeSingle()
    if (programError) throw programError
    if (!program) return goToLevel(tkaLevelPath(fallbackLevel))

    const { data: tracks, error: trackError } = await supabase
        .from('tracks')
        .select('id, code')
        .eq('program_id', program.id)
        .in('code', [...TKA_AVAILABLE_LEVELS])
    if (trackError) throw trackError

    const trackIds = (tracks ?? []).map((track) => String(track.id))
    const { data: activeUserTrack, error: userTrackError } = trackIds.length > 0
        ? await supabase
            .from('user_tracks')
            .select('track_id')
            .eq('user_id', user.id)
            .in('track_id', trackIds)
            .in('status', ['active', 'ACTIVE'])
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        : { data: null, error: null }
    if (userTrackError) throw userTrackError

    const activeTrack = activeUserTrack
        ? (tracks ?? []).find((track) => String(track.id) === String(activeUserTrack.track_id))
        : null
    const activeLevel = parseTkaLevel(activeTrack?.code)

    return goToLevel(tkaLevelPath(activeLevel ?? fallbackLevel))
}

function PublicTkaLanding({ loggedIn = false }: { loggedIn?: boolean }) {
    // Saat sudah login, CTA diarahkan ke pemilih jalur — bukan lagi ke /register.
    const cta = loggedIn
        ? {
            primaryHref: '/tka',
            primaryLabel: 'Buka dashboard TKA',
            altLabel: 'Lanjutkan belajar',
            finalLabel: 'Lanjutkan di TKA',
        }
        : {
            primaryHref: '/register?returnTo=%2Ftka',
            primaryLabel: 'Mulai persiapan TKA',
            altLabel: 'Buat akun gratis',
            finalLabel: 'Mulai belajar TKA gratis',
        }

    return (
        <main data-experience-mode="marketing" data-program="tka" className="st-product min-h-screen overflow-x-clip bg-[var(--st-paper)] font-body text-[var(--st-ink)]">
            <ReadingProgress />
            <SeoNavbarClient isAuthenticated={loggedIn} programLabel="TKA" navItems={tkaNavItems} compactNav />
            <TkaHero {...cta} />
            <TkaBenefits />
            <TkaLevels />
            <TkaFlow {...cta} />
            <TkaSubjects />
            <TkaFaq {...cta} />
            <TkaCta {...cta} />
            <TkaFooter />
        </main>
    )
}
