import { eventService } from '@/src/services/event.service'
import { commerceService } from '@/src/services/commerce.service'

export class EventCommerceService {
    async getUserEventPageData(userId: string) {
        const events = await eventService.getUserEventPageData(userId)

        return Promise.all(events.map(async (event) => {
            const offer = await commerceService.getEventOffer(event.id)
            if (!offer || offer.price <= 0) return event

            const latestOrder = await commerceService.getLatestOrderForProduct(userId, offer.id)
            return {
                ...event,
                is_paid: true,
                price: offer.price,
                payment_status: latestOrder?.paymentStatus ?? null,
                payment_order_id: latestOrder?.id ?? null,
                payment_snap_token: latestOrder?.snapToken ?? null,
            }
        }))
    }
}

export const eventCommerceService = new EventCommerceService()
