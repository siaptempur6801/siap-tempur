import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Award, CheckCircle2 } from 'lucide-react'
import { createAdminClient } from '@/lib/utils/supabase/server'
import { getCertificateAchievementLabel, getCertificateTitle, type EventCertificateKind } from '@/lib/event-certificates'
import { PASSING_GRADES } from '@/lib/constants'

export const dynamic = 'force-dynamic'

type CertificateVerifyRow = {
    certificate_number: string
    certificate_name: string
    certificate_kind: EventCertificateKind
    rank: number | null
    score: number | null
    generated_at: string | null
    name_locked_at: string | null
    tryout_events: {
        title: string
        starts_at: string
    } | Array<{
        title: string
        starts_at: string
    }> | null
}

type CertificateScoreSessionRow = {
    test_sessions: {
        is_passed: boolean | null
        score_twk: number | null
        score_tiu: number | null
        score_tkp: number | null
    } | Array<{
        is_passed: boolean | null
        score_twk: number | null
        score_tiu: number | null
        score_tkp: number | null
    }> | null
}

function firstRelated<T>(value: T | T[] | null | undefined): T | null {
    if (Array.isArray(value)) return value[0] || null
    return value || null
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

async function getCertificatePassingStatus(
    admin: Awaited<ReturnType<typeof createAdminClient>>,
    certificateNumber: string
) {
    const { data: certificate } = await admin
        .from('event_certificates')
        .select('event_id, user_id')
        .eq('certificate_number', certificateNumber)
        .maybeSingle()

    if (!certificate) return false

    const { data } = await admin
        .from('tryout_event_sessions')
        .select('test_sessions(is_passed, score_twk, score_tiu, score_tkp)')
        .eq('event_id', certificate.event_id)
        .eq('user_id', certificate.user_id)
        .eq('status', 'completed')
        .maybeSingle()

    const row = data as CertificateScoreSessionRow | null
    const testSession = firstRelated(row?.test_sessions)
    if (!testSession) return false

    return Boolean(testSession.is_passed) || (
        Number(testSession.score_twk || 0) >= PASSING_GRADES.TWK &&
        Number(testSession.score_tiu || 0) >= PASSING_GRADES.TIU &&
        Number(testSession.score_tkp || 0) >= PASSING_GRADES.TKP
    )
}

export default async function VerifyCertificatePage({
    params,
}: {
    params: Promise<{ certificateNumber: string }>
}) {
    const { certificateNumber } = await params
    const admin = await createAdminClient()
    const { data, error } = await admin
        .from('event_certificates')
        .select('certificate_number, certificate_name, certificate_kind, rank, score, generated_at, name_locked_at, tryout_events(title, starts_at)')
        .eq('certificate_number', certificateNumber)
        .maybeSingle()

    if (error || !data) notFound()

    const certificate = data as CertificateVerifyRow
    if (!certificate.name_locked_at) notFound()

    const event = firstRelated(certificate.tryout_events)
    const isPassed = await getCertificatePassingStatus(admin, certificateNumber)
    const achievementLabel = getCertificateAchievementLabel({
        kind: certificate.certificate_kind,
        rank: certificate.rank,
        score: certificate.score,
        isPassed,
    })

    return (
        <main className="min-h-screen bg-[#f8fafc] px-4 py-10 text-gray-900">
            <section className="mx-auto max-w-2xl border-2 border-gray-900 bg-white p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] sm:p-8">
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
                        <p className="mt-1 font-black">{event?.title || 'Tryout Akbar Siap Tempur'}</p>
                        <p className="mt-1 text-sm font-bold text-gray-500">{formatDate(event?.starts_at)}</p>
                    </div>
                    <div className="border-2 border-gray-900 bg-yellow-100 p-4">
                        <div className="flex items-center gap-2">
                            <Award className="h-5 w-5 text-yellow-700" />
                            <p className="text-xs font-black uppercase text-gray-700">Nomor Sertifikat</p>
                        </div>
                        <p className="mt-2 break-all font-mono text-sm font-black">{certificate.certificate_number}</p>
                        <p className="mt-2 text-xs font-bold text-gray-600">Diterbitkan {formatDate(certificate.generated_at)}</p>
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
