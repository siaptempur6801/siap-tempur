import { notFound } from 'next/navigation'
import TkaPassQrisQaClient from '@/components/tka/TkaPassQrisQaClient'
import { env } from '@/lib/env'
import { PERMISSIONS } from '@/src/auth/permissions'
import { authorizationService } from '@/src/services/authorization.service'
import { commerceService } from '@/src/services/commerce.service'
import { parseTkaLevel } from '@/src/tka/context'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function TkaPassQaPaymentPage({
    params,
}: {
    params: Promise<{ level: string }>
}) {
    const { level: levelParam } = await params
    const level = parseTkaLevel(levelParam)
    if (!level) notFound()

    const allowed = env.appEnvironment() === 'staging'
        && await authorizationService.hasPermission(PERMISSIONS.PAYMENT_MANAGE)
    if (!allowed) notFound()

    const offers = (await commerceService.listActiveProductOffers('TKA', level))
        .filter((offer) => offer.code.startsWith(`TKA_${level}_PASS_`))
        .sort((a, b) => (a.durationDays ?? 0) - (b.durationDays ?? 0))
        .map((offer) => ({
            code: offer.code,
            name: offer.name,
            price: offer.price,
            durationDays: offer.durationDays,
        }))

    return <TkaPassQrisQaClient level={level} offers={offers} />
}
