import type { Metadata } from 'next'
import PilihJalurContent from '@/components/dashboard/PilihJalurContent'

export const metadata: Metadata = {
    title: 'Pilih Jalur Belajar — SIAP TEMPUR',
    description: 'Pilih jalur persiapan belajar SKD CPNS atau jenjang TKA (SD, SMP, SMA) dalam satu akun SiapTempur.',
}

export const dynamic = 'force-dynamic'

export default function PilihJalurPage() {
    return (
        <div className="min-h-screen px-4 py-6 md:px-8 md:py-8">
            <div className="mx-auto max-w-6xl space-y-6 md:space-y-8">
                <PilihJalurContent currentTrack="cpns" />
            </div>
        </div>
    )
}
