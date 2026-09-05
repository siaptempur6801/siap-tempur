import Link from 'next/link'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import {
    ArrowRight,
    BookOpenCheck,
    CheckCircle2,
    GraduationCap,
    School,
} from 'lucide-react'
import { createV2Client } from '@/lib/utils/supabase/server'
import SeoNavbarClient from '@/components/SeoNavbarClient'
import { TKA_AVAILABLE_LEVELS, isTkaLevelAvailable, parseTkaLevel, tkaLevelPath } from '@/src/tka/context'

export const metadata: Metadata = {
    title: 'Persiapan TKA SD, SMP, SMA - SiapTempur',
    description: 'Persiapan TKA untuk jenjang SD, SMP, dan SMA dengan latihan, tryout, pembahasan, analisis hasil, serta remedial dalam satu akun SiapTempur.',
    alternates: { canonical: '/tka' },
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function TkaHomePage() {
    const supabase = await createV2Client()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return <PublicTkaLanding />

    const fallbackLevel = TKA_AVAILABLE_LEVELS[0] ?? 'SMP'
    const cookieStore = await cookies()
    const preferredLevel = parseTkaLevel(cookieStore.get('tka-level')?.value)
    if (preferredLevel && isTkaLevelAvailable(preferredLevel)) {
        redirect(tkaLevelPath(preferredLevel))
    }

    const { data: program, error: programError } = await supabase
        .from('programs')
        .select('id')
        .eq('code', 'TKA')
        .maybeSingle()
    if (programError) throw programError
    if (!program) redirect(tkaLevelPath(fallbackLevel))

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

    redirect(tkaLevelPath(activeLevel ?? fallbackLevel))
}

function PublicTkaLanding() {
    return (
        <main data-experience-mode="marketing" data-program="tka" className="st-product min-h-screen overflow-x-clip bg-[var(--st-paper)] font-body text-[var(--st-ink)]">
            <SeoNavbarClient isAuthenticated={false} programLabel="TKA" />

            <section className="relative px-4 pb-16 pt-32 md:px-8 md:pb-24 md:pt-36">
                <div className="pointer-events-none absolute -left-24 top-40 h-52 w-52 rounded-full border-2 border-dashed border-amber-400 bg-[var(--st-yellow-soft)]" aria-hidden="true" />
                <div className="pointer-events-none absolute -right-16 top-24 h-56 w-48 rotate-12 rounded-[2rem] border-2 border-dashed border-emerald-300 bg-[var(--st-green-soft)]" aria-hidden="true" />

                <div className="relative mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.04fr_0.96fr] lg:gap-14">
                    <div>
                        <div className="st-kicker"><GraduationCap size={15} /> TKA SD · SMP · SMA</div>
                        <h1 className="st-heading-display mt-6 max-w-4xl text-5xl sm:text-6xl md:text-7xl">
                            Persiapan TKA untuk <span className="text-blue-600">setiap jenjang belajar.</span>
                        </h1>
                        <p className="st-muted mt-6 max-w-2xl text-lg font-semibold leading-relaxed md:text-xl">
                            Mulai dari SD, lanjut ke SMP, hingga SMA dalam satu lingkungan belajar. Kerjakan latihan dan tryout, pahami hasilnya, lalu perbaiki bagian yang masih lemah.
                        </p>
                        <div className="mt-8 flex flex-wrap gap-3">
                            <Link href="/register?returnTo=%2Ftka" className="st-button inline-flex min-h-12 items-center gap-2 bg-blue-600 px-5 py-3 font-black text-white">
                                Mulai persiapan TKA <ArrowRight size={18} />
                            </Link>
                            <Link href="#jenjang-tka" className="st-focus inline-flex min-h-12 items-center rounded-xl px-4 py-3 font-black text-gray-700 hover:bg-white">
                                Pilih jenjang
                            </Link>
                        </div>
                        <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-bold text-gray-600">
                            {['Satu akun lintas jenjang', 'Progres belajar tersimpan', 'Belajar dari hasil'].map((item) => (
                                <span key={item} className="inline-flex items-center gap-2">
                                    <CheckCircle2 size={17} className="text-green-600" /> {item}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="st-card-lg bg-white p-6 md:p-8">
                        <p className="text-xs font-black uppercase tracking-[0.12em] text-blue-700">Siklus belajar SiapTempur</p>
                        <h2 className="st-heading-display mt-3 text-4xl md:text-5xl">Ukur, pahami, lalu perbaiki.</h2>
                        <div className="mt-7 divide-y-2 divide-dashed divide-gray-200">
                            {[
                                { number: '01', title: 'Pilih jenjang', text: 'Masuk ke jalur TKA SD, SMP, atau SMA.' },
                                { number: '02', title: 'Kerjakan dan ukur', text: 'Gunakan latihan atau tryout sesuai tujuanmu.' },
                                { number: '03', title: 'Belajar dari hasil', text: 'Buka pembahasan dan ulangi bagian yang perlu diperkuat.' },
                            ].map((step) => (
                                <div key={step.number} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                                    <span className="font-handwriting text-3xl font-black text-blue-600">{step.number}</span>
                                    <div>
                                        <p className="font-black">{step.title}</p>
                                        <p className="st-muted mt-1 text-sm font-semibold leading-relaxed">{step.text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section id="jenjang-tka" className="scroll-mt-28 border-y-2 border-[var(--st-ink)] bg-white px-4 py-16 md:px-8 md:py-24">
                <div className="mx-auto max-w-7xl">
                    <div className="max-w-3xl">
                        <div className="st-kicker">Pilih jenjang</div>
                        <h2 className="st-heading-display mt-5 text-4xl md:text-6xl">Satu fondasi belajar, tiga tahap perjalanan.</h2>
                        <p className="st-muted mt-4 text-lg font-semibold leading-relaxed">Setiap jenjang memiliki jalur belajar tersendiri agar materi, hasil, dan progres tetap sesuai kebutuhanmu.</p>
                    </div>
                    <div className="mt-10 grid gap-5 md:grid-cols-3">
                        <PublicLevelCard href="/tka/sd" level="SD" title="TKA SD" description="Bangun fondasi literasi dan numerasi melalui latihan yang terarah sejak jenjang dasar." icon={<School size={24} />} tone="amber" />
                        <PublicLevelCard href="/tka/smp" level="SMP" title="TKA SMP" description="Perkuat Bahasa Indonesia dan Matematika lewat latihan, tryout, serta pembahasan." icon={<BookOpenCheck size={24} />} tone="blue" available />
                        <PublicLevelCard href="/tka/sma" level="SMA" title="TKA SMA" description="Siapkan kemampuan akademik sesuai jenjang dan pilihan mata pelajaran yang tersedia." icon={<GraduationCap size={24} />} tone="green" />
                    </div>
                </div>
            </section>

            <section className="px-4 py-16 md:px-8 md:py-24">
                <div className="mx-auto grid max-w-7xl items-center gap-8 rounded-[2rem] border-2 border-[var(--st-ink)] bg-blue-600 px-6 py-10 text-white shadow-[6px_6px_0_var(--st-ink)] md:grid-cols-[1fr_auto] md:px-10 md:py-12">
                    <div>
                        <h2 className="font-handwriting text-4xl font-black leading-tight md:text-5xl">Mulai dari jenjangmu hari ini.</h2>
                        <p className="mt-3 max-w-2xl font-semibold leading-relaxed text-blue-100">Satu akun menyimpan perjalanan belajar TKA dari SD, SMP, hingga SMA.</p>
                    </div>
                    <Link href="/register?returnTo=%2Ftka" className="st-button inline-flex min-h-12 items-center justify-center gap-2 bg-white px-5 py-3 font-black text-gray-900">
                        Buat akun gratis <ArrowRight size={18} />
                    </Link>
                </div>
            </section>
        </main>
    )
}

function PublicLevelCard({
    href,
    level,
    title,
    description,
    icon,
    tone,
    available = false,
}: {
    href: string
    level: string
    title: string
    description: string
    icon: React.ReactNode
    tone: 'amber' | 'blue' | 'green'
    available?: boolean
}) {
    const toneClass = tone === 'amber'
        ? 'bg-amber-100 text-amber-700'
        : tone === 'green'
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-blue-100 text-blue-700'

    const content = (
        <>
            <div className="flex items-start justify-between gap-4">
                <span className={`flex h-13 w-13 items-center justify-center rounded-2xl border-2 border-[var(--st-ink)] ${toneClass}`}>{icon}</span>
                <span className="text-xs font-black uppercase tracking-[0.12em] text-gray-500">{available ? `Jenjang ${level}` : 'Segera hadir'}</span>
            </div>
            <h3 className="st-heading-display mt-6 text-4xl">{title}</h3>
            <p className="st-muted mt-3 flex-1 font-semibold leading-relaxed">{description}</p>
            <span className={`mt-6 inline-flex items-center gap-2 font-black ${available ? 'text-blue-700' : 'text-gray-400'}`}>
                {available ? 'Buka jenjang' : 'Belum tersedia'}
                {available && <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />}
            </span>
        </>
    )

    if (!available) {
        return <article aria-disabled="true" className="st-card-md flex min-h-72 flex-col bg-slate-50 p-6 md:p-7">{content}</article>
    }

    return <Link href={href} className="st-card-md st-focus group flex min-h-72 flex-col bg-white p-6 transition-transform hover:-translate-y-1 md:p-7">{content}</Link>
}
