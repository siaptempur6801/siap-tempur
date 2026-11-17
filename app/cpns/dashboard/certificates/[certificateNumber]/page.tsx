import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Download, ShieldCheck } from 'lucide-react'
import { createV2AdminClient, createV2Client } from '@/lib/utils/supabase/server'
import { EventCertificatePreview } from '@/components/certificates/EventCertificatePreview'
import { authorizationService } from '@/src/services/authorization.service'
import PageHeader from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'

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
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user)
    redirect(`/login?next=/cpns/dashboard/certificates/${encodeURIComponent(certificateNumber)}`)

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
    <div
      data-experience-mode="learning"
      data-program="cpns"
      className="st-product space-y-6 font-body"
    >
      <PageHeader
        eyebrow={
          <>
            <ShieldCheck size={14} aria-hidden="true" /> Preview sertifikat
          </>
        }
        title="Periksa sertifikat sebelum mengunduh"
        description="Kalau ada kesalahan nama, hubungi admin untuk koreksi sebelum memakai file PDF."
        aside={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/cpns/dashboard/event">Kembali ke event</Link>
            </Button>
            <Button asChild variant="success">
              <a href={downloadUrl}>
                <Download size={16} aria-hidden="true" /> Unduh PDF
              </a>
            </Button>
          </div>
        }
      />

      <section
        className="st-card-md mx-auto w-full max-w-5xl p-3 sm:p-5"
        aria-label="Pratinjau sertifikat"
      >
        <EventCertificatePreview certificateNumber={row.certificate_number} />
      </section>
    </div>
  )
}
