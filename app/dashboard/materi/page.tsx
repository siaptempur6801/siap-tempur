import { createClient } from '@/utils/supabase/server'
import MateriClient from '@/components/materials/MateriClient'

export default async function MateriPage() {
    const supabase = await createClient()
    const { data: materials } = await supabase
        .from('materials')
        .select('*')
        .order('category', { ascending: true })
        .order('is_premium', { ascending: true })

    return <MateriClient materials={materials || []} />
}
