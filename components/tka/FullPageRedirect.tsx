'use client'

import { useEffect } from 'react'

/**
 * Pengalihan yang memaksa **navigasi dokumen penuh** dari sisi klien.
 *
 * Dipakai `/tka` ketika tujuan pengalihan adalah halaman jenjang. Redirect server (`redirect()`)
 * saja tidak cukup untuk navigasi klien: layout `/tka` dibagi antara halaman pengenalan (tanpa
 * chrome) dan halaman jenjang (dengan sidebar), sehingga router memakai ulang layout yang sudah
 * ter-mount dan sidebar-nya hilang. Memuat ulang dokumen membuat server merender layout sesuai
 * path tujuan.
 */
export default function FullPageRedirect({ href }: { href: string }) {
  useEffect(() => {
    window.location.replace(href)
  }, [href])

  return (
    <main className="st-product flex min-h-screen items-center justify-center bg-[var(--st-paper)] px-4 font-body">
      <div className="text-center">
        <p className="text-sm font-bold text-slate-500">Mengalihkan ke halaman jenjang…</p>
        {/* Cadangan tanpa JavaScript: tetap bisa lanjut secara manual. */}
        <noscript>
          <a
            href={href}
            className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white"
          >
            Buka halaman jenjang
          </a>
        </noscript>
      </div>
    </main>
  )
}
