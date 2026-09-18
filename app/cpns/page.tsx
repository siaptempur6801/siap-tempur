import CpnsProductLandingV12 from '@/components/home/CpnsProductLandingV12'
import { Metadata } from 'next'
import { createClient } from '@/lib/utils/supabase/server'

const articleSelect = 'id, title, slug, cover_image_url, published_at, excerpt, content, category'

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
    description: 'Latihan TWK, TIU, TKP, Drill, Tryout, pembahasan, dan remedial dalam satu alur belajar CPNS yang lebih terarah.',
    url: '/cpns',
    type: 'website',
  },
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: latestArticles } = await supabase
    .from('articles')
    .select(articleSelect)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(3)

  return (
    <CpnsProductLandingV12
      user={user ? { id: user.id } : null}
      activeEvents={[]}
      latestArticles={(latestArticles || []) as Parameters<typeof CpnsProductLandingV12>[0]['latestArticles']}
    />
  )
}
