import MidtransSnapScript from '@/components/payments/MidtransSnapScript'
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
        return (
            <div className="mx-auto flex min-h-[55vh] max-w-xl items-center justify-center px-4 py-12 text-center">
                <div className="st-flat-card w-full p-7">
                    <h1 className="text-2xl font-black text-slate-950">Event belum bisa dimuat.</h1>
                    <p className="mt-2 text-sm leading-6 text-slate-600">Coba muat ulang halaman beberapa saat lagi.</p>
                </div>
            </div>
        )
    }

    const learnerEvents = events.map((event) => ({
        ...event,
        description: event.description || 'Ikuti tryout sesuai jadwal event ini dan lihat hasil setelah sesi selesai.',
    }))

    return (
        <div className="mx-auto w-full max-w-7xl px-4 py-6 pb-24 font-body sm:px-6 lg:px-8 lg:py-9 [&_.font-display]:font-body">
            <MidtransSnapScript />
            <EventClient events={learnerEvents} />
        </div>
    )
}
