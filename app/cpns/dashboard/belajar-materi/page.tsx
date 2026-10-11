import { createClient } from '@/lib/utils/supabase/server'
import { redirect } from 'next/navigation'
import BelajarMateriClient from '@/components/dashboard/BelajarMateriClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Materi Belajar — SIAP TEMPUR',
  description: 'Rangkuman dan latihan per submateri SKD CPNS.',
}

export default async function BelajarMateriPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <BelajarMateriClient />
}
