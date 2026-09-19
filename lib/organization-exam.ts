/**
 * Kontrak template ujian & assignment yang dipakai BERSAMA server dan browser.
 *
 * ## Kenapa modul terpisah
 *
 * `BatchExamPanel` adalah client component, sedangkan `organization-exam.service`
 * mengimpor `lib/utils/supabase/server.ts` yang server-only. Ketika panel itu
 * mengimpor tipe DAN konstanta dari service, bundler ikut menarik modul server ke
 * bundle browser dan build gagal dengan:
 *
 *     ./lib/utils/supabase/server.ts [Client Component Browser]
 *
 * TypeScript tidak menangkapnya karena tipe dihapus saat kompilasi — yang
 * tersisa adalah `import` nilai, dan itulah yang menyeret seluruh rantai server.
 *
 * Kesalahan yang sama pernah terjadi pada panel import peserta (Fase 4). Karena
 * itu kontrak bersama SELALU diletakkan di modul murni seperti ini.
 */

export type TemplateShortage = {
    subject: string
    required: number
    available: number
    missing: number
}

export type OrgTemplate = {
    id: string
    organization_id: string | null
    name: string
    twk_count: number
    tiu_count: number
    tkp_count: number
    duration_seconds: number
    max_attempts: number
    randomize_questions: boolean
    randomize_options: boolean
    show_explanation: string
    ranking_visibility: string
    status: string
    created_at: string | null
}

export type AssignmentRow = {
    id: string
    batch_id: string | null
    exam_id: string
    template_id: string | null
    is_active: boolean
    starts_at: string | null
    due_at: string | null
    notes: string | null
    exam_title: string | null
    exam_status: string | null
    question_count: number
    attempt_count: number
}

export const TEMPLATE_STATUS_LABELS: Record<string, string> = {
    draft: 'Draft',
    active: 'Aktif',
    archived: 'Diarsipkan',
}

export const EXPLANATION_LABELS: Record<string, string> = {
    never: 'Tidak ditampilkan',
    after_exam: 'Setelah ujian selesai',
    after_close: 'Setelah periode ditutup',
}

export const RANKING_LABELS: Record<string, string> = {
    hidden: 'Disembunyikan',
    internal: 'Ranking internal instansi',
    public: 'Publik',
}

export function templateStatusLabel(status: string) {
    return TEMPLATE_STATUS_LABELS[status] || status
}

export function explanationLabel(value: string) {
    return EXPLANATION_LABELS[value] || value
}

export function rankingLabel(value: string) {
    return RANKING_LABELS[value] || value
}

/** "30 TWK + 35 TIU + 45 TKP = 110 soal" */
export function templateComposition(template: Pick<OrgTemplate, 'twk_count' | 'tiu_count' | 'tkp_count'>) {
    const parts: string[] = []
    if (template.twk_count > 0) parts.push(`${template.twk_count} TWK`)
    if (template.tiu_count > 0) parts.push(`${template.tiu_count} TIU`)
    if (template.tkp_count > 0) parts.push(`${template.tkp_count} TKP`)
    const total = template.twk_count + template.tiu_count + template.tkp_count
    return `${parts.join(' + ')} = ${total} soal`
}

/** Durasi dalam menit, untuk tampilan. */
export function durationMinutes(seconds: number) {
    return Math.round(seconds / 60)
}

/** Kekurangan soal untuk satu template terhadap ketersediaan saat ini. */
export function templateShortages(
    template: Pick<OrgTemplate, 'twk_count' | 'tiu_count' | 'tkp_count'>,
    available: Record<string, number>,
): Array<{ subject: string; required: number; available: number; missing: number }> {
    return [
        { subject: 'TWK', required: template.twk_count, available: available.TWK ?? 0 },
        { subject: 'TIU', required: template.tiu_count, available: available.TIU ?? 0 },
        { subject: 'TKP', required: template.tkp_count, available: available.TKP ?? 0 },
    ]
        .filter((row) => row.available < row.required)
        .map((row) => ({ ...row, missing: row.required - row.available }))
}
