import { logger } from '@/lib/logger'
import { PERMISSIONS } from '@/src/auth/permissions'
import { authorizationService } from '@/src/services/authorization.service'
import { organizationExportService } from '@/src/services/organization-export.service'
import { NextResponse } from 'next/server'

/**
 * Unduhan XLSX hasil instansi (PRD §6.6).
 *
 * ## Kenapa route handler, bukan server action
 *
 * Server action mengembalikan nilai ke React, bukan berkas ke browser. Unduhan
 * memerlukan respons HTTP dengan `Content-Disposition`, dan itu hanya bisa
 * dihasilkan route handler.
 *
 * ## Otorisasi
 *
 * Diperiksa DI SINI juga, bukan hanya di halaman. Route handler adalah endpoint
 * tersendiri: siapa pun yang tahu URL-nya bisa memanggilnya tanpa pernah membuka
 * halaman instansi. RPC-nya memang tetap menolak tanpa permission, tetapi
 * menolak lebih awal berarti tidak ada data yang sempat dibaca.
 */
export async function GET(request: Request) {
    const authorization = await authorizationService.getCurrentAuthorization()
    if (!authorization || !authorization.permissions.includes(PERMISSIONS.ORGANIZATION_MANAGE)) {
        return NextResponse.json({ error: 'Akses tidak tersedia.' }, { status: 403 })
    }

    const url = new URL(request.url)
    const organizationId = url.searchParams.get('org') ?? ''
    const batchId = url.searchParams.get('batch')

    if (!organizationId) {
        return NextResponse.json({ error: 'Instansi wajib dipilih.' }, { status: 400 })
    }

    try {
        const data = await organizationExportService.getExport(organizationId, batchId)
        const workbook = organizationExportService.buildWorkbook(data)
        const fileName = organizationExportService.fileName(data)

        logger.info('[export-organization] XLSX dibuat', {
            organizationId,
            batchId: batchId ?? null,
            detailRows: data.detail.rows.length,
        })

        return new NextResponse(workbook as unknown as BodyInit, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="${fileName}"`,
                'Content-Length': String(workbook.byteLength),
                'Cache-Control': 'no-store',
            },
        })
    } catch (error) {
        logger.warn('[export-organization] gagal', {
            error: error instanceof Error ? error.message : String(error),
            organizationId,
        })
        return NextResponse.json({ error: 'Export gagal dibuat.' }, { status: 400 })
    }
}
