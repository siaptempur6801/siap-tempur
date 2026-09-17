import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import TkaPilihJalurContent from '@/components/tka/TkaPilihJalurContent'
import { createV2Client } from '@/lib/utils/supabase/server'
import { getPassAccess } from '@/src/services/pass-catalog.service'
import { passScopeForTkaLevel } from '@/src/tka/pass-scope'
import { isTkaLevelAvailable, parseTkaLevel } from '@/src/tka/context'

export const metadata: Metadata = {
    title: 'Pilih Jalur TKA — SIAP TEMPUR',
    description: 'Pilih jalur latihan TKA per jenjang: tes diagnostik, latihan fokus, mini tryout, dan full tryout.',
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Pilih Jalur **TKA** — halaman tersendiri, fokus ke jenjang yang sedang dibuka.
 */
export default async function TkaPilihJalurPage({
    params,
}: {
    params: Promise<{ level: string }>
}) {
    const { level: rawLevel } = await params
    const level = parseTkaLevel(rawLevel)
    if (!level || !isTkaLevelAvailable(level)) notFound()

    const supabase = await createV2Client()
    const { data: { user } } = await supabase.auth.getUser()
    const passAccess = user
        ? await getPassAccess(supabase, user.id, passScopeForTkaLevel(level))
        : { hasActivePass: false, accessThrough: null, scheduledExtensions: 0 }

    return (
        <main data-experience-mode="learning" data-program={`tka-${level.toLowerCase()}`} className="min-h-screen px-4 py-6 md:px-8 md:py-8">
            <div className="mx-auto max-w-6xl">
                <TkaPilihJalurContent level={level} hasActivePass={passAccess.hasActivePass} />
            </div>
        </main>
    )
}
