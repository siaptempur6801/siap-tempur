'use client'

import { useEffect, useMemo, useState } from 'react'

/**
 * Menandai section yang sedang dilihat pengguna pada navigasi landing page.
 *
 * Dipakai bersama oleh landing `/`, `/tka`, dan `/cpns` supaya perilakunya sama:
 * section yang paling banyak menutupi area pandang dianggap aktif (heuristik ini bekerja untuk
 * halaman panjang maupun halaman pendek yang hanya bisa digulir sedikit). Bila tidak ada section
 * yang cukup dominan — mis. pengguna masih di hero — tidak ada menu yang ditandai.
 */
export type SectionNavItem = {
    /** Id elemen section di halaman (tanpa `#`). */
    id: string
    label: string
    /** Id section lain yang dianggap mewakili item nav ini (mis. beberapa section → satu menu). */
    matches?: readonly string[]
}

/** Bagian layar minimum yang harus ditutupi sebuah section agar dianggap sedang dilihat. */
const MIN_COVERAGE = 0.12

export function useActiveSection(items: readonly SectionNavItem[]) {
    const [activeSection, setActiveSection] = useState('')

    // Kunci berupa string supaya identitas array baru dari pemanggil tidak memicu
    // pembuatan ulang IntersectionObserver pada setiap render.
    const observedKey = items
        .flatMap((item) => (item.matches && item.matches.length > 0 ? [...item.matches] : [item.id]))
        .join('|')
    const observedIds = useMemo(() => (observedKey ? observedKey.split('|') : []), [observedKey])

    useEffect(() => {
        const targets = observedIds
            .map((id) => document.getElementById(id))
            .filter((element): element is HTMLElement => Boolean(element))
        if (targets.length === 0) return

        // Simpan penutupan layar terakhir per section: callback observer hanya memuat target yang
        // berubah, jadi keputusan "section mana yang dominan" diambil dari peta ini.
        const coverage = new Map<string, number>()

        const pickActive = () => {
            const best = [...coverage.entries()].sort((a, b) => b[1] - a[1])[0]
            if (best && best[1] >= MIN_COVERAGE) {
                setActiveSection(best[0])
                return
            }
            // Tidak ada section yang cukup dominan (mis. masih di hero).
            setActiveSection('')
        }

        const observer = new IntersectionObserver(
            (entries) => {
                const viewportHeight = window.innerHeight || 1
                for (const entry of entries) {
                    // Bagian layar yang ditutupi section ini (0–1), bukan rasio terhadap tinggi section:
                    // section panjang tetap dihitung "sedang dibaca" walau rasionya kecil.
                    const covered = entry.isIntersecting
                        ? (entry.intersectionRatio * entry.boundingClientRect.height) / viewportHeight
                        : 0
                    coverage.set(entry.target.id, covered)
                }
                pickActive()
            },
            { rootMargin: '-96px 0px 0px 0px', threshold: [0, 0.05, 0.15, 0.3, 0.5, 0.75, 1] },
        )

        targets.forEach((target) => observer.observe(target))
        return () => observer.disconnect()
    }, [observedIds])

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
