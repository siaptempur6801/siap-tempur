import MidtransSnapScript from '@/components/payments/MidtransSnapScript'
import { createV2Client } from '@/lib/utils/supabase/server'
import { redirect } from 'next/navigation'
import EventClient from '@/components/dashboard/EventClient'
import { eventCommerceService } from '@/src/services/event-commerce.service'
import EventLoadError from '@/components/dashboard/EventLoadError'

export const dynamic = 'force-dynamic'

export default async function UserEventPage() {
  const supabase = await createV2Client()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login?next=/cpns/dashboard/event')

  const events = await eventCommerceService.getUserEventPageData(user.id).catch(() => null)
  if (!events) {
    return (
      <div
        data-experience-mode="learning"
        data-program="cpns"
        className="st-product flex min-h-[55vh] items-center justify-center py-12"
      >
        <EventLoadError />
      </div>
    )
  }

  const learnerEvents = events.map((event) => ({
    ...event,
    description:
      event.description ||
      'Ikuti tryout sesuai jadwal event ini dan lihat hasil setelah sesi selesai.',
  }))

  return (
    <div data-experience-mode="learning" data-program="cpns" className="st-product">
      <MidtransSnapScript />
      <EventClient events={learnerEvents} />
    </div>
  )
}
