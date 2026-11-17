import { NextResponse } from 'next/server'
import { createEventCertificatePdf } from '@/lib/event-certificate-pdf'
import { logger } from '@/lib/logger'
import { getAuthorizedCertificateRenderData } from '../certificate-render-data'

export const runtime = 'nodejs'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ certificateNumber: string }> },
) {
  const { certificateNumber } = await params
  const result = await getAuthorizedCertificateRenderData(certificateNumber)
  if ('response' in result) return result.response

  if (!result.row.name_locked_at) {
    return NextResponse.json({ error: 'Nama sertifikat belum dikunci' }, { status: 409 })
  }

  let pdfBytes: Uint8Array
  try {
    pdfBytes = await createEventCertificatePdf(result.input)
  } catch (error) {
    logger.error('Certificate PDF render failed', error, {
      certificateNumber: result.row.certificate_number,
    })
    return NextResponse.json({ error: 'Gagal membuat file sertifikat' }, { status: 500 })
  }

  const bucket = result.admin.storage.from('event-certificates')
  const upload = await bucket.upload(result.storagePath, pdfBytes, {
    contentType: 'application/pdf',
    upsert: true,
  })

  if (upload.error) {
    logger.error('Certificate PDF upload failed', upload.error, {
      certificateNumber: result.row.certificate_number,
      storagePath: result.storagePath,
    })
    return NextResponse.json({ error: 'Gagal menyiapkan file sertifikat' }, { status: 500 })
  }

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${result.row.certificate_number}.pdf"`,
      'Cache-Control': 'private, max-age=300',
    },
  })
}
