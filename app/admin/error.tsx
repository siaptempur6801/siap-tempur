'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, LayoutDashboard, RefreshCw } from 'lucide-react'
import { AdminCard, adminPrimaryButtonClass, adminSecondaryButtonClass } from '@/components/admin/AdminUi'

/**
 * Error boundary untuk seluruh permukaan admin.
 *
 * Sebelumnya `app/admin/**` tidak punya `error.tsx`, sehingga kegagalan di
 * halaman admin jatuh ke `app/error.tsx` — boundary produk yang menawarkan
 * "Dashboard CPNS" dan bermaskot. Bagi admin yang sedang bekerja, itu dua
 * masalah: tujuan pemulihannya salah (ia bukan peserta), dan pesan yang
 * ditampilkan tidak memberi tahu bahwa datanya **tidak** berubah.
 *
 * Dua hal yang sengaja dinyatakan di sini, karena keduanya pertanyaan pertama
 * admin saat halaman gagal dimuat:
 *
 * 1. Tidak ada yang rusak — kegagalan render tidak menulis apa pun.
 * 2. Apa yang bisa dilakukan sekarang, tanpa membuka SQL atau dashboard Supabase.
 */
export default function AdminError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        // Jejak di console: `digest` yang ditampilkan ke admin harus bisa
        // dicocokkan dengan baris log ini di server.
        console.error('[admin] halaman gagal dirender', error)
    }, [error])

    const isDev = process.env.NODE_ENV === 'development'

    return (
        <div className="space-y-5 pb-10">
            <AdminCard className="p-6">
                <p className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-red-700">
                    <AlertTriangle size={14}/> Halaman admin gagal dimuat
                </p>
                <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Halaman ini belum bisa dibuka.</h1>
                <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-600">
                    Tidak ada data yang berubah — kegagalan ini terjadi saat halaman dirender, sebelum aksi apa pun dijalankan.
                    Coba muat ulang halaman ini. Bila tetap gagal, kembali ke Dashboard admin dan lanjutkan dari sana.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                    <button type="button" onClick={() => reset()} className={adminPrimaryButtonClass}>
                        <RefreshCw size={16}/> Coba lagi
                    </button>
                    <Link href="/admin" className={adminSecondaryButtonClass}>
                        <LayoutDashboard size={16}/> Dashboard admin
                    </Link>
                </div>

                <dl className="mt-6 grid gap-3 border-t border-slate-200 pt-5 text-xs sm:grid-cols-2">
                    <div>
                        <dt className="font-extrabold uppercase tracking-wide text-slate-400">Yang bisa dicoba</dt>
                        <dd className="mt-1 font-medium leading-5 text-slate-600">
                            Muat ulang sekali lagi, lalu buka menu lain di sidebar. Bila hanya satu halaman yang gagal,
                            lanjutkan pekerjaan lewat menu yang lain dan laporkan halaman tersebut.
                        </dd>
                    </div>
                    <div>
                        <dt className="font-extrabold uppercase tracking-wide text-slate-400">Saat melaporkan</dt>
                        <dd className="mt-1 font-medium leading-5 text-slate-600">
                            Sertakan <span className="font-mono">digest</span> di bawah — itu cara tercepat menemukan
                            jejak kegagalan ini di log server.
                        </dd>
                    </div>
                </dl>

                <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-[11px] font-semibold text-slate-600">
                    digest: {error.digest || 'tidak tersedia'}
                </p>

                {isDev ? (
                    <details className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                        <summary className="cursor-pointer font-bold">Detail pengembangan</summary>
                        <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap">{error.message}</pre>
                    </details>
                ) : null}
            </AdminCard>
        </div>
    )
}
