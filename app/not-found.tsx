import Link from 'next/link'
import { ArrowLeft, Home } from 'lucide-react'
import { Mascot } from '@/components/brand/Mascot'

export default function NotFound() {
    return (
        <main className="st-product flex min-h-screen items-center justify-center bg-[#fbfaf7] px-4 py-12 font-body">
            <section className="w-full max-w-lg border-2 border-slate-900 bg-white p-6 text-center sm:p-8">
                <Mascot name="tara" size="sm" tone="soft" className="mx-auto" />
                <p className="mt-5 text-xs font-black uppercase tracking-[0.14em] text-slate-500">404 · Halaman tidak ditemukan</p>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Halaman yang kamu cari tidak tersedia.</h1>
                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600 sm:text-base">
                    Tautannya mungkin sudah berubah atau halaman tersebut belum tersedia. Kamu bisa kembali ke halaman utama atau dashboard CPNS.
                </p>

                <div className="mt-7 grid gap-3 sm:grid-cols-2">
                    <Link href="/" className="st-button st-focus flex min-h-11 items-center justify-center gap-2 bg-white px-4 py-2.5 text-sm text-slate-900">
                        <ArrowLeft size={17} /> Halaman Utama
                    </Link>
                    <Link href="/cpns/dashboard" className="st-button st-focus flex min-h-11 items-center justify-center gap-2 bg-blue-600 px-4 py-2.5 text-sm text-white">
                        <Home size={17} /> Dashboard CPNS
                    </Link>
                </div>
            </section>
        </main>
    )
}
