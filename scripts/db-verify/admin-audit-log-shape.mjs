/**
 * Memverifikasi bahwa bentuk insert jejak audit benar-benar diterima
 * `public.audit_logs` di database.
 *
 * KENAPA PERLU
 *   `lib/audit-log.ts` pernah memakai empat nama kolom yang tidak ada
 *   (`actor_id`, `target_type`, `target_id`, `details`). Setiap insert gagal
 *   dengan 42703 dan — karena kegagalannya hanya dicatat sebagai warning —
 *   seluruh jejak audit admin hilang tanpa ada yang tahu. Unit test tidak bisa
 *   menangkap kelas kesalahan ini: ia hanya memeriksa kode, bukan skema.
 *
 *   Skrip ini menulis SATU baris dengan bentuk yang persis dipakai
 *   `auditAdminAction`, memeriksa hasilnya, lalu MENGHAPUSNYA kembali.
 *
 * PAKAI
 *   node scripts/db-verify/admin-audit-log-shape.mjs
 *   (membaca NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY dari .env.local)
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

function envFromFile(name) {
  const text = readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
  const line = text.split('\n').find((row) => row.startsWith(`${name}=`))
  if (!line) throw new Error(`${name} tidak ada di .env.local`)
  return line.slice(name.length + 1).trim()
}

const url = envFromFile('NEXT_PUBLIC_SUPABASE_URL')
const serviceRole = envFromFile('SUPABASE_SERVICE_ROLE_KEY')
const admin = createClient(url, serviceRole, { auth: { persistSession: false } })

const marker = `DBVERIFY_${Date.now()}`
const results = []

// Aktor harus profil nyata: `actor_user_id` punya foreign key ke profiles.
const { data: actor, error: actorError } = await admin
  .from('profiles')
  .select('id')
  .limit(1)
  .maybeSingle()
if (actorError) throw actorError
if (!actor) throw new Error('Tidak ada profil untuk dipakai sebagai aktor.')

// `entity_id` harus uuid; pakai id profil itu sendiri sebagai target dummy.
const { data: inserted, error: insertError } = await admin
  .from('audit_logs')
  .insert({
    action: marker,
    actor_user_id: actor.id,
    entity_type: 'db_verify',
    entity_id: actor.id,
    old_data: { before: true },
    new_data: { after: true, label: 'verifikasi bentuk kolom' },
    ip_address: '127.0.0.1',
    user_agent: 'db-verify/admin-audit-log-shape',
  })
  .select('id, action, entity_id, old_data, new_data, ip_address, created_at')
  .single()

results.push([
  'insert dengan bentuk yang dipakai auditAdminAction',
  insertError ? `GAGAL: ${insertError.message}` : 'OK',
])
if (insertError) {
  console.log(results.map(([k, v]) => `${v === 'OK' ? '✅' : '❌'} ${k}: ${v}`).join('\n'))
  process.exit(1)
}

results.push([
  'baris terbaca kembali',
  inserted.action === marker ? 'OK' : `GAGAL: aksi tidak cocok (${inserted.action})`,
])
results.push([
  'entity_id tersimpan sebagai uuid',
  inserted.entity_id === actor.id ? 'OK' : `GAGAL: ${inserted.entity_id}`,
])
results.push([
  'old_data/new_data tersimpan sebagai jsonb',
  inserted.old_data?.before === true && inserted.new_data?.after === true ? 'OK' : 'GAGAL',
])
results.push([
  'ip_address tersimpan sebagai inet',
  String(inserted.ip_address).startsWith('127.0.0.1') ? 'OK' : `GAGAL: ${inserted.ip_address}`,
])

// entity_id non-uuid HARUS ditolak — inilah alasan `auditEntityId` ada.
const { error: badIdError } = await admin.from('audit_logs').insert({
  action: `${marker}_BAD`,
  actor_user_id: actor.id,
  entity_type: 'db_verify',
  entity_id: 'VOUCHER-RAMADAN',
})
results.push([
  'entity_id non-uuid ditolak (alasan auditEntityId ada)',
  badIdError ? 'OK' : 'GAGAL: justru diterima',
])

const { error: deleteError } = await admin.from('audit_logs').delete().like('action', `${marker}%`)
results.push(['baris uji dibersihkan', deleteError ? `GAGAL: ${deleteError.message}` : 'OK'])

// `audit_logs` menolak UPDATE/DELETE dari `authenticated` (policy USING false),
// tetapi service role melewati RLS — itu sebabnya pembersihan di atas berhasil.
const { count } = await admin
  .from('audit_logs')
  .select('id', { count: 'exact', head: true })
  .like('action', `${marker}%`)
results.push([
  'tidak ada sisa baris uji',
  (count ?? 0) === 0 ? 'OK' : `GAGAL: ${count} baris tersisa`,
])

const failed = results.filter(([, value]) => value !== 'OK')
console.log(results.map(([k, v]) => `${v === 'OK' ? '✅' : '❌'} ${k}: ${v}`).join('\n'))
console.log(`\n${results.length - failed.length}/${results.length} pemeriksaan lolos`)
process.exit(failed.length === 0 ? 0 : 1)
