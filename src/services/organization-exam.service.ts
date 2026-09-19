import { createClient } from '@/lib/utils/supabase/server'

/**
 * MVP CPNS Instansi Managed Service — template ujian, komposisi exam, assignment.
 *
 * Sumber: `docs/notes/prd-cpns-instansi-managed-service.md` §7.3, §7.4.
 *
 * Semuanya lewat RPC. Yang perlu diperhatikan: `compose` TIDAK melempar galat
 * ketika soal terbit belum cukup — ia mengembalikan `composed: false` beserta
 * daftar kekurangan per subjek, supaya halaman dapat menampilkannya sebagai
 * daftar kerja alih-alih pesan buntu.
 */

// Kontrak bersama tinggal di `lib/organization-exam.ts` (modul murni) karena
// dipakai juga oleh client component; mengimpornya dari sini akan menyeret modul
// server ke bundle browser dan menggagalkan build.
export type {
    AssignmentRow,
    OrgTemplate,
    TemplateShortage,
} from '@/lib/organization-exam'
export {
    EXPLANATION_LABELS,
    RANKING_LABELS,
    TEMPLATE_STATUS_LABELS,
    durationMinutes,
    explanationLabel,
    rankingLabel,
    templateComposition,
    templateStatusLabel,
} from '@/lib/organization-exam'

import type { AssignmentRow, OrgTemplate, TemplateShortage } from '@/lib/organization-exam'

/** Ketersediaan soal terbit per subjek + seluruh template yang terlihat. */
export type TemplateAvailability = {
    available: Record<string, number>
    templates: OrgTemplate[]
}

/** Hasil komposisi: berhasil, atau daftar kekurangan yang harus dilengkapi. */
export type ComposeResult =
    | { composed: true; examId: string; slug: string; title: string; totalQuestions: number }
    | { composed: false; shortages: TemplateShortage[] }

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

function bool(value: unknown): boolean {
    return value === true
}

function toTemplate(row: unknown): OrgTemplate {
    const source = asObject(row)
    return {
        id: str(source.id),
        organization_id: nullableStr(source.organization_id),
        name: str(source.name),
        twk_count: num(source.twk_count),
        tiu_count: num(source.tiu_count),
        tkp_count: num(source.tkp_count),
        duration_seconds: num(source.duration_seconds),
        max_attempts: num(source.max_attempts),
        randomize_questions: bool(source.randomize_questions),
        randomize_options: bool(source.randomize_options),
        show_explanation: str(source.show_explanation) || 'after_exam',
        ranking_visibility: str(source.ranking_visibility) || 'internal',
        status: str(source.status) || 'draft',
        created_at: nullableStr(source.created_at),
    }
}

function toAssignment(row: unknown): AssignmentRow {
    const source = asObject(row)
    return {
        id: str(source.id),
        batch_id: nullableStr(source.batch_id),
        exam_id: str(source.exam_id),
        template_id: nullableStr(source.template_id),
        is_active: bool(source.is_active),
        starts_at: nullableStr(source.starts_at),
        due_at: nullableStr(source.due_at),
        notes: nullableStr(source.notes),
        exam_title: nullableStr(source.exam_title),
        exam_status: nullableStr(source.exam_status),
        question_count: num(source.question_count),
        attempt_count: num(source.attempt_count),
    }
}

export class OrganizationExamService {
    /** Template + ketersediaan soal terbit per subjek. Butuh `organization.manage`. */
    async listTemplates(organizationId?: string | null): Promise<TemplateAvailability> {
        const client = await createClient()
        const { data, error } = await client.rpc('admin_list_org_templates', {
            p_organization_id: organizationId || null,
        })
        if (error) throw new Error(error.message)
        const payload = asObject(data)
        const available = asObject(payload.available)
        return {
            available: {
                TWK: num(available.TWK),
                TIU: num(available.TIU),
                TKP: num(available.TKP),
            },
            templates: asArray(payload.templates).map(toTemplate),
        }
    }

    /** Kekurangan soal untuk sebuah template. */
    async getShortages(templateId: string): Promise<{ composable: boolean; shortages: TemplateShortage[] }> {
        const client = await createClient()
        const { data, error } = await client.rpc('admin_template_shortages', { p_template_id: templateId })
        if (error) throw new Error(error.message)
        const payload = asObject(data)
        return {
            composable: payload.composable === true,
            shortages: asArray(payload.shortages).map((row): TemplateShortage => {
                const item = asObject(row)
                return {
                    subject: str(item.subject),
                    required: num(item.required),
                    available: num(item.available),
                    missing: num(item.missing),
                }
            }),
        }
    }

    /**
     * Wujudkan template menjadi exam.
     *
     * Mengembalikan kekurangan sebagai DATA, bukan galat, ketika soal belum
     * cukup — lihat catatan di kepala berkas.
     */
    async compose(templateId: string, title: string, status: 'draft' | 'active'): Promise<ComposeResult> {
        const client = await createClient()
        const { data, error } = await client.rpc('admin_compose_exam_from_template', {
            p_template_id: templateId,
            p_title: title || null,
            p_status: status,
        })
        if (error) throw new Error(error.message)
        const payload = asObject(data)

        if (payload.composed !== true) {
            return {
                composed: false,
                shortages: asArray(payload.shortages).map((row): TemplateShortage => {
                    const item = asObject(row)
                    return {
                        subject: str(item.subject),
                        required: num(item.required),
                        available: num(item.available),
                        missing: num(item.missing),
                    }
                }),
            }
        }

        return {
            composed: true,
            examId: str(payload.exam_id),
            slug: str(payload.slug),
            title: str(payload.title),
            totalQuestions: num(payload.total_questions),
        }
    }

    /** Assignment sebuah batch. */
    async listAssignments(batchId: string): Promise<AssignmentRow[]> {
        const client = await createClient()
        const { data, error } = await client.rpc('admin_list_assignments', { p_batch_id: batchId })
        if (error) throw new Error(error.message)
        return asArray(asObject(data).assignments).map(toAssignment)
    }
}

export const organizationExamService = new OrganizationExamService()
