import MidtransSnapScript from '@/components/payments/MidtransSnapScript'
import TokenPackagesPage from '@/components/dashboard/TokenPackagesPage'
import PaperBackground from '@/components/PaperBackground'
import { PageAnimateContainer, PageAnimateItem } from '@/components/ui/PageAnimate'

export const dynamic = 'force-dynamic'

/**
 * Beli token CPNS. Memakai kerangka halaman CPNS yang sama dengan halaman lain
 * (`PageAnimateContainer` + `st-kicker`) supaya tidak terasa berbeda.
 */
export default function BeliPaketPage() {
    return (
        <div className="relative min-h-screen w-full">
            <MidtransSnapScript />
            <PaperBackground />
            <PageAnimateContainer className="relative z-10 mx-auto max-w-6xl space-y-7 px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:py-9">
                <PageAnimateItem>
                    <TokenPackagesPage />
                </PageAnimateItem>
            </PageAnimateContainer>
        </div>
    )
}
