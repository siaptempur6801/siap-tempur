import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, LogIn } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Gagal Masuk',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Tujuan redirect `app/auth/callback/route.ts` saat tukar kode/sesi gagal
 * (tautan verifikasi kedaluwarsa, tautan reset sudah dipakai, OAuth dibatalkan).
 *
 * Sebelumnya folder ini kosong sehingga pengguna mendarat di 404 tanpa petunjuk.
 * Pesan dari query hanya dipakai untuk memilih teks yang dikenal — tidak pernah
 * dirender mentah, supaya tautan buatan pihak luar tidak bisa menampilkan teks
 * sembarang di domain kita.
 */
function describeAuthError(raw: string | undefined) {
  const message = (raw ?? '').toLowerCase()
  if (message.includes('expired') || message.includes('otp_expired')) {
    return 'Tautan sudah kedaluwarsa. Minta tautan baru lalu coba lagi.'
  }
  if (message.includes('access_denied') || message.includes('cancel')) {
    return 'Proses masuk dibatalkan sebelum selesai.'
  }
  if (message.includes('code verifier') || message.includes('flow state')) {
    return 'Tautan harus dibuka di browser yang sama dengan tempat kamu memintanya.'
  }
  if (message.includes('missing_auth_data')) {
    return 'Data autentikasi tidak lengkap. Buka ulang tautan dari email terbaru.'
  }
  return 'Tautan autentikasi tidak valid atau sudah dipakai.'
}

export default async function AuthCodeErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string | string[] }>
}) {
  const { message } = await searchParams
  const description = describeAuthError(Array.isArray(message) ? message[0] : message)

  return (
    <main className="st-product flex min-h-screen items-center justify-center bg-background px-4 py-12 font-body">
      <section className="w-full max-w-lg border-2 border-slate-900 bg-white p-6 text-center sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
          Autentikasi gagal
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
          Kami belum bisa memproses tautanmu.
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600 sm:text-base">
          {description}
        </p>

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <Link
            href="/"
            className="st-button st-focus flex min-h-11 items-center justify-center gap-2 bg-white px-4 py-2.5 text-sm text-slate-900"
          >
            <ArrowLeft size={17} /> Halaman Utama
          </Link>
          <Link
            href="/login"
            className="st-button st-focus flex min-h-11 items-center justify-center gap-2 bg-blue-600 px-4 py-2.5 text-sm text-white"
          >
            <LogIn size={17} /> Masuk
          </Link>
        </div>
      </section>
    </main>
  )
}
