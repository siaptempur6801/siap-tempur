'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Menu, X } from 'lucide-react'
import TrackedLink from '@/components/analytics/TrackedLink'
import { trackProductEvent } from '@/lib/product-analytics'
import InPageLink from '@/components/marketing/InPageLink'

const baseSections = [
    { id: 'peta-skd', label: 'Peta SKD' },
    { id: 'alur', label: 'Cara belajar' },
    { id: 'mulai-dari-mana', label: 'Mulai dari mana' },
    { id: 'latihan', label: 'Pilihan latihan' },
    { id: 'pemulihan', label: 'Soal salah & remedial' },
    { id: 'bandingkan', label: 'Bedanya SiapTempur' },
    { id: 'event', label: 'Event tryout' },
    { id: 'paket', label: 'Paket & token' },
    { id: 'faq', label: 'FAQ' },
] as const

type CpnsLandingInteractionsProps = {
    primaryAccountHref: string
    isLoggedIn: boolean
    hasArticles: boolean
}

export default function CpnsLandingInteractions({
    primaryAccountHref,
    isLoggedIn,
    hasArticles,
}: CpnsLandingInteractionsProps) {
    const [activeSection, setActiveSection] = useState('')
    const [menuOpen, setMenuOpen] = useState(false)
    const [heroPassed, setHeroPassed] = useState(false)
    const [finalCtaVisible, setFinalCtaVisible] = useState(false)

    const sections = useMemo(
        () => hasArticles
            ? [...baseSections.slice(0, -1), { id: 'artikel', label: 'Artikel CPNS' }, baseSections[baseSections.length - 1]]
            : [...baseSections],
        [hasArticles],
    )

    const desktopNav = useMemo(() => [
        { id: 'peta-skd', label: 'Peta SKD', matches: ['peta-skd'] },
        { id: 'alur', label: 'Cara kerja', matches: ['alur', 'pemulihan', 'bandingkan'] },
        { id: 'mulai-dari-mana', label: 'Mulai', matches: ['mulai-dari-mana'] },
        { id: 'latihan', label: 'Latihan', matches: ['latihan', 'event'] },
        { id: 'paket', label: 'Paket', matches: ['paket'] },
        { id: 'faq', label: 'FAQ', matches: hasArticles ? ['artikel', 'faq'] : ['faq'] },
    ], [hasArticles])

    const activeNavId = desktopNav.find((item) => item.matches.includes(activeSection))?.id ?? ''

    useEffect(() => {
        const targets = sections
            .map((section) => document.getElementById(section.id))
            .filter((element): element is HTMLElement => Boolean(element))

        if (targets.length === 0) return

        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries
                    .filter((entry) => entry.isIntersecting)
                    .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]

                if (visible?.target.id) setActiveSection(visible.target.id)
            },
            { rootMargin: '-24% 0px -62% 0px', threshold: [0.05, 0.2, 0.45] },
        )

        targets.forEach((target) => observer.observe(target))
        return () => observer.disconnect()
    }, [sections])

    useEffect(() => {
        const hero = document.getElementById('hero-cpns')
        const finalCta = document.getElementById('final-cta')
        if (!hero || !finalCta) return

        const heroObserver = new IntersectionObserver(
            ([entry]) => {
                setHeroPassed(!entry.isIntersecting && entry.boundingClientRect.bottom < 96)
            },
            { rootMargin: '-72px 0px 0px 0px', threshold: 0 },
        )
        const finalObserver = new IntersectionObserver(
            ([entry]) => setFinalCtaVisible(entry.isIntersecting),
            { threshold: 0.05 },
        )

        heroObserver.observe(hero)
        finalObserver.observe(finalCta)
        return () => {
            heroObserver.disconnect()
            finalObserver.disconnect()
        }
    }, [])

    useEffect(() => {
        const seen = new Set<number>()
        const thresholds = [25, 50, 75, 90] as const

        const onScroll = () => {
            const scrollable = document.documentElement.scrollHeight - window.innerHeight
            if (scrollable <= 0) return
            const depth = Math.round((window.scrollY / scrollable) * 100)

            thresholds.forEach((threshold) => {
                if (depth >= threshold && !seen.has(threshold)) {
                    seen.add(threshold)
                    trackProductEvent('px_landing_scroll', { program: 'cpns', surface: 'landing', depth: threshold })
                }
            })
        }

        onScroll()
        window.addEventListener('scroll', onScroll, { passive: true })
        return () => window.removeEventListener('scroll', onScroll)
    }, [])

    function trackNav(section: string) {
        trackProductEvent('px_landing_nav', { program: 'cpns', surface: 'landing', section })
        setMenuOpen(false)
    }

    return (
        <>
            <header className="sticky top-0 z-50 px-4 py-2.5 md:px-8 md:py-3.5">
                <div className="px-container-marketing relative flex min-h-14 items-center justify-between gap-3 rounded-2xl border-2 border-[var(--st-ink)] bg-white/90 px-4 st-shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-white/80 md:min-h-16 md:px-5">
                    <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                        <Link href="/" className="st-focus shrink-0 font-script text-2xl font-black tracking-tight md:text-3xl">
                            Siap<span className="text-blue-600 underline decoration-wavy decoration-2 underline-offset-2">Tempur</span>.
                        </Link>
                        <span className="inline-flex shrink-0 rounded-full border-2 border-[var(--st-ink)] bg-blue-100 px-2 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-blue-800 sm:px-2.5 sm:text-[11px]">CPNS</span>
                    </div>

                    <nav className="hidden items-center gap-0.5 text-[13px] font-black xl:flex" aria-label="Navigasi CPNS">
                        {desktopNav.map((item) => (
                            <InPageLink
                                key={item.id}
                                href={`#${item.id}`}
                                onClick={() => trackNav(item.id)}
                                className={`st-focus rounded-xl px-2.5 py-2 transition-colors ${activeNavId === item.id ? 'bg-blue-100 text-blue-800' : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'}`}
                                aria-current={activeNavId === item.id ? 'location' : undefined}
                            >
                                {item.label}
                            </InPageLink>
                        ))}
                        <Link href="/tka" className="st-focus rounded-xl px-2.5 py-2 text-gray-700 hover:bg-green-50 hover:text-green-700">TKA</Link>
                    </nav>

                    <div className="flex items-center gap-2">
                        {!isLoggedIn && (
                            <Link href="/login?returnTo=/cpns" className="st-focus hidden min-h-11 items-center rounded-xl px-3 text-sm font-black text-gray-700 hover:bg-gray-100 sm:inline-flex">
                                Masuk
                            </Link>
                        )}
                        <TrackedLink
                            href={primaryAccountHref}
                            eventName="px_landing_cta"
                            eventProperties={{ program: 'cpns', surface: 'landing', cta: isLoggedIn ? 'header_dashboard' : 'header_start' }}
                            className="st-button hidden min-h-11 items-center justify-center bg-blue-600 px-4 py-2 text-sm font-black text-white sm:inline-flex"
                        >
                            {isLoggedIn ? 'Dashboard' : 'Mulai belajar'}
                        </TrackedLink>
                        <button
                            type="button"
                            onClick={() => setMenuOpen((current) => !current)}
                            className="st-focus flex h-11 w-11 items-center justify-center rounded-xl border-2 border-[var(--st-ink)] bg-white xl:hidden"
                            aria-expanded={menuOpen}
                            aria-label={menuOpen ? 'Tutup menu CPNS' : 'Buka menu CPNS'}
                        >
                            {menuOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                    </div>

                    {menuOpen && (
                        <div data-testid="cpns-mobile-menu" className="absolute left-0 right-0 top-[4.15rem] max-h-[72vh] overflow-y-auto rounded-2xl border-2 border-[var(--st-ink)] bg-white p-2 st-shadow-md md:left-auto md:right-0 md:top-[4.75rem] md:w-72">
                            {sections.map((section) => (
                                <InPageLink
                                    key={section.id}
                                    href={`#${section.id}`}
                                    onClick={() => trackNav(section.id)}
                                    className={`st-focus flex min-h-11 items-center rounded-xl px-3 text-sm font-black ${activeSection === section.id ? 'bg-blue-100 text-blue-800' : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'}`}
                                >
                                    {section.label}
                                </InPageLink>
                            ))}
                            <Link href="/tka" className="st-focus flex min-h-11 items-center rounded-xl px-3 text-sm font-black text-green-700 hover:bg-green-50">Buka SiapTempur TKA</Link>
                            {!isLoggedIn && (
                                <div className="mt-2 grid gap-2 border-t border-gray-200 pt-3 sm:hidden">
                                    <Link href="/login?returnTo=/cpns" className="st-focus flex min-h-11 items-center justify-center rounded-xl text-sm font-black text-gray-700 hover:bg-gray-100">
                                        Masuk
                                    </Link>
                                    <TrackedLink
                                        href={primaryAccountHref}
                                        eventName="px_landing_cta"
                                        eventProperties={{ program: 'cpns', surface: 'landing', cta: 'mobile_menu_start' }}
                                        className="st-button flex min-h-11 items-center justify-center bg-blue-600 px-4 py-2 text-sm font-black text-white"
                                    >
                                        Mulai belajar
                                    </TrackedLink>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </header>

            {heroPassed && !finalCtaVisible && activeSection !== 'artikel' && (
                <div data-testid="cpns-mobile-sticky-cta" className="fixed inset-x-3 bottom-3 z-40 md:hidden">
                    <div className="flex items-center gap-3 rounded-2xl border-2 border-[var(--st-ink)] bg-white/95 p-2 st-shadow-md backdrop-blur">
                        <div className="min-w-0 flex-1 pl-2">
                            <p className="truncate text-xs font-black uppercase tracking-[0.08em] text-blue-700">Siap<span className="underline decoration-wavy decoration-2 underline-offset-2">Tempur</span> CPNS</p>
                            <p className="truncate text-sm font-bold text-gray-700">TWK · TIU · TKP</p>
                        </div>
                        <TrackedLink
                            href={primaryAccountHref}
                            eventName="px_landing_cta"
                            eventProperties={{ program: 'cpns', surface: 'landing', cta: 'mobile_sticky_start' }}
                            className="st-button inline-flex min-h-11 items-center justify-center gap-2 bg-blue-600 px-4 py-2 text-sm font-black text-white"
                        >
                            {isLoggedIn ? 'Lanjut' : 'Mulai'} <ArrowRight size={16} />
                        </TrackedLink>
                    </div>
                </div>
            )}
        </>
    )
}

export function CpnsEventCountdown({ startsAt, status }: { startsAt: string; status: 'scheduled' | 'live' | 'closed' }) {
    const [label, setLabel] = useState(status === 'live' ? 'Sedang berlangsung' : 'Menghitung waktu...')

    useEffect(() => {
        function refresh() {
            if (status === 'live') {
                setLabel('Sedang berlangsung')
                return
            }

            const target = new Date(startsAt).getTime()
            if (Number.isNaN(target)) {
                setLabel('Jadwal segera diumumkan')
                return
            }

            const distance = target - Date.now()
            if (distance <= 0) {
                setLabel('Waktu mulai telah tiba')
                return
            }

            const days = Math.floor(distance / 86_400_000)
            const hours = Math.floor((distance % 86_400_000) / 3_600_000)
            const minutes = Math.floor((distance % 3_600_000) / 60_000)

            if (days > 0) setLabel(`${days} hari ${hours} jam lagi`)
            else if (hours > 0) setLabel(`${hours} jam ${minutes} menit lagi`)
            else setLabel(`${Math.max(minutes, 1)} menit lagi`)
        }

        refresh()
        const interval = window.setInterval(refresh, 60_000)
        return () => window.clearInterval(interval)
    }, [startsAt, status])

    return <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">{label}</span>
}
