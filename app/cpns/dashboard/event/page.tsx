import { createV2Client } from '@/lib/utils/supabase/server'
import { redirect } from 'next/navigation'
import EventClient from '@/components/dashboard/EventClient'
import { eventCommerceService } from '@/src/services/event-commerce.service'

export const dynamic = 'force-dynamic'

export default async function UserEventPage() {
    const supabase = await createV2Client()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login?next=/cpns/dashboard/event')

    const events = await eventCommerceService.getUserEventPageData(user.id).catch(() => null)
    if (!events) {
        return <div className="p-8 text-center font-bold text-gray-900">Gagal memuat event</div>
    }

    return <EventClient events={events} />
}
