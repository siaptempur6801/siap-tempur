import type { Metadata } from 'next'
import CpnsPilihJalurContent from '@/components/cpns/CpnsPilihJalurContent'
import PaperBackground from '@/components/PaperBackground'
import { PageAnimateContainer, PageAnimateItem } from '@/components/ui/PageAnimate'
import { createV2Client } from '@/lib/utils/supabase/server'
import { getPassAccess } from '@/src/services/pass-catalog.service'

export const metadata: Metadata = {
    title: 'Pilih Jalur CPNS — SIAP TEMPUR',
    description: 'Pilih fokus SKD (TWK, TIU, TKP) dan tangga latihan CPNS: drilling materi, mini tryout, lalu full tryout.',
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Pilih Jalur **CPNS** — halaman tersendiri, fokus ke subtes SKD dan tangga latihan.
 * Sebelumnya halaman ini memakai komponen bersama dengan TKA sehingga tampilannya sama.
 */
export default async function CpnsPilihJalurPage() {
    const supabase = await createV2Client()
    const { data: { user } } = await supabase.auth.getUser()
    const passAccess = user
        ? await getPassAccess(supabase, user.id, 'cpns')
        : { hasActivePass: false, accessThrough: null, scheduledExtensions: 0 }

    return (
        <div className="relative min-h-screen w-full">
            <PaperBackground />
            <PageAnimateContainer className="relative z-10 mx-auto max-w-6xl space-y-7 px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:py-9">
                <PageAnimateItem>
                <CpnsPilihJalurContent hasActivePass={passAccess.hasActivePass} />
                </PageAnimateItem>
            </PageAnimateContainer>
        </div>
    )
}
