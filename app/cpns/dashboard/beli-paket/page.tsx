import MidtransSnapScript from '@/components/payments/MidtransSnapScript'
import TokenPackagesPage from '@/components/dashboard/TokenPackagesPage'
import { PageAnimateContainer, PageAnimateItem } from '@/components/ui/PageAnimate'

export const dynamic = 'force-dynamic'

/**
 * Beli token CPNS. Memakai kerangka halaman CPNS yang sama dengan halaman lain
 * memakai ruang konten dashboard yang sama dengan halaman belajar lainnya.
 */
export default function BeliPaketPage() {
  return (
    <div data-experience-mode="learning" data-program="cpns" className="st-product space-y-6">
      <MidtransSnapScript />
      <PageAnimateContainer className="space-y-6">
        <PageAnimateItem>
          <TokenPackagesPage />
        </PageAnimateItem>
      </PageAnimateContainer>
    </div>
  )
}
