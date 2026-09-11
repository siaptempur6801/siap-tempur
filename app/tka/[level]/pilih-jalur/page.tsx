import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import PilihJalurContent, { type TrackId } from '@/components/dashboard/PilihJalurContent'
import { parseTkaLevel } from '@/src/tka/context'

export const metadata: Metadata = {
    title: 'Pilih Jalur Belajar — SIAP TEMPUR',
    description: 'Pilih jalur persiapan belajar SKD CPNS atau jenjang TKA (SD, SMP, SMA) dalam satu akun SiapTempur.',
}

export const dynamic = 'force-dynamic'

const LEVEL_TRACK_MAP: Record<string, TrackId> = {
    SD: 'tka-sd',
    SMP: 'tka-smp',
    SMA: 'tka-sma',
}

export default async function TkaPilihJalurPage({
    params,
}: {
    params: Promise<{ level: string }>
}) {
    const { level: rawLevel } = await params
    const level = parseTkaLevel(rawLevel)

    if (!level) {
        notFound()
    }

    const currentTrack: TrackId = LEVEL_TRACK_MAP[level] || 'tka-smp'

    return (
        <main data-experience-mode="learning" data-program={`tka-${level.toLowerCase()}`} className="min-h-screen px-4 py-6 md:px-8 md:py-8">
            <div className="mx-auto max-w-6xl space-y-6 md:space-y-8">
                <PilihJalurContent currentTrack={currentTrack} />
            </div>
        </main>
    )
}
