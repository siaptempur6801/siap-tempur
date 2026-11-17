'use client'

import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from 'react'
import Link from 'next/link'

/**
 * Tautan navigasi yang selalu menggulir ke section tujuan.
 *
 * Kenapa perlu: `<a href="#produk">` bawaan browser (dan `next/link`) hanya menggulir ketika hash
 * URL **berubah**. Setelah pengguna mengkliknya sekali, hash sudah `#produk`; ketika ia menggulir
 * manual lalu mengklik tombol yang sama lagi, tidak terjadi apa-apa — inilah penyebab tombol
 * "Pilih program"/"Lihat program" terasa kadang tidak berfungsi.
 *
 * Komponen ini selalu menggulir ke elemen tujuan (menghormati `scroll-margin-top` pada section),
 * lalu memperbarui hash URL tanpa lompatan. Klik dengan modifier (tab baru, dsb.) dibiarkan
 * berperilaku bawaan, dan tautan non-anchor tetap memakai `next/link` seperti biasa.
 */
export default function InPageLink({
  href,
  children,
  onClick,
  ...rest
}: { href: string; children: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  const targetId = href.startsWith('#') && href.length > 1 ? href.slice(1) : null

  if (!targetId) {
    return (
      <Link href={href} onClick={onClick as never} {...rest}>
        {children}
      </Link>
    )
  }

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event)
    if (event.defaultPrevented) return
    // Biarkan browser menangani klik dengan modifier (buka tab baru, salin tautan, dsb.).
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

    const target = document.getElementById(targetId)
    if (!target) return

    event.preventDefault()
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
    window.history.replaceState(null, '', href)
  }

  return (
    <a href={href} onClick={handleClick} {...rest}>
      {children}
    </a>
  )
}
