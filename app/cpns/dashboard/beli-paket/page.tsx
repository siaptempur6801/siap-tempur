import PaperBackground from '@/components/PaperBackground'
import CommercePackagesClient from '@/components/dashboard/CommercePackagesClient'
import { commerceService } from '@/src/services/commerce.service'
import { authorizationService } from '@/src/services/authorization.service'
import { PERMISSIONS } from '@/src/auth/permissions'
import { env } from '@/lib/env'

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

    const qaQrisEnabled = env.appEnvironment() === 'staging'
        && await authorizationService.hasPermission(PERMISSIONS.PAYMENT_MANAGE)

    return (
        <div className="font-body w-full flex flex-col relative">
            <PaperBackground />
            <CommercePackagesClient packages={packages} qaQrisEnabled={qaQrisEnabled} />
        </div>
    )
}
