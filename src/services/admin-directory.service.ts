import { createClient } from '@/lib/utils/supabase/server'
import type { ProgramTrackContext } from '@/src/services/catalog-context.service'

/**
 * Modul admin: direktori pengguna, peran, laporan, dan jejak audit.
 *
 * Semuanya lewat RPC (`20260919120000_admin_users_reports_audit.sql`) karena
 * `user_roles`, `roles`, `permissions`, dan `audit_logs` mengaktifkan RLS TANPA
 * policy — `authenticated` tidak bisa membacanya langsung sama sekali.
 *
 * Service ini TIDAK memeriksa permission sendiri: setiap RPC sudah menolak
 * pemanggil yang tidak berhak, dan galat itu diteruskan apa adanya. Pemeriksaan
 * izin tambahan di UI hanya untuk menyembunyikan aksi, bukan sebagai pengaman.
 */

export type AdminUserRow = {
    id: string
    full_name: string
    display_name: string | null
    email: string | null
    status: string
    roles: string[]
    attempt_count: number
    onboarding_completed: boolean
    created_at: string | null
    last_sign_in_at: string | null
}

export type AdminRoleRow = {
    code: string
    name: string
    description: string | null
    permissions: string[]
    holder_count: number
}

export type AdminAuditRow = {
    id: number
    action: string
    entity_type: string
    entity_id: string | null
    actor_user_id: string | null
    actor_name: string | null
    created_at: string | null
    old_data: unknown
    new_data: unknown
}

export type AdminUserFilters = {
    search?: string | null
    role?: string | null
    status?: string | null
    limit?: number
    offset?: number
}

export type AdminAuditFilters = {
    action?: string | null
    entityType?: string | null
    actorId?: string | null
    limit?: number
    offset?: number
}

export type ReportSection = Record<string, number>

export type AdminReportOverview = {
    context: { program: string; track: string; resolved: boolean }
    users: ReportSection
    attempts: ReportSection
    certificates: ReportSection
    events: ReportSection
    orders: ReportSection
    content: ReportSection
}

function asObject(value: unknown): Record<string, unknown> {
    if (!value || Array.isArray(value) || typeof value !== 'object') return {}
    return value as Record<string, unknown>
}

function asArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : []
}

function asString(value: unknown): string {
    return value == null ? '' : String(value)
}

function asNumber(value: unknown): number {
    const parsed = Number(value ?? 0)
    return Number.isFinite(parsed) ? parsed : 0
}

function asNullableString(value: unknown): string | null {
    const text = asString(value)
    return text || null
}

/** Angka laporan: hanya terima nilai numerik, jangan biarkan string bocor ke UI. */
function asReportSection(value: unknown): ReportSection {
    const source = asObject(value)
    const result: ReportSection = {}
    for (const [key, raw] of Object.entries(source)) result[key] = asNumber(raw)
    return result
}

function toUser(row: unknown): AdminUserRow {
    const source = asObject(row)
    return {
        id: asString(source.id),
        full_name: asString(source.full_name) || asString(source.display_name) || 'Tanpa nama',
        display_name: asNullableString(source.display_name),
        email: asNullableString(source.email),
        status: asString(source.status) || 'active',
        roles: asArray(source.roles).map(asString).filter(Boolean),
        attempt_count: asNumber(source.attempt_count),
        onboarding_completed: source.onboarding_completed === true,
        created_at: asNullableString(source.created_at),
        last_sign_in_at: asNullableString(source.last_sign_in_at),
    }
}

function toRole(row: unknown): AdminRoleRow {
    const source = asObject(row)
    return {
        code: asString(source.code),
        name: asString(source.name) || asString(source.code),
        description: asNullableString(source.description),
        permissions: asArray(source.permissions).map(asString).filter(Boolean),
        holder_count: asNumber(source.holder_count),
    }
}

function toAuditRow(row: unknown): AdminAuditRow {
    const source = asObject(row)
    return {
        id: asNumber(source.id),
        action: asString(source.action),
        entity_type: asString(source.entity_type),
        entity_id: asNullableString(source.entity_id),
        actor_user_id: asNullableString(source.actor_user_id),
        actor_name: asNullableString(source.actor_name),
        created_at: asNullableString(source.created_at),
        old_data: source.old_data ?? null,
        new_data: source.new_data ?? null,
    }
}

export class AdminDirectoryService {
    /** Daftar pengguna. Butuh `user.read` atau `user.manage`. */
    async listUsers(filters: AdminUserFilters = {}) {
        const client = await createClient()
        const { data, error } = await client.rpc('admin_list_users', {
            p_search: filters.search || null,
            p_role: filters.role || null,
            p_status: filters.status || null,
            p_limit: filters.limit ?? 50,
            p_offset: filters.offset ?? 0,
        })
        if (error) throw new Error(error.message)
        const payload = asObject(data)
        return {
            users: asArray(payload.users).map(toUser),
            total: asNumber(payload.total),
        }
    }

    /** Daftar peran + permission + jumlah pemegang. */
    async listRoles(): Promise<AdminRoleRow[]> {
        const client = await createClient()
        const { data, error } = await client.rpc('admin_list_roles', {})
        if (error) throw new Error(error.message)
        return asArray(asObject(data).roles).map(toRole)
    }

    /** Ringkasan laporan. Butuh `report.read`. */
    async getReportOverview(context: ProgramTrackContext): Promise<AdminReportOverview> {
        const client = await createClient()
        const { data, error } = await client.rpc('admin_report_overview', {
            p_program_code: context.programCode,
            p_track_code: context.trackCode,
        })
        if (error) throw new Error(error.message)
        const payload = asObject(data)
        const resolved = asObject(payload.context)
        return {
            context: {
                program: asString(resolved.program) || context.programCode,
                track: asString(resolved.track) || context.trackCode,
                resolved: resolved.resolved === true,
            },
            users: asReportSection(payload.users),
            attempts: asReportSection(payload.attempts),
            certificates: asReportSection(payload.certificates),
            events: asReportSection(payload.events),
            orders: asReportSection(payload.orders),
            content: asReportSection(payload.content),
        }
    }

    /** Jejak audit. Butuh `audit.read`. */
    async listAuditLogs(filters: AdminAuditFilters = {}) {
        const client = await createClient()
        const { data, error } = await client.rpc('admin_list_audit_logs', {
            p_action: filters.action || null,
            p_entity_type: filters.entityType || null,
            p_actor_id: filters.actorId || null,
            p_limit: filters.limit ?? 50,
            p_offset: filters.offset ?? 0,
        })
        if (error) throw new Error(error.message)
        const payload = asObject(data)
        return {
            logs: asArray(payload.logs).map(toAuditRow),
            total: asNumber(payload.total),
        }
    }

    /** Nilai filter audit (action & entity type) supaya UI tidak menebak. */
    async getAuditFacets() {
        const client = await createClient()
        const { data, error } = await client.rpc('admin_audit_facets', {})
        if (error) throw new Error(error.message)
        const payload = asObject(data)
        return {
            actions: asArray(payload.actions).map(asString).filter(Boolean),
            entityTypes: asArray(payload.entity_types).map(asString).filter(Boolean),
        }
    }
}

export const adminDirectoryService = new AdminDirectoryService()

/** Label status akun yang bisa dibaca manusia. */
export const USER_STATUS_LABELS: Record<string, string> = {
    active: 'Aktif',
    inactive: 'Nonaktif',
    suspended: 'Ditangguhkan',
}

/** Label kode peran; jatuh ke kode aslinya bila belum dikenal. */
export const ROLE_LABELS: Record<string, string> = {
    SUPER_ADMIN: 'Super Admin',
    ADMIN: 'Admin',
    CONTENT_EDITOR: 'Editor Konten',
    CONTENT_REVIEWER: 'Reviewer Konten',
    FINANCE: 'Keuangan',
    SUPPORT: 'Dukungan',
    SCHOOL_ADMIN: 'Admin Sekolah',
}

export function roleLabel(code: string) {
    return ROLE_LABELS[code] || code
}

export function userStatusLabel(status: string) {
    return USER_STATUS_LABELS[status] || status
}
