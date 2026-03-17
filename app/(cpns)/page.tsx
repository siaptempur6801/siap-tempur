import { cookies } from 'next/headers'
import LandingUI from '@/components/home/LandingUI'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Tryout SKD CPNS 2026 - Simulasi CAT BKN Terlengkap",
  description: "Latihan simulasi SKD CPNS & Kedinasan 2026 dengan sistem CAT BKN asli. Akses ribuan soal TWK, TIU, TKP, pembahasan lengkap, dan ranking nasional se-Indonesia.",
  alternates: {
    canonical: '/',
  },
}

// Cache halaman landing selama 60 detik di Vercel CDN
// Karena konten landing page sama untuk semua orang
export const revalidate = 60

export default async function Home() {
  // Baca cookie session tanpa memanggil Supabase API
  // Middleware sudah refresh session dan menyimpannya di cookie
  const cookieStore = await cookies()
  const hasSession = cookieStore.getAll().some(c =>
    c.name.includes('sb-') && c.name.includes('-auth-token')
  )

  // Passing user sebagai boolean — LandingUI hanya butuh tahu apakah user logged in
  // untuk menampilkan tombol yang tepat (Dashboard vs Masuk)
  return <LandingUI user={hasSession ? { id: 'cached' } as any : null} />
}
