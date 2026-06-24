import LandingUI from '@/components/home/LandingUI'
import { Metadata } from 'next'
import { createAdminClient, createClient } from '@/lib/utils/supabase/server'
import { autoCloseExpiredTryoutEvents } from '@/lib/tryout-event-status'

const eventSelect = 'id, title, description, starts_at, ends_at, start_grace_minutes, duration_minutes, max_participants, requires_code, is_paid, price, status, flyer_image_url, documentation_url'
const legacyEventSelect = 'id, title, description, starts_at, ends_at, start_grace_minutes, duration_minutes, max_participants, requires_code, is_paid, price, status, flyer_image_url'

export const metadata: Metadata = {
  title: 'Tryout SKD CPNS 2026 Online - Simulasi CAT BKN',
  description:
    'Platform tryout CPNS online & Kedinasan 2026. Latihan soal CPNS dengan simulasi CAT BKN asli. Akses ribuan soal TWK, TIU, TKP, pembahasan lengkap, dan ranking nasional.',
  alternates: {
    canonical: '/cpns',
  },
}

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
    .limit(8)
  const activeEvents = activeEventsResult.error
    ? (await admin
      .from('tryout_events')
      .select(legacyEventSelect)
      .in('status', ['scheduled', 'live'])
      .gte('ends_at', now)
      .order('starts_at', { ascending: true })
      .limit(8)).data?.map((event) => ({ ...event, documentation_url: null }))
    : activeEventsResult.data

  const completedEventsResult = await admin
    .from('tryout_events')
    .select(eventSelect)
    .in('status', ['scheduled', 'live', 'closed'])
    .or(`status.eq.closed,ends_at.lt.${now}`)
    .order('ends_at', { ascending: false })
    .limit(6)
  const completedEvents = completedEventsResult.error
    ? (await admin
      .from('tryout_events')
      .select(legacyEventSelect)
      .in('status', ['scheduled', 'live', 'closed'])
      .or(`status.eq.closed,ends_at.lt.${now}`)
      .order('ends_at', { ascending: false })
      .limit(6)).data?.map((event) => ({ ...event, documentation_url: null }))
    : completedEventsResult.data

  const { data: latestArticles } = await supabase
    .from('articles')
    .select('id, title, slug, cover_image_url, published_at, excerpt')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(3)

  return (
    <LandingUI
      user={user ? { id: user.id } : null}
      activeEvents={activeEvents || []}
      completedEvents={completedEvents || []}
      latestArticles={latestArticles || []}
    />
  )
}
