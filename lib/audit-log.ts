import { createAdminClient } from '@/lib/utils/supabase/server'
import { logger } from '@/lib/logger'
import { headers } from 'next/headers'
import { getIp } from '@/lib/api-utils'

/**
 * Menulis satu peristiwa audit admin ke `audit_logs`.
 *
 * Nama kolom di sini HARUS mengikuti skema nyata `public.audit_logs` (Schema V2,
 * lihat `scripts/cutover/bootstrap/01_tables_a_f.sql`):
 *   id, actor_user_id, action, entity_type, entity_id,
 *   old_data, new_data, ip_address, user_agent, created_at
 *
 * Sebelumnya fungsi ini memakai `actor_id`, `target_type`, `target_id`, dan
 * `details` — empat nama kolom yang TIDAK ADA di tabel tersebut. Akibatnya
 * setiap insert gagal dengan `42703`, dan karena kegagalannya hanya dicatat
 * sebagai `logger.warn`, seluruh audit trail admin hilang tanpa ada yang tahu.
 * Jangan mengubah nama kolom di sini tanpa memeriksa skema terlebih dahulu.
 *
 * `entity_id` bertipe `uuid`, jadi hanya id berbentuk UUID yang boleh dikirim;
 * nilai lain ditolak PostgREST dan — karena audit tidak boleh menggagalkan aksi
 * yang sudah berhasil — kegagalannya hanya tercatat di log server. Gunakan
 * `auditEntityId` untuk menormalkannya.
 */
export async function logAuditEvent(params: {
  action: string
  actor_id: string
  target_type: string
  target_id?: string | null
  /** Keadaan sebelum perubahan; hanya diisi bila benar-benar informatif. */
  before?: Record<string, unknown> | null
  /** Keadaan sesudah perubahan / konteks tindakan. */
  after?: Record<string, unknown> | null
  /** Bentuk lama: dipetakan ke `after` supaya pemanggil lama tetap jalan. */
  details?: Record<string, unknown>
}) {
  try {
    const headerStore = await headers()
    const req = new Request('https://dummy.com', { headers: headerStore })
    const ipAddress = getIp(req)

    const admin = await createAdminClient()
    const { error } = await admin.from('audit_logs').insert({
      action: params.action,
      actor_user_id: params.actor_id,
      entity_type: params.target_type,
      entity_id: auditEntityId(params.target_id),
      old_data: params.before ?? null,
      new_data: params.after ?? params.details ?? null,
      ip_address: ipAddress,
      user_agent: headerStore.get('user-agent'),
    })

    if (error) {
      // Dicatat sebagai error, bukan warn: kegagalan audit adalah masalah
      // keamanan/kepatuhan, bukan gangguan kosmetik. Sebelumnya kegagalan
      // ini tidak terlihat sama sekali.
      logger.error('Gagal menulis audit log', error, {
        action: params.action,
        actorId: params.actor_id,
      })
      return { success: false as const, error: error.message }
    }
    return { success: true as const }
  } catch (e) {
    logger.error('Gagal menyusun audit log', e, { action: params.action })
    return { success: false as const, error: e instanceof Error ? e.message : String(e) }
  }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Menormalkan nilai menjadi `uuid` atau `null`.
 *
 * `audit_logs.entity_id` bertipe `uuid` sedangkan beberapa aksi memakai kode
 * yang mudah dibaca (mis. kode voucher) sebagai identitas. Mengirim kode itu apa
 * adanya membuat insert gagal dan peristiwanya hilang; kode tetap tercatat di
 * `new_data` sehingga tidak ada informasi yang benar-benar hilang.
 */
export function auditEntityId(value: string | null | undefined): string | null {
  const candidate = (value ?? '').trim()
  return UUID_PATTERN.test(candidate) ? candidate : null
}

/**
 * Membuang field yang tidak boleh masuk jejak audit.
 *
 * Jejak audit dibaca manusia (dan bisa diekspor), jadi kolom rahasia tidak
 * pernah ditulis — sekalipun pemanggilnya tidak sengaja memasukkannya.
 */
const REDACTED_KEYS = [
  'password',
  'token',
  'secret',
  'invite_token',
  'access_token',
  'refresh_token',
]

export function redactAuditPayload(
  payload: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!payload) return null
  const safe: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(payload)) {
    safe[key] = REDACTED_KEYS.some((secret) => key.toLowerCase().includes(secret))
      ? '[disunting]'
      : value
  }
  return safe
}

/**
 * Mencatat satu tindakan admin yang mengubah data.
 *
 * Dipanggil SESUDAH aksi berhasil, dan sengaja tidak pernah melempar: aksi yang
 * sudah mengubah database tidak boleh dilaporkan gagal hanya karena jejaknya
 * gagal ditulis. Kegagalan tetap terlihat di log server sebagai `logger.error`.
 *
 * `label` adalah nama yang dikenali admin (judul event, nama produk, kode
 * voucher). Ia masuk `new_data.label` supaya `/admin/settings/audit` bisa menampilkan
 * "apa" yang disentuh, bukan hanya UUID yang tidak berarti bagi pembaca.
 */
export async function auditAdminAction(params: {
  action: string
  actorId: string
  entityType: string
  entityId?: string | null
  label?: string | null
  before?: Record<string, unknown> | null
  after?: Record<string, unknown> | null
}) {
  const after = redactAuditPayload(params.after) ?? {}
  const label = (params.label ?? '').trim()
  return logAuditEvent({
    action: params.action,
    actor_id: params.actorId,
    target_type: params.entityType,
    target_id: params.entityId ?? null,
    before: redactAuditPayload(params.before),
    after: label ? { ...after, label } : after,
  })
}
