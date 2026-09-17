'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error('Dashboard Error:', error)
    }, [error])

    return (
        <div className="st-product flex min-h-[60vh] w-full items-center justify-center px-4 py-10 font-body">
            <section className="st-card-md w-full max-w-xl bg-red-50 p-7 text-center md:p-9" role="alert">
                <div className="mx-auto flex h-14 w-14 items-center justify-center border-2 border-[var(--st-ink)] bg-white st-shadow-sm">
                    <AlertTriangle className="h-7 w-7 text-red-600" />
                </div>
                <div className="st-kicker mt-5 bg-red-100">Ada gangguan</div>
                <h2 className="st-heading-display mt-4 text-3xl md:text-4xl">Dashboard belum bisa dimuat.</h2>
                <p className="st-muted mx-auto mt-3 max-w-md text-sm font-semibold leading-relaxed md:text-base">
                    Coba muat ulang bagian ini. Jika masalah masih muncul, kembali beberapa saat lagi tanpa perlu mengulang aktivitas yang sudah tersimpan.
                </p>
                <button
                    type="button"
                    onClick={() => reset()}
                    className="st-button mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 bg-blue-600 px-5 py-3 font-black text-white sm:w-auto"
                >
                    <RotateCcw size={18} /> Coba lagi
                </button>
            </section>
        </div>
    )
}
