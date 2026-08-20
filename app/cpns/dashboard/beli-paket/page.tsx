import PaperBackground from '@/components/PaperBackground'
import CommercePackagesClient from '@/components/dashboard/CommercePackagesClient'
import { commerceService } from '@/src/services/commerce.service'

export const dynamic = 'force-dynamic'

export default async function BeliPaketPage() {
    const offers = await commerceService.listActiveProductOffers('CPNS', 'SKD')
    const packages = offers
        .filter((offer) => offer.productType === 'TOKEN_PACK' && offer.tokenGrant > 0)
        .sort((a, b) => a.tokenGrant - b.tokenGrant)
        .map((offer) => ({
            code: offer.code,
            name: offer.name,
            description: offer.description,
            price: offer.price,
            currency: offer.currency,
            tokenGrant: offer.tokenGrant,
        }))

    return (
        <div className="font-body w-full flex flex-col relative">
            <PaperBackground />
            <CommercePackagesClient packages={packages} />
        </div>
    )
}
