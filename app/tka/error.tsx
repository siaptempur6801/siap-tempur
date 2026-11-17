'use client'

import Link from 'next/link'
import { startTransition, useState } from 'react'
import { AlertCircle, RotateCcw } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/LoadingState'

export default function TkaError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [retrying, setRetrying] = useState(false)

  const retry = () => {
    if (retrying) return
    setRetrying(true)
    startTransition(() => reset())
  }

  return (
    <main
      data-experience-mode="learning"
      data-program="tka"
      className="st-product min-h-screen px-4 py-10 md:px-8"
    >
      <section className="mx-auto max-w-xl rounded-lg border border-red-200 bg-white p-6 text-center md:p-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-red-50 text-red-700">
          <AlertCircle size={24} aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-slate-950">Ruang belajar belum bisa dimuat</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Progresmu tetap tersimpan. Coba muat kembali halaman ini atau kembali ke jenjang aktifmu.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={retry}
            disabled={retrying}
            className="st-focus inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {retrying ? (
              <LoadingSpinner label="Memuat ulang TKA" size="sm" />
            ) : (
              <RotateCcw size={17} aria-hidden="true" />
            )}
            {retrying ? 'Memuat ulang...' : 'Coba lagi'}
          </button>
          <Link
            href="/tka"
            className="st-focus inline-flex min-h-11 items-center justify-center rounded-lg border border-border-strong bg-white px-5 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            Kembali ke TKA
          </Link>
        </div>
      </section>
    </main>
  )
}
