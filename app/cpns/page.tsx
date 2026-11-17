import CpnsProductLandingV12 from '@/components/home/CpnsProductLandingV12'
import { Metadata } from 'next'
import { getAuthUserIdVerified } from '@/lib/utils/supabase/server'
import { listLatestPublishedArticleCards } from '@/src/services/article-read.service'

export const metadata: Metadata = {
  title: 'Persiapan SKD CPNS - TWK, TIU, TKP, Drill & Tryout | SiapTempur',
  description:
    'Persiapan SKD CPNS dengan Drill TWK, TIU, TKP, Mini Tryout, Full Tryout, pembahasan, soal salah, remedial, dan analisis hasil agar belajar lebih terarah.',
  keywords: [
    'tryout CPNS',
    'SKD CPNS',
    'latihan TWK',
    'latihan TIU',
    'latihan TKP',
    'drill CPNS',
    'mini tryout CPNS',
    'full tryout CPNS',
  ],
  alternates: {
    canonical: '/cpns',
  },
  openGraph: {
    title: 'Persiapan SKD CPNS | SiapTempur',
    description:
      'Latihan TWK, TIU, TKP, Drill, Tryout, pembahasan, dan remedial dalam satu alur belajar CPNS yang lebih terarah.',
    url: '/cpns',
    type: 'website',
  },
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function Home() {
  // Halaman ini hanya butuh TAHU sudah login atau belum, bukan objek user.
  // `getAuthUserIdVerified` memverifikasi JWT secara lokal (ES256 + JWKS) tanpa
  // round trip jaringan. Daftar artikel di-cache 5 menit dan dibatalkan lewat
  // `revalidatePath('/blog')` pada setiap penulisan artikel.
  const userId = await getAuthUserIdVerified()
  const latestArticles = await listLatestPublishedArticleCards(3)

  return (
    <CpnsProductLandingV12
      user={userId ? { id: userId } : null}
      activeEvents={[]}
      latestArticles={
        (latestArticles || []) as Parameters<typeof CpnsProductLandingV12>[0]['latestArticles']
      }
    />
  )
}
