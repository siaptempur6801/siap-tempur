'use client'

import { useEffect, useMemo, useState } from 'react'

/**
 * Menandai section yang sedang dilihat pengguna pada navigasi landing page.
 *
 * Dipakai bersama oleh landing `/`, `/tka`, dan `/cpns` supaya perilakunya sama:
 * section yang paling terlihat di area pandang (dengan margin atas/bawah yang menyisakan
 * ruang untuk header) dianggap aktif. Saat pengguna kembali ke hero (dekat atas halaman),
 * tidak ada section yang ditandai.
 */
export type SectionNavItem = {
    /** Id elemen section di halaman (tanpa `#`). */
    id: string
    label: string
    /** Id section lain yang dianggap mewakili item nav ini (mis. beberapa section → satu menu). */
    matches?: readonly string[]
}

const HERO_CLEAR_OFFSET = 140

export function useActiveSection(items: readonly SectionNavItem[]) {
    const [activeSection, setActiveSection] = useState('')

    const observedIds = useMemo(
        () => items.flatMap((item) => (item.matches && item.matches.length > 0 ? [...item.matches] : [item.id])),
        [items],
    )

    useEffect(() => {
        const targets = observedIds
            .map((id) => document.getElementById(id))
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
    }, [observedIds])

    useEffect(() => {
        const onScroll = () => {
            if (window.scrollY < HERO_CLEAR_OFFSET) setActiveSection('')
        }
        window.addEventListener('scroll', onScroll, { passive: true })
        return () => window.removeEventListener('scroll', onScroll)
    }, [])

    const activeId = useMemo(
        () => items.find((item) => (item.matches && item.matches.length > 0 ? item.matches.includes(activeSection) : item.id === activeSection))?.id ?? '',
        [items, activeSection],
    )

    return { activeSection, activeId }
}

/** Ubah `#section` menjadi `section`; kembalikan null untuk tautan non-anchor. */
export function sectionIdFromHref(href: string): string | null {
    return href.startsWith('#') && href.length > 1 ? href.slice(1) : null
}
