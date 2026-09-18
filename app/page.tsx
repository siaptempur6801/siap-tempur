import type { Metadata } from 'next'
import ReadingProgress from '@/components/blog/ReadingProgress'
import { getAuthUserIdVerified } from '@/lib/utils/supabase/server'
import {
    LandingAccount,
    LandingAudience,
    LandingBenefits,
    LandingCompare,
    LandingCta,
    LandingFaq,
    LandingFeatures,
    LandingFooter,
    LandingHeader,
    LandingHero,
    LandingPrograms,
    LandingQuickStart,
    LandingSteps,
} from '@/components/home/landing/sections'

export const metadata: Metadata = {
    title: 'SiapTempur - Persiapan CPNS & TKA SD, SMP, SMA',
    description: 'Satu akun untuk persiapan CPNS/SKD dan TKA jenjang SD, SMP, hingga SMA dengan latihan, tryout, pembahasan, analisis hasil, drill, dan remedial yang lebih terarah.',
    alternates: { canonical: '/' },
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Landing page utama.
 *
 * Struktur seksi ada di `components/home/landing/sections.tsx` dan kontennya di
 * `components/home/landing/content.ts`, supaya halaman ini tinggal menyusun alur:
 * hero → manfaat → mulai cepat → program → pembeda → audiens → cara kerja → fitur →
 * satu akun → tanya jawab → CTA → footer.
 */
export default async function Index() {
    // Hanya butuh "sudah login atau belum" untuk memilih label CTA.
    // `getAuthUserIdVerified` memverifikasi JWT secara lokal (proyek ini memakai
    // ES256 + JWKS), sehingga tidak ada round trip ke Auth server hanya demi
    // satu label — sebelumnya `getUser()` menembak `/auth/v1/user` di sini.
    const userId = await getAuthUserIdVerified()
    const loggedIn = Boolean(userId)

    const cta = {
        primaryHref: loggedIn ? '#produk' : '/register?returnTo=%2F',
        primaryLabel: loggedIn ? 'Pilih program' : 'Mulai belajar gratis',
    }

    return (
        <main className="st-product min-h-screen overflow-x-clip bg-[var(--st-paper)] font-body text-[var(--st-ink)]">
            <ReadingProgress />
            <LandingHeader user={loggedIn} {...cta} />
            <LandingHero {...cta} />
            <LandingBenefits />
            <LandingQuickStart {...cta} />
            <LandingPrograms />
            <LandingCompare />
            <LandingAudience />
            <LandingSteps {...cta} />
            <LandingFeatures />
            <LandingAccount />
            <LandingFaq {...cta} />
            <LandingCta {...cta} />
            <LandingFooter />
        </main>
    )
}
