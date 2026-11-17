import CommercePackagesClient from '@/components/dashboard/CommercePackagesClient'
import { commerceService } from '@/src/services/commerce.service'
import { authorizationService } from '@/src/services/authorization.service'
import { PERMISSIONS } from '@/src/auth/permissions'
import { env } from '@/lib/env'

export const dynamic = 'force-dynamic'

export default async function TokenPackagesPage({
    program = 'CPNS',
    level,
    tokenBalance,
}: {
    program?: 'CPNS' | 'TKA'
    level?: string
    tokenBalance?: number
}) {
    const catalogProgram = program === 'TKA' ? 'TKA' : 'CPNS'
    const catalogTrack = program === 'TKA' ? (level?.trim().toUpperCase() || 'SMP') : 'SKD'
    const offers = await commerceService.listActiveProductOffers(catalogProgram, catalogTrack)
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
        <CommercePackagesClient
            packages={packages}
            qaQrisEnabled={qaQrisEnabled}
            program={program}
            level={level}
            tokenBalance={tokenBalance}
        />
    )
}
