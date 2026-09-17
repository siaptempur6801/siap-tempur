import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, BookOpenCheck, CheckCircle2, GraduationCap, ShieldCheck } from 'lucide-react'
import { createV2Client } from '@/lib/utils/supabase/server'

export const metadata: Metadata = {
    title: 'Pilih Program Belajar - SiapTempur',
    description: 'Pilih program CPNS atau jenjang TKA untuk melanjutkan perjalanan belajar di SiapTempur.',
    robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

const programOptions = [
    {
        href: '/cpns/dashboard',
        code: 'CPNS',
        title: 'Dashboard CPNS',
        description: 'Persiapan SKD melalui TWK, TIU, TKP, drill materi, mini tryout, dan full tryout.',
        details: ['Latihan SKD terarah', 'Hasil dan remedial', 'Event dan peringkat'],
        icon: ShieldCheck,
        badgeClass: 'bg-blue-100 text-blue-800',
        iconClass: 'bg-blue-600 text-white',
        actionClass: 'bg-blue-600 text-white',
    },
    {
        href: '/tka',
        code: 'TKA',
        title: 'TKA sesuai jenjang',
        description: 'Lanjutkan ke ruang belajar SD, SMP, atau SMA sesuai jenjang aktifmu.',
        details: ['Pilih jenjang belajar', 'Latihan dan diagnostik', 'Pantau perkembangan'],
        icon: GraduationCap,
        badgeClass: 'bg-emerald-100 text-emerald-800',
        iconClass: 'bg-emerald-600 text-white',
        actionClass: 'bg-emerald-600 text-white',
    },
] as const

export default async function OnboardingPage() {
    const supabase = await createV2Client()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login?returnTo=%2F')

    return (
        <main className="st-product relative min-h-screen overflow-hidden bg-[var(--st-paper)] px-4 py-6 font-body text-[var(--st-ink)] md:px-8 md:py-8">
            <div className="pointer-events-none absolute -left-20 top-40 h-48 w-48 rounded-full border-2 border-dashed border-amber-400 bg-[var(--st-yellow-soft)]" aria-hidden="true" />
            <div className="pointer-events-none absolute -right-16 bottom-20 h-52 w-44 rotate-6 border-2 border-dashed border-emerald-300 bg-[var(--st-green-soft)]" aria-hidden="true" />

            <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] max-w-5xl flex-col">
                <Link href="/" className="st-focus w-fit font-script text-2xl font-black tracking-tight md:text-3xl">
                    Siap<span className="text-blue-600 underline decoration-wavy decoration-2 underline-offset-2">Tempur</span>.
                </Link>

                <section className="flex flex-1 flex-col justify-center py-10" aria-labelledby="program-title">
                    <div className="mx-auto max-w-3xl text-center">
                        <div className="st-kicker"><BookOpenCheck size={15} /> Pilih ruang belajar</div>
                        <h1 id="program-title" className="st-heading-display mt-5 text-4xl sm:text-5xl md:text-6xl">
                            Mau belajar di program yang mana?
                        </h1>
                        <p className="st-muted mx-auto mt-4 max-w-2xl text-base font-semibold leading-relaxed md:text-lg">
                            Akunmu dapat digunakan untuk semua program. Pilih tujuan belajar yang ingin kamu lanjutkan sekarang.
                        </p>
                    </div>

                    <div className="mx-auto mt-9 grid w-full max-w-4xl gap-5 md:grid-cols-2">
                        {programOptions.map((program) => {
                            const Icon = program.icon

                            return (
                                <Link
                                    key={program.code}
                                    href={program.href}
                                    className="st-card-md st-focus group flex flex-col bg-white p-5 transition-transform hover:-translate-y-1 sm:p-6 md:min-h-80 md:p-7"
                                    data-testid={`program-choice-${program.code.toLowerCase()}`}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <span className={`flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl border-2 border-[var(--st-ink)] ${program.iconClass}`}>
                                            <Icon size={25} />
                                        </span>
                                        <span className={`inline-flex rounded-full border-2 border-[var(--st-ink)] px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.1em] ${program.badgeClass}`}>
                                            {program.code}
                                        </span>
                                    </div>

                                    <h2 className="st-heading-display mt-5 text-3xl md:mt-6 md:text-4xl">{program.title}</h2>
                                    <p className="st-muted mt-3 font-semibold leading-relaxed">{program.description}</p>

                                    <div className="mt-5 hidden gap-2 text-sm font-bold text-gray-600 sm:grid">
                                        {program.details.map((detail) => (
                                            <span key={detail} className="inline-flex items-center gap-2">
                                                <CheckCircle2 size={16} className="text-green-600" /> {detail}
                                            </span>
                                        ))}
                                    </div>

                                    <span className={`st-button mt-5 inline-flex min-h-12 items-center justify-center gap-2 px-5 py-3 font-black sm:mt-7 ${program.actionClass}`}>
                                        Buka {program.code} <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                                    </span>
                                </Link>
                            )
                        })}
                    </div>
                </section>
            </div>
        </main>
    )
}
