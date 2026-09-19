import { createClient } from '@/lib/utils/supabase/server'
import { buildXlsx, xlsxFileName, type XlsxSheet } from '@/lib/xlsx'

/**
 * Monitoring dan export instansi (PRD §6.5, §6.6, §7.6, §7.7).
 *
 * Seluruh penyaringan data dilakukan di DATABASE, bukan di sini: setiap query
 * memfilter `source = 'organization'` dan `organization_id`. Itu bukan
 * kenyamanan melainkan syarat — §11 menetapkan KPI "0 data B2C tercampur ke
 * export instansi" dan "0 data antar instansi tercampur".
 */

export type MonitoringSummary = {
    total: number
    linked: number
    notStarted: number
    inProgress: number
    completed: number
    passed: number
    withdrawn: number
}

export type MonitoringParticipant = {
    participantId: string
    participantCode: string
    fullName: string
    email: string | null
    phone: string | null
    unit: string | null
    participantStatus: string
    linked: boolean
    attemptStatus: string | null
    startedAt: string | null
    submittedAt: string | null
    durationSeconds: number | null
    twkScore: number
    tiuScore: number
    tkpScore: number
    totalScore: number | null
    percentage: number | null
    passed: boolean | null
    internalRank: number | null
}

export type Monitoring = {
    batch: { id: string; code: string; name: string; status: string }
    summary: MonitoringSummary
    participants: MonitoringParticipant[]
}

export type ExportSheet = { columns: string[]; rows: Array<Array<string | number | boolean | null>> }

export type OrganizationExport = {
    organization: { id: string; code: string; name: string }
    generatedAt: string | null
    rekap: ExportSheet
    detail: ExportSheet
    noShow: ExportSheet
    ranking: ExportSheet
}

function asObject(value: unknown): Record<string, unknown> {
    if (!value || Array.isArray(value) || typeof value !== 'object') return {}
    return value as Record<string, unknown>
}

function asArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : []
}

function str(value: unknown): string {
    return value == null ? '' : String(value)
}

function nullableStr(value: unknown): string | null {
    const text = str(value)
    return text || null
}

function num(value: unknown): number {
    const parsed = Number(value ?? 0)
    return Number.isFinite(parsed) ? parsed : 0
}

function nullableNum(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
}

function toSheet(value: unknown): ExportSheet {
    const source = asObject(value)
    return {
        columns: asArray(source.columns).map(str),
        rows: asArray(source.rows).map((row) => asArray(row).map((cell) => {
            if (cell === null || cell === undefined) return null
            if (typeof cell === 'number' || typeof cell === 'boolean') return cell
            return str(cell)
        })),
    }
}

export class OrganizationExportService {
    /** Progres peserta satu batch. Butuh `organization.manage`. */
    async getMonitoring(batchId: string): Promise<Monitoring> {
        const client = await createClient()
        const { data, error } = await client.rpc('admin_batch_monitoring', { p_batch_id: batchId })
        if (error) throw new Error(error.message)
        const payload = asObject(data)
        const batch = asObject(payload.batch)
        const summary = asObject(payload.summary)

        return {
            batch: {
                id: str(batch.id),
                code: str(batch.code),
                name: str(batch.name),
                status: str(batch.status),
            },
            summary: {
                total: num(summary.total),
                linked: num(summary.linked),
                notStarted: num(summary.not_started),
                inProgress: num(summary.in_progress),
                completed: num(summary.completed),
                passed: num(summary.passed),
                withdrawn: num(summary.withdrawn),
            },
            participants: asArray(payload.participants).map((row): MonitoringParticipant => {
                const item = asObject(row)
                return {
                    participantId: str(item.participant_id),
                    participantCode: str(item.participant_code),
                    fullName: str(item.full_name),
                    email: nullableStr(item.email),
                    phone: nullableStr(item.phone),
                    unit: nullableStr(item.unit),
                    participantStatus: str(item.participant_status),
                    linked: item.linked === true,
                    attemptStatus: nullableStr(item.attempt_status),
                    startedAt: nullableStr(item.started_at),
                    submittedAt: nullableStr(item.submitted_at),
                    durationSeconds: nullableNum(item.duration_seconds),
                    twkScore: num(item.twk_score),
                    tiuScore: num(item.tiu_score),
                    tkpScore: num(item.tkp_score),
                    totalScore: nullableNum(item.total_score),
                    percentage: nullableNum(item.percentage),
                    passed: typeof item.passed === 'boolean' ? item.passed : null,
                    internalRank: nullableNum(item.internal_rank),
                }
            }),
        }
    }

    /** Empat kumpulan data export untuk satu instansi (opsional satu batch). */
    async getExport(organizationId: string, batchId?: string | null): Promise<OrganizationExport> {
        const client = await createClient()
        const { data, error } = await client.rpc('admin_export_organization', {
            p_organization_id: organizationId,
            p_batch_id: batchId || null,
        })
        if (error) throw new Error(error.message)
        const payload = asObject(data)
        const organization = asObject(payload.organization)

        return {
            organization: {
                id: str(organization.id),
                code: str(organization.code),
                name: str(organization.name),
            },
            generatedAt: nullableStr(payload.generated_at),
            rekap: toSheet(payload.rekap),
            detail: toSheet(payload.detail),
            noShow: toSheet(payload.no_show),
            ranking: toSheet(payload.ranking),
        }
    }

    /**
     * Susun workbook XLSX berisi empat sheet (PRD §6.6).
     *
     * Urutannya mengikuti alur kerja admin: ringkasan dulu, lalu rincian, lalu
     * alat tindak lanjut (ranking dan no-show).
     */
    buildWorkbook(data: OrganizationExport): Uint8Array {
        const sheets: XlsxSheet[] = [
            { name: 'Rekap', columns: data.rekap.columns, rows: data.rekap.rows },
            { name: 'Detail Peserta', columns: data.detail.columns, rows: data.detail.rows },
            { name: 'Ranking Internal', columns: data.ranking.columns, rows: data.ranking.rows },
            { name: 'No-show', columns: data.noShow.columns, rows: data.noShow.rows },
        ]
        return buildXlsx(sheets)
    }

    fileName(data: OrganizationExport) {
        return xlsxFileName(`nilai-instansi-${data.organization.code}`)
    }
}

export const organizationExportService = new OrganizationExportService()

export const ATTEMPT_STATUS_LABELS: Record<string, string> = {
    in_progress: 'Sedang mengerjakan',
    completed: 'Selesai',
}

export function attemptStatusLabel(status: string | null) {
    if (!status) return 'Belum mulai'
    return ATTEMPT_STATUS_LABELS[status] || status
}

export function formatDuration(seconds: number | null) {
    if (seconds === null || seconds <= 0) return '—'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) return `${hours}j ${minutes}m`
    return `${minutes}m`
}
