import { eventService } from '@/src/services/event.service'
import { commerceService } from '@/src/services/commerce.service'

function nullableString(value: unknown) {
    return typeof value === 'string' ? value : null
}

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
                payment_status: nullableString(latestOrder?.paymentStatus),
                payment_order_id: nullableString(latestOrder?.id),
                payment_snap_token: nullableString(latestOrder?.snapToken),
            }
        }))
    }
}

export const eventCommerceService = new EventCommerceService()
