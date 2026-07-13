import { NextResponse } from 'next/server'
import { createEventCertificateImage } from '@/lib/event-certificate-pdf'
import { logger } from '@/lib/logger'
import { applyUnlockedCertificateNameOverride, getAuthorizedCertificateRenderData } from '../certificate-render-data'

export const runtime = 'nodejs'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ certificateNumber: string }> }
) {
    const { certificateNumber } = await params
    const result = await getAuthorizedCertificateRenderData(certificateNumber)
    if ('response' in result) return result.response

    const url = new URL(request.url)
    const input = applyUnlockedCertificateNameOverride(result.input, result.row, url.searchParams.get('name'))

    try {
        const image = await createEventCertificateImage(input)

        return new NextResponse(image, {
            status: 200,
            headers: {
                'Content-Type': 'image/png',
                'Cache-Control': 'private, no-store, max-age=0',
            },
        })
    } catch (error) {
        logger.error('Certificate preview render failed', error, {
            certificateNumber: result.row.certificate_number,
        })
        return NextResponse.json({ error: 'Gagal membuat preview sertifikat' }, { status: 500 })
    }
}
