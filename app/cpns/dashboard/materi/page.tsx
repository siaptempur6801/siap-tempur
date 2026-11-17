import { createClient } from '@/lib/utils/supabase/server'
import { redirect } from 'next/navigation'
import MateriClient from '@/components/dashboard/MateriClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Kisi-Kisi Materi SKD — SIAP TEMPUR',
  description:
    'Panduan lengkap materi TWK, TIU, dan TKP untuk persiapan Seleksi Kompetensi Dasar CPNS.',
}

export default async function MateriPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <MateriClient />
}
