import CpnsProductLandingV12 from '@/components/home/CpnsProductLandingV12'
import { Metadata } from 'next'
import { createAdminClient, createClient } from '@/lib/utils/supabase/server'
import { autoCloseExpiredTryoutEvents } from '@/lib/tryout-event-status'

const eventSelect = 'id, title, description, starts_at, ends_at, start_grace_minutes, duration_minutes, max_participants, requires_code, is_paid, price, status, flyer_image_url, documentation_url'
const legacyEventSelect = 'id, title, description, starts_at, ends_at, start_grace_minutes, duration_minutes, max_participants, requires_code, is_paid, price, status, flyer_image_url'
const articleSelect = 'id, title, slug, cover_image_url, published_at, excerpt'

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

  const admin = await createAdminClient()
  await autoCloseExpiredTryoutEvents(admin)
  const now = new Date().toISOString()

  const activeEventsResult = await admin
    .from('tryout_events')
    .select(eventSelect)
    .in('status', ['scheduled', 'live'])
    .gte('ends_at', now)
    .order('starts_at', { ascending: true })
    .limit(3)

  const activeEvents = activeEventsResult.error
    ? (await admin
      .from('tryout_events')
      .select(legacyEventSelect)
      .in('status', ['scheduled', 'live'])
      .gte('ends_at', now)
      .order('starts_at', { ascending: true })
      .limit(3)).data?.map((event) => ({ ...event, documentation_url: null }))
    : activeEventsResult.data

  const cpnsArticlesResult = await supabase
    .from('articles')
    .select(articleSelect)
    .eq('status', 'published')
    .or('title.ilike.%CPNS%,title.ilike.%SKD%,title.ilike.%TWK%,title.ilike.%TIU%,title.ilike.%TKP%,excerpt.ilike.%CPNS%,excerpt.ilike.%SKD%')
    .order('published_at', { ascending: false })
    .limit(3)

  let latestArticles = cpnsArticlesResult.data || []

  if (cpnsArticlesResult.error || latestArticles.length < 3) {
    const { data: fallbackArticles } = await supabase
      .from('articles')
      .select(articleSelect)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(6)

    const merged = [...latestArticles]
    for (const article of fallbackArticles || []) {
      if (!merged.some((item) => item.id === article.id)) merged.push(article)
      if (merged.length >= 3) break
    }
    latestArticles = merged.slice(0, 3)
  }

  return (
    <CpnsProductLandingV12
      user={user ? { id: user.id } : null}
      activeEvents={(activeEvents || []) as Parameters<typeof CpnsProductLandingV12>[0]['activeEvents']}
      latestArticles={(latestArticles || []) as Parameters<typeof CpnsProductLandingV12>[0]['latestArticles']}
    />
  )
}
