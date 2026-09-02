import CpnsProductLandingV11 from '@/components/home/CpnsProductLandingV11'
import { Metadata } from 'next'
import { createAdminClient, createClient } from '@/lib/utils/supabase/server'
import { autoCloseExpiredTryoutEvents } from '@/lib/tryout-event-status'

const eventSelect = 'id, title, description, starts_at, ends_at, start_grace_minutes, duration_minutes, max_participants, requires_code, is_paid, price, status, flyer_image_url, documentation_url'
const legacyEventSelect = 'id, title, description, starts_at, ends_at, start_grace_minutes, duration_minutes, max_participants, requires_code, is_paid, price, status, flyer_image_url'

export const metadata: Metadata = {
  title: 'Persiapan SKD CPNS - Latihan & Tryout | SiapTempur',
  description:
    'Persiapan SKD CPNS dengan latihan TWK, TIU, TKP, mini tryout, full tryout, pembahasan, dan analisis hasil untuk membantu belajar lebih terarah.',
  alternates: {
    canonical: '/cpns',
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

  const { data: latestArticles } = await supabase
    .from('articles')
    .select('id, title, slug, cover_image_url, published_at, excerpt')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(3)

  return (
    <CpnsProductLandingV11
      user={user ? { id: user.id } : null}
      activeEvents={(activeEvents || []) as Parameters<typeof CpnsProductLandingV11>[0]['activeEvents']}
      latestArticles={(latestArticles || []) as Parameters<typeof CpnsProductLandingV11>[0]['latestArticles']}
    />
  )
}
