import LandingUI from '@/components/home/LandingUI'
import { Metadata } from 'next'
import { createClient } from '@/lib/utils/supabase/server'

export const metadata: Metadata = {
  title: 'Tryout SKD CPNS 2026 - Simulasi CAT BKN Terlengkap',
  description:
    'Tryout simulasi SKD CPNS & Kedinasan 2026 dengan sistem CAT BKN asli. Akses ribuan soal TWK, TIU, TKP, pembahasan lengkap, dan ranking nasional se-Indonesia.',
  alternates: {
    canonical: '/cpns',
  },
}

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return <LandingUI user={user ? { id: user.id } : null} />
}
