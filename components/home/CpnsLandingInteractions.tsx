'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Menu, X } from 'lucide-react'
import { track } from '@vercel/analytics'
import TrackedLink from '@/components/analytics/TrackedLink'

const baseSections = [
    { id: 'peta-skd', label: 'Peta SKD' },
    { id: 'alur', label: 'Alur belajar' },
    { id: 'pemulihan', label: 'Soal salah' },
    { id: 'bandingkan', label: 'Bedanya' },
    { id: 'mulai-dari-mana', label: 'Mulai dari mana' },
    { id: 'latihan', label: 'Latihan' },
    { id: 'event', label: 'Event' },
    { id: 'paket', label: 'Paket' },
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
    const [activeSection, setActiveSection] = useState('peta-skd')
    const [menuOpen, setMenuOpen] = useState(false)

    const sections = useMemo(
        () => hasArticles
            ? [...baseSections.slice(0, -1), { id: 'artikel', label: 'Artikel' }, baseSections[baseSections.length - 1]]
            : [...baseSections],
        [hasArticles],
    )

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
            { rootMargin: '-28% 0px -58% 0px', threshold: [0.05, 0.2, 0.45] },
        )

        targets.forEach((target) => observer.observe(target))
        return () => observer.disconnect()
    }, [sections])

    useEffect(() => {
        const seen = new Set<number>()
        const thresholds = [25, 50, 75, 90]

        const onScroll = () => {
            const scrollable = document.documentElement.scrollHeight - window.innerHeight
            if (scrollable <= 0) return
            const depth = Math.round((window.scrollY / scrollable) * 100)

            thresholds.forEach((threshold) => {
                if (depth >= threshold && !seen.has(threshold)) {
                    seen.add(threshold)
                    track('px_landing_scroll', { program: 'cpns', depth: threshold })
                }
            })
        }

        onScroll()
        window.addEventListener('scroll', onScroll, { passive: true })
        return () => window.removeEventListener('scroll', onScroll)
    }, [])

    function trackNav(section: string) {
        track('px_landing_nav', { program: 'cpns', section })
        setMenuOpen(false)
    }

    return (
        <>
            <header className="sticky top-0 z-50 px-4 py-3 md:px-8 md:py-4">
                <div className="px-container-marketing flex min-h-16 items-center justify-between gap-3 rounded-2xl border-2 border-[var(--st-ink)] bg-white/90 px-4 shadow-[3px_3px_0_var(--st-ink)] backdrop-blur-md supports-[backdrop-filter]:bg-white/80 md:px-5">
                    <div className="flex min-w-0 items-center gap-3">
                        <Link href="/" className="st-focus shrink-0 font-handwriting text-2xl font-black tracking-tight md:text-3xl">
                            Siap<span className="text-blue-600">Tempur</span>.
                        </Link>
                        <span className="hidden rounded-full bg-[var(--st-blue-soft)] px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.1em] text-blue-700 sm:inline-flex">CPNS</span>
                    </div>

                    <nav className="hidden items-center gap-1 text-sm font-black xl:flex" aria-label="Navigasi CPNS">
                        {sections.slice(0, hasArticles ? 7 : 7).map((section) => (
                            <a
                                key={section.id}
                                href={`#${section.id}`}
                                onClick={() => trackNav(section.id)}
                                className={`st-focus rounded-xl px-3 py-2 transition-colors ${activeSection === section.id ? 'bg-blue-100 text-blue-800' : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'}`}
                                aria-current={activeSection === section.id ? 'location' : undefined}
                            >
                                {section.label}
                            </a>
                        ))}
                        <Link href="/tka" className="st-focus rounded-xl px-3 py-2 text-gray-700 hover:bg-green-50 hover:text-green-700">TKA</Link>
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
                        <div className="absolute left-4 right-4 top-[4.75rem] rounded-2xl border-2 border-[var(--st-ink)] bg-white p-2 shadow-[4px_4px_0_var(--st-ink)] md:left-auto md:right-8 md:w-72">
                            {sections.map((section) => (
                                <a
                                    key={section.id}
                                    href={`#${section.id}`}
                                    onClick={() => trackNav(section.id)}
                                    className={`st-focus flex min-h-11 items-center rounded-xl px-3 text-sm font-black ${activeSection === section.id ? 'bg-blue-100 text-blue-800' : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'}`}
                                >
                                    {section.label}
                                </a>
                            ))}
                            <Link href="/tka" className="st-focus flex min-h-11 items-center rounded-xl px-3 text-sm font-black text-green-700 hover:bg-green-50">Buka SiapTempur TKA</Link>
                        </div>
                    )}
                </div>
            </header>

            <div className="fixed inset-x-3 bottom-3 z-40 md:hidden">
                <div className="flex items-center gap-3 rounded-2xl border-2 border-[var(--st-ink)] bg-white/95 p-2 shadow-[4px_4px_0_var(--st-ink)] backdrop-blur">
                    <div className="min-w-0 flex-1 pl-2">
                        <p className="truncate text-xs font-black uppercase tracking-[0.08em] text-blue-700">SiapTempur CPNS</p>
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
