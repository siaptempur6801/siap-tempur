import { createClient } from '@/utils/supabase/server'
import LandingUI from '@/components/home/LandingUI'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return <LandingUI user={user} />
}
