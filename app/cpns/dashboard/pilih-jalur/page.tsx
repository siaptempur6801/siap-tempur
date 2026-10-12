import type { Metadata } from 'next'
import CpnsPilihJalurContent from '@/components/cpns/CpnsPilihJalurContent'
import { PageAnimateContainer, PageAnimateItem } from '@/components/ui/PageAnimate'

export const metadata: Metadata = {
  title: 'Pilih Jalur CPNS — SIAP TEMPUR',
  description:
    'Pilih fokus SKD (TWK, TIU, TKP) dan tangga latihan CPNS: drilling materi, mini tryout, lalu full tryout.',
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Pilih Jalur **CPNS** — halaman tersendiri, fokus ke subtes SKD dan tangga latihan.
 * Sebelumnya halaman ini memakai komponen bersama dengan TKA sehingga tampilannya sama.
 */
export default function CpnsPilihJalurPage() {
  return (
    <div data-experience-mode="learning" data-program="cpns" className="st-product">
      <PageAnimateContainer className="space-y-6">
        <PageAnimateItem>
          <CpnsPilihJalurContent />
        </PageAnimateItem>
      </PageAnimateContainer>
    </div>
  )
}
