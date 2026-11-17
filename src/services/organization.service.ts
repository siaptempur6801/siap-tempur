import { createClient } from '@/lib/utils/supabase/server'

/**
 * MVP CPNS Instansi Managed Service — akses data instansi & batch.
 *
 * Sumber: `docs/notes/prd-cpns-instansi-managed-service.md` §6.1, §6.2, §6.3.
 *
 * Semuanya lewat RPC karena `authenticated` hanya memegang SELECT pada tabel
 * instansi (disaring RLS); penulisan lewat fungsi SECURITY DEFINER yang
 * memeriksa `organization.manage`.
 *
 * Service ini tidak memeriksa permission sendiri — RPC yang menolak, dan
 * galatnya diteruskan apa adanya. Pemeriksaan izin di UI hanya untuk
 * menyembunyikan aksi.
 */

type OrganizationRow = {
  id: string
  type: string
  name: string
  code: string
  address: string | null
  city: string | null
  province: string | null
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  status: string
  notes: string | null
  created_at: string | null
  updated_at: string | null
  batch_count: number
  active_batch_count: number
  participant_count: number
  member_count: number
}

type BatchRow = {
  id: string
  code: string
  name: string
  invite_token: string
  starts_at: string | null
  ends_at: string | null
  status: string
  notes: string | null
  created_at: string | null
  participant_count: number
  linked_count: number
}

type ParticipantRow = {
  id: string
  organization_id: string
  batch_id: string
  user_id: string | null
  participant_code: string
  full_name_snapshot: string
  email_snapshot: string | null
  phone_snapshot: string | null
  nik: string | null
  unit: string | null
  jabatan: string | null
  status: string
  registered_at: string | null
  notes: string | null
  batch_code: string
  batch_name: string
  organization_code: string
  organization_name: string
}

type OrganizationDetail = {
  organization: OrganizationRow
  batches: BatchRow[]
}

type OrganizationFilters = {
  search?: string | null
  status?: string | null
  limit?: number
  offset?: number
}

type ParticipantFilters = {
  organizationId?: string | null
  batchId?: string | null
  search?: string | null
  status?: string | null
  limit?: number
  offset?: number
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

function toOrganization(row: unknown): OrganizationRow {
  const source = asObject(row)
  return {
    id: str(source.id),
    type: str(source.type) || 'instansi',
    name: str(source.name),
    code: str(source.code),
    address: nullableStr(source.address),
    city: nullableStr(source.city),
    province: nullableStr(source.province),
    contact_name: nullableStr(source.contact_name),
    contact_email: nullableStr(source.contact_email),
    contact_phone: nullableStr(source.contact_phone),
    status: str(source.status) || 'active',
    notes: nullableStr(source.notes),
    created_at: nullableStr(source.created_at),
    updated_at: nullableStr(source.updated_at),
    batch_count: num(source.batch_count),
    active_batch_count: num(source.active_batch_count),
    participant_count: num(source.participant_count),
    member_count: num(source.member_count),
  }
}

function toBatch(row: unknown): BatchRow {
  const source = asObject(row)
  return {
    id: str(source.id),
    code: str(source.code),
    name: str(source.name),
    invite_token: str(source.invite_token),
    starts_at: nullableStr(source.starts_at),
    ends_at: nullableStr(source.ends_at),
    status: str(source.status) || 'draft',
    notes: nullableStr(source.notes),
    created_at: nullableStr(source.created_at),
    participant_count: num(source.participant_count),
    linked_count: num(source.linked_count),
  }
}

function toParticipant(row: unknown): ParticipantRow {
  const source = asObject(row)
  return {
    id: str(source.id),
    organization_id: str(source.organization_id),
    batch_id: str(source.batch_id),
    user_id: nullableStr(source.user_id),
    participant_code: str(source.participant_code),
    full_name_snapshot: str(source.full_name_snapshot),
    email_snapshot: nullableStr(source.email_snapshot),
    phone_snapshot: nullableStr(source.phone_snapshot),
    nik: nullableStr(source.nik),
    unit: nullableStr(source.unit),
    jabatan: nullableStr(source.jabatan),
    status: str(source.status) || 'registered',
    registered_at: nullableStr(source.registered_at),
    notes: nullableStr(source.notes),
    batch_code: str(source.batch_code),
    batch_name: str(source.batch_name),
    organization_code: str(source.organization_code),
    organization_name: str(source.organization_name),
  }
}

class OrganizationService {
  /** Daftar instansi. Butuh `organization.manage`. */
  async listOrganizations(filters: OrganizationFilters = {}) {
    const client = await createClient()
    const { data, error } = await client.rpc('admin_list_organizations', {
      p_search: filters.search || null,
      p_status: filters.status || null,
      p_limit: filters.limit ?? 50,
      p_offset: filters.offset ?? 0,
    })
    if (error) throw new Error(error.message)
    const payload = asObject(data)
    return {
      organizations: asArray(payload.organizations).map(toOrganization),
      total: num(payload.total),
    }
  }

  /** Detail satu instansi beserta batch-nya. */
  async getOrganization(id: string): Promise<OrganizationDetail | null> {
    const client = await createClient()
    const { data, error } = await client.rpc('admin_get_organization', { p_id: id })
    if (error) {
      // Instansi tidak ditemukan bukan kesalahan server; kembalikan null
      // supaya halaman dapat menampilkan empty state yang jujur.
      if (error.message.includes('Organization not found')) return null
      throw new Error(error.message)
    }
    const payload = asObject(data)
    const organization = asObject(payload.organization)
    if (!organization.id) return null
    return {
      organization: toOrganization(organization),
      batches: asArray(payload.batches).map(toBatch),
    }
  }

  /** Daftar peserta, dapat disaring per instansi maupun batch. */
  async listParticipants(filters: ParticipantFilters = {}) {
    const client = await createClient()
    const { data, error } = await client.rpc('admin_list_participants', {
      p_organization_id: filters.organizationId || null,
      p_batch_id: filters.batchId || null,
      p_search: filters.search || null,
      p_status: filters.status || null,
      p_limit: filters.limit ?? 100,
      p_offset: filters.offset ?? 0,
    })
    if (error) throw new Error(error.message)
    const payload = asObject(data)
    return {
      participants: asArray(payload.participants).map(toParticipant),
      total: num(payload.total),
    }
  }
}

export const organizationService = new OrganizationService()

const ORGANIZATION_STATUS_LABELS: Record<string, string> = {
  active: 'Aktif',
  inactive: 'Nonaktif',
}

const ORGANIZATION_TYPE_LABELS: Record<string, string> = {
  instansi: 'Instansi',
  sekolah: 'Sekolah',
  komunitas: 'Komunitas',
  lainnya: 'Lainnya',
}

const BATCH_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  active: 'Aktif',
  closed: 'Ditutup',
  archived: 'Diarsipkan',
}

const PARTICIPANT_STATUS_LABELS: Record<string, string> = {
  registered: 'Terdaftar',
  active: 'Aktif',
  completed: 'Selesai',
  withdrawn: 'Mengundurkan diri',
}

export function organizationStatusLabel(status: string) {
  return ORGANIZATION_STATUS_LABELS[status] || status
}

export function organizationTypeLabel(type: string) {
  return ORGANIZATION_TYPE_LABELS[type] || type
}

export function batchStatusLabel(status: string) {
  return BATCH_STATUS_LABELS[status] || status
}

export function participantStatusLabel(status: string) {
  return PARTICIPANT_STATUS_LABELS[status] || status
}

/**
 * Tautan self-onboarding peserta (PRD §10A.2).
 *
 * PRD menyarankan `/cpns/join/[token]`; rute itu dibuat pada Fase 3. Fungsi ini
 * ada di sini supaya bentuk tautannya ditentukan di SATU tempat — admin hanya
 * menyalinnya, dan halaman join memakai bentuk yang sama.
 */
export function batchInviteUrl(inviteToken: string, baseUrl?: string) {
  const path = `/cpns/join/${inviteToken}`
  return baseUrl ? `${baseUrl.replace(/\/$/, '')}${path}` : path
}

/* ------------------------------------------------------------------ self-onboarding */

type BatchInvite = {
  found: boolean
  joinable: boolean
  /** Alasan bila tidak bisa bergabung; dipakai halaman untuk menjelaskan. */
  reason: string | null
  alreadyJoined: boolean
  batch: {
    id: string
    code: string
    name: string
    status: string
    starts_at: string | null
    ends_at: string | null
  } | null
  organization: {
    id: string
    name: string
    code: string
    city: string | null
    province: string | null
    status: string
  } | null
}

type JoinResult = {
  joined: boolean
  alreadyJoined: boolean
  claimed: boolean
  participantCode: string
  batchId: string
  organizationId: string
}

type Membership = {
  participant_id: string
  participant_code: string
  status: string
  batch_id: string
  batch_code: string
  batch_name: string
  batch_status: string
  starts_at: string | null
  ends_at: string | null
  organization_id: string
  organization_name: string
  organization_code: string
}

/** Alasan yang bisa dibaca manusia untuk `BatchInvite.reason`. */
const INVITE_REASON_LABELS: Record<string, string> = {
  already_joined: 'Anda sudah terdaftar di batch ini.',
  batch_closed: 'Batch ini sudah ditutup dan tidak menerima peserta baru.',
  organization_inactive: 'Instansi ini sedang nonaktif.',
}

class OrganizationInviteService {
  /** Pratinjau batch dari token undangan. Butuh login. */
  async getInvite(token: string): Promise<BatchInvite> {
    const client = await createClient()
    const { data, error } = await client.rpc('get_batch_invite', { p_token: token })
    if (error) throw new Error(error.message)
    const payload = asObject(data)
    const batch = asObject(payload.batch)
    const organization = asObject(payload.organization)
    const found = payload.found === true
    return {
      found,
      joinable: payload.joinable === true,
      reason: nullableStr(payload.reason),
      alreadyJoined: payload.already_joined === true,
      batch:
        found && batch.id
          ? {
              id: str(batch.id),
              code: str(batch.code),
              name: str(batch.name),
              status: str(batch.status),
              starts_at: nullableStr(batch.starts_at),
              ends_at: nullableStr(batch.ends_at),
            }
          : null,
      organization:
        found && organization.id
          ? {
              id: str(organization.id),
              name: str(organization.name),
              code: str(organization.code),
              city: nullableStr(organization.city),
              province: nullableStr(organization.province),
              status: str(organization.status),
            }
          : null,
    }
  }

  /** Bergabung ke batch. Selalu atas nama pemanggil; user_id tidak dari klien. */
  async join(
    token: string,
    profile: { fullName?: string; phone?: string; unit?: string; jabatan?: string } = {},
  ): Promise<JoinResult> {
    const client = await createClient()
    const { data, error } = await client.rpc('join_batch_with_invite', {
      p_token: token,
      p_full_name: profile.fullName || null,
      p_phone: profile.phone || null,
      p_unit: profile.unit || null,
      p_jabatan: profile.jabatan || null,
    })
    if (error) throw new Error(error.message)
    const payload = asObject(data)
    return {
      joined: payload.joined === true,
      alreadyJoined: payload.already_joined === true,
      claimed: payload.claimed === true,
      participantCode: str(payload.participant_code),
      batchId: str(payload.batch_id),
      organizationId: str(payload.organization_id),
    }
  }

  /** Keanggotaan instansi milik pemanggil, untuk dashboard peserta (PRD §10A.3). */
  async listMyMemberships(): Promise<Membership[]> {
    const client = await createClient()
    const { data, error } = await client.rpc('get_my_organization_memberships', {})
    if (error) throw new Error(error.message)
    return asArray(asObject(data).memberships).map((row): Membership => {
      const item = asObject(row)
      return {
        participant_id: str(item.participant_id),
        participant_code: str(item.participant_code),
        status: str(item.status),
        batch_id: str(item.batch_id),
        batch_code: str(item.batch_code),
        batch_name: str(item.batch_name),
        batch_status: str(item.batch_status),
        starts_at: nullableStr(item.starts_at),
        ends_at: nullableStr(item.ends_at),
        organization_id: str(item.organization_id),
        organization_name: str(item.organization_name),
        organization_code: str(item.organization_code),
      }
    })
  }
}

export const organizationInviteService = new OrganizationInviteService()

export function inviteReasonLabel(reason: string | null) {
  if (!reason) return ''
  return INVITE_REASON_LABELS[reason] || reason
}

/* ---------------------------------------------------------------- bulk import */

// Kontrak import tinggal di `lib/participant-import.ts` (modul murni) karena
// dipakai bersama client component; mengimpornya dari sini akan menyeret modul
// server ke bundle browser dan menggagalkan build.

class ParticipantImportService {
  /**
   * Validasi (dan bila `dryRun` false, sekaligus simpan) baris import.
   *
   * Satu RPC untuk preview dan commit: validasinya ada di SATU jalur kode,
   * sehingga hasil preview tidak mungkin berbeda dari hasil commit.
   */
  async import(
    batchId: string,
    rows: import('@/lib/participant-import').ImportRow[],
    dryRun: boolean,
  ): Promise<import('@/lib/participant-import').ImportPreview> {
    const client = await createClient()
    const { data, error } = await client.rpc('admin_import_participants', {
      p_batch_id: batchId,
      p_rows: rows as never,
      p_dry_run: dryRun,
    })
    if (error) throw new Error(error.message)
    const payload = asObject(data)
    return {
      dryRun: payload.dry_run === true,
      total: num(payload.total),
      ok: num(payload.ok),
      duplicate: num(payload.duplicate),
      error: num(payload.error),
      imported: num(payload.imported),
      rows: asArray(payload.rows).map(
        (row): import('@/lib/participant-import').ImportPreview['rows'][number] => {
          const item = asObject(row)
          const status = str(item.status)
          return {
            line: num(item.line),
            status: status === 'ok' || status === 'duplicate' ? status : 'error',
            participant_code: str(item.participant_code),
            full_name: str(item.full_name),
            email: str(item.email),
            phone: str(item.phone),
            errors: asArray(item.errors).map(str).filter(Boolean),
          }
        },
      ),
    }
  }
}

export const participantImportService = new ParticipantImportService()
