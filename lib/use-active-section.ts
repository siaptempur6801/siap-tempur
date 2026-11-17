'use client'

import { useEffect, useMemo, useState } from 'react'

/**
 * Menandai section yang sedang dilihat pengguna pada navigasi landing/artikel.
 *
 * Dipakai bersama oleh landing `/`, `/tka`, `/cpns`, daftar `/blog`, dan daftar isi artikel supaya
 * perilakunya sama. Aturannya sederhana dan bekerja untuk halaman panjang maupun pendek:
 *
 * 1. Section yang "membungkus garis baca" (112px dari atas viewport) menang.
 * 2. Kalau tidak ada, section terdekat dengan garis baca yang dipilih.
 * 3. Kalau tidak ada section yang terlihat (mis. pengguna di hero), penanda dikosongkan.
 */
export type SectionNavItem = {
    /** Id elemen section di halaman (tanpa `#`). */
    id: string
    label: string
    /** Id section lain yang dianggap mewakili item nav ini (mis. beberapa section → satu menu). */
    matches?: readonly string[]
}

/** Jarak garis baca dari atas viewport. Disamakan dengan `scroll-mt-28` (7rem = 112px) yang
 *  dipakai section, supaya setelah klik tautan anchor section itu langsung dianggap aktif. */
const READING_LINE = 112

/** Toleransi di sekitar garis baca (sub-pixel & pembulatan `scroll-margin-top`). */
const READING_TOLERANCE = 6

/** Bagian layar minimum agar sebuah section dianggap sedang dilihat saat belum melewati garis baca. */
const MIN_VISIBLE_FRACTION = 0.25

export function useActiveSection(items: readonly SectionNavItem[]) {
    const [activeSection, setActiveSection] = useState('')

    // Kunci berupa string supaya identitas array baru dari pemanggil tidak memicu ulang listener.
    const observedKey = items
        .flatMap((item) => (item.matches && item.matches.length > 0 ? [...item.matches] : [item.id]))
        .join('|')
    const observedIds = useMemo(() => (observedKey ? observedKey.split('|') : []), [observedKey])

    useEffect(() => {
        if (observedIds.length === 0) return

        let frame = 0

        const compute = () => {
            frame = 0
            const viewportHeight = window.innerHeight
            // Section terakhir yang sudah dimulai (top paling besar yang masih di atas garis baca).
            let startedId = ''
            let startedTop = Number.NEGATIVE_INFINITY
            // Cadangan untuk halaman pendek: section yang paling banyak terlihat di layar.
            let fallbackId = ''
            let fallbackFraction = 0

            for (const id of observedIds) {
                const element = document.getElementById(id)
                if (!element) continue

                const rect = element.getBoundingClientRect()
                if (rect.bottom <= 0) continue

                if (rect.top <= READING_LINE + READING_TOLERANCE && rect.top > startedTop) {
                    startedTop = rect.top
                    startedId = id
                }

                const visible = Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0)
                const fraction = visible / viewportHeight
                if (fraction > fallbackFraction) {
                    fallbackFraction = fraction
                    fallbackId = id
                }
            }

            // Pada halaman yang praktis muat dalam satu layar, gulir tidak bisa menempatkan section
            // di garis baca, jadi tandai saja section yang paling terlihat.
            const scrollable = document.documentElement.scrollHeight - viewportHeight
            const pageFitsOneScreen = scrollable < viewportHeight * 0.5

            // Di dasar halaman (mis. bagian terakhir artikel panjang), garis baca tidak akan pernah
            // terlewati. Tandai section terakhir yang masih terlihat supaya pembaca tahu posisinya.
            const atBottom = scrollable > 0 && window.scrollY + viewportHeight >= document.documentElement.scrollHeight - 8
            if (atBottom) {
                let lastVisibleId = ''
                let lastVisibleTop = Number.NEGATIVE_INFINITY
                for (const id of observedIds) {
                    const element = document.getElementById(id)
                    if (!element) continue
                    const rect = element.getBoundingClientRect()
                    if (rect.bottom <= 0 || rect.top >= viewportHeight) continue
                    if (rect.top > lastVisibleTop) {
                        lastVisibleTop = rect.top
                        lastVisibleId = id
                    }
                }
                if (lastVisibleId) {
                    setActiveSection(lastVisibleId)
                    return
                }
            }

            // Utamakan section yang sudah melewati garis baca. Kalau belum ada (mis. pengguna masih
            // di hero), tandai section yang benar-benar menutupi layar — ini yang membuat halaman
            // pendek seperti daftar blog tetap punya penanda; kalau tidak ada, penanda dikosongkan.
            setActiveSection(
                startedId || ((pageFitsOneScreen || fallbackFraction >= MIN_VISIBLE_FRACTION) ? fallbackId : ''),
            )
        }

        const schedule = () => {
            if (frame !== 0) return
            frame = window.requestAnimationFrame(compute)
        }

        schedule()
        window.addEventListener('scroll', schedule, { passive: true })
        window.addEventListener('resize', schedule)
        return () => {
            if (frame !== 0) window.cancelAnimationFrame(frame)
            window.removeEventListener('scroll', schedule)
            window.removeEventListener('resize', schedule)
        }
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
