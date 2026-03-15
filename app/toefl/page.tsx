import { cookies } from 'next/headers'
import ToeflLandingUI from '@/components/home/ToeflLandingUI'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Tryout TOEFL ITP 2026 - Simulasi TOEFL Realistis",
  description: "Latihan simulasi TOEFL ITP dengan sistem scoring IRT (310-677) yang akurat. Akses ribuan soal Listening, Structure, dan Reading dengan pembahasan lengkap.",
  alternates: {
    canonical: '/toefl',
  },
}

// Cache halaman landing selama 60 detik di Vercel CDN
export const revalidate = 60

export default async function ToeflHome() {
  const cookieStore = await cookies()
  const hasSession = cookieStore.getAll().some(c =>
    c.name.includes('sb-') && c.name.includes('-auth-token')
  )

  return <ToeflLandingUI user={hasSession ? { id: 'cached' } as any : null} />
}
