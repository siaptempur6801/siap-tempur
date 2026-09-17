'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, Home, RefreshCw } from 'lucide-react'
import { MascotBubble } from '@/components/brand/playful'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error(error)
    }, [error])

    return (
        <main className="st-product flex min-h-screen items-center justify-center bg-[#fbfaf7] px-4 py-12 font-body">
            <section className="w-full max-w-lg border-2 border-slate-900 bg-white p-6 text-center sm:p-8">
                <MascotBubble name="tara" size="sm" bubbleTone="peach" className="mx-auto w-fit">
                    Ada gangguan kecil di halaman ini. Coba lagi, ya — kalau masih, kembali ke dashboard.
                </MascotBubble>
                <p className="mt-5 inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-700" /> Terjadi gangguan
                </p>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Halaman ini belum bisa dimuat.</h1>
                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600 sm:text-base">
                    Coba lagi. Jika gangguan masih muncul, kamu bisa kembali ke dashboard dan melanjutkan dari sana.
                </p>

                <div className="mt-7 grid gap-3 sm:grid-cols-2">
                    <button
                        type="button"
                        onClick={() => reset()}
                        className="st-button st-focus flex min-h-11 items-center justify-center gap-2 bg-blue-600 px-4 py-2.5 text-sm text-white"
                    >
                        <RefreshCw size={17} /> Coba Lagi
                    </button>
                    <Link href="/cpns/dashboard" className="st-button st-focus flex min-h-11 items-center justify-center gap-2 bg-white px-4 py-2.5 text-sm text-slate-900">
                        <Home size={17} /> Dashboard CPNS
                    </Link>
                </div>

                {process.env.NODE_ENV === 'development' && (
                    <details className="mt-6 border border-red-200 bg-red-50 p-3 text-left text-xs text-red-800">
                        <summary className="cursor-pointer font-bold">Detail pengembangan</summary>
                        <pre className="mt-2 max-h-36 overflow-auto whitespace-pre-wrap">{error.message}</pre>
                        {error.digest && <p className="mt-2 opacity-70">Digest: {error.digest}</p>}
                    </details>
                )}
            </section>
        </main>
    )
}
