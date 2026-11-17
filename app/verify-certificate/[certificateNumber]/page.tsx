import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Award, CheckCircle2 } from 'lucide-react'
import { createV2AdminClient } from '@/lib/utils/supabase/server'
import {
  getCertificateAchievementLabel,
  getCertificateTitle,
  type EventCertificateKind,
} from '@/lib/event-certificates'

export const metadata: Metadata = {
  title: 'Verifikasi Sertifikat',
  // Halaman memuat nama dan peringkat peserta; dapat dibuka lewat tautan
  // sertifikat, tetapi tidak untuk diindeks mesin pencari.
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

type CertificateVerifyRow = {
  user_id: string
  event_id: string
  certificate_number: string
  certificate_name: string
  certificate_kind: EventCertificateKind
  rank: number | null
  score: number | null
  issued_at: string
  name_locked_at: string | null
}

function formatDate(value: string | null | undefined) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(value))
}

export default async function VerifyCertificatePage({
  params,
}: {
  params: Promise<{ certificateNumber: string }>
}) {
  const { certificateNumber } = await params
  const admin = await createV2AdminClient()
  const { data, error } = await admin
    .from('certificates')
    .select(
      'user_id, event_id, certificate_number, certificate_name, certificate_kind, rank, score, issued_at, name_locked_at',
    )
    .eq('certificate_number', certificateNumber)
    .maybeSingle()

  if (error || !data) notFound()

  const certificate = data as unknown as CertificateVerifyRow
  if (!certificate.name_locked_at) notFound()

  const [{ data: event }, { data: attempt }] = await Promise.all([
    admin.from('events').select('title, starts_at').eq('id', certificate.event_id).maybeSingle(),
    admin
      .from('exam_attempts')
      .select('passed')
      .eq('user_id', certificate.user_id)
      .contains('metadata', { eventId: certificate.event_id })
      .in('status', ['completed', 'COMPLETED'])
      .order('submitted_at', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle(),
  ])
  const achievementLabel = getCertificateAchievementLabel({
    kind: certificate.certificate_kind,
    rank: certificate.rank,
    score: certificate.score,
    isPassed: Boolean(attempt?.passed),
  })

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-gray-900">
      <section className="mx-auto max-w-2xl border-2 border-gray-900 bg-white p-6 st-shadow-md sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center border-2 border-green-700 bg-green-100">
            <CheckCircle2 className="h-7 w-7 text-green-700" />
          </div>
          <div>
            <p className="text-xs font-black uppercase text-green-700">Sertifikat Valid</p>
            <h1 className="text-2xl font-black text-gray-900">Verifikasi Sertifikat</h1>
          </div>
        </div>

        <div className="space-y-4">
          <div className="border-2 border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-black uppercase text-gray-500">Nama</p>
            <p className="mt-1 text-2xl font-black">{certificate.certificate_name}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="border-2 border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-black uppercase text-gray-500">Jenis</p>
              <p className="mt-1 font-black">{getCertificateTitle(certificate.certificate_kind)}</p>
            </div>
            <div className="border-2 border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-black uppercase text-gray-500">Peringkat / Skor</p>
              <p className="mt-1 font-black">{achievementLabel}</p>
            </div>
          </div>
          <div className="border-2 border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-black uppercase text-gray-500">Event</p>
            <p className="mt-1 font-black">
              {typeof event?.title === 'string' ? event.title : 'Tryout Akbar Siap Tempur'}
            </p>
            <p className="mt-1 text-sm font-bold text-gray-500">
              {formatDate(typeof event?.starts_at === 'string' ? event.starts_at : null)}
            </p>
          </div>
          <div className="border-2 border-gray-900 bg-yellow-100 p-4">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-700" />
              <p className="text-xs font-black uppercase text-gray-700">Nomor Sertifikat</p>
            </div>
            <p className="mt-2 break-all font-mono text-sm font-black">
              {certificate.certificate_number}
            </p>
            <p className="mt-2 text-xs font-bold text-gray-600">
              Diterbitkan {formatDate(certificate.issued_at)}
            </p>
          </div>
        </div>

        <Link
          href="/"
          className="mt-6 inline-flex border-2 border-gray-900 bg-gray-900 px-4 py-2 text-sm font-black uppercase text-white"
        >
          Kembali
        </Link>
      </section>
    </main>
  )
}
