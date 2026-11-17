'use client'

import { useEffect, useState } from 'react'

/**
 * Garis tipis di paling atas halaman yang menunjukkan seberapa jauh pembaca sudah menggulir
 * artikel. Dipakai di halaman artikel blog (`/blog/[slug]`).
 *
 * - Dekoratif: `aria-hidden`, tidak mengganggu pembaca layar.
 * - Menghormati `prefers-reduced-motion` (transisi lebar dimatikan).
 */
export default function ReadingProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const update = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight
      const value =
        scrollable > 0 ? Math.min(100, Math.max(0, (window.scrollY / scrollable) * 100)) : 0
      setProgress(value)
    }

    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-1">
      <div
        className="h-full bg-[var(--brand-blue)] transition-[width] duration-150 ease-out motion-reduce:transition-none"
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}
