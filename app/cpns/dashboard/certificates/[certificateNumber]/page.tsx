import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Download, ShieldCheck } from 'lucide-react'
import { createV2AdminClient, createV2Client } from '@/lib/utils/supabase/server'
import { EventCertificatePreview } from '@/components/certificates/EventCertificatePreview'
import { authorizationService } from '@/src/services/authorization.service'

export const dynamic = 'force-dynamic'

type CertificatePreviewRow = {
    user_id: string
    certificate_number: string
    name_locked_at: string | null
}

export default async function CertificatePreviewPage({
    params,
}: {
    params: Promise<{ certificateNumber: string }>
}) {
    const { certificateNumber } = await params
    const supabase = await createV2Client()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect(`/login?next=/cpns/dashboard/certificates/${encodeURIComponent(certificateNumber)}`)

    const admin = await createV2AdminClient()
    const { data: certificate, error } = await admin
        .from('certificates')
        .select('user_id, certificate_number, name_locked_at')
        .eq('certificate_number', certificateNumber)
        .maybeSingle()

    const row = certificate as CertificatePreviewRow | null
    if (error || !row) notFound()
    if (!row.name_locked_at) redirect('/cpns/dashboard/event')

    if (row.user_id !== user.id) {
        const authorization = await authorizationService.getAuthorizationForUser(user.id)
        if (!authorization?.permissions.includes('admin.access')) notFound()
    }

    const downloadUrl = `/api/certificates/${encodeURIComponent(row.certificate_number)}/download`

    return (
        <div className="space-y-6 font-handwriting">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="inline-flex items-center gap-2 border-2 border-gray-900 bg-emerald-100 px-3 py-1 text-xs font-black uppercase text-emerald-700 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        <ShieldCheck size={14} /> Preview Sertifikat
                    </p>
                    <h1 className="mt-3 text-3xl font-black text-gray-900">Cek Nama Sebelum Download</h1>
                    <p className="mt-1 text-sm font-medium text-gray-600">Kalau ada kesalahan nama, hubungi admin untuk koreksi sebelum memakai file PDF.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Link href="/cpns/dashboard/event" className="border-2 border-gray-900 bg-white px-4 py-2 text-sm font-black text-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        Kembali
                    </Link>
                    <a href={downloadUrl} className="inline-flex items-center gap-2 border-2 border-gray-900 bg-emerald-600 px-4 py-2 text-sm font-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        <Download size={16} /> Download PDF
                    </a>
                </div>
            </div>

            <section className="mx-auto max-w-5xl">
                <EventCertificatePreview
                    certificateNumber={row.certificate_number}
                />
            </section>
        </div>
    )
}
