#!/usr/bin/env node
/**
 * Gate paritas skema: STAGING vs PRODUKSI.
 *
 * KENAPA GATE INI ADA
 *   Pada 2026-09-18 ditemukan produksi kehilangan 7 fungsi dan 2 tabel,
 *   sementara `supabase_migrations.schema_migrations` di produksi menyatakan
 *   migrasi pembuatnya sudah `applied`. Tidak ada satu pun migration di repo
 *   yang menjatuhkan objek-objek itu.
 *
 *   Akibatnya nyata: halaman `/tka/[level]/focus` gagal dimuat di produksi
 *   karena `get_tka_smp_learning_hierarchy()` tidak ada.
 *
 *   Pelajarannya: **`supabase db push` TIDAK dapat dipercaya sebagai jaminan
 *   bahwa skema remote sesuai repo.** Ledger migrasi bisa berbohong. Satu-satunya
 *   cara tahu adalah membandingkan objeknya langsung.
 *
 *   Skrip ini melakukan tepat itu, dan gagal keras bila ada selisih di luar
 *   daftar putih.
 *
 * PEMAKAIAN
 *   node scripts/db-parity-check.mjs
 *   node scripts/db-parity-check.mjs --verbose
 *
 *   Env opsional:
 *     STAGING_PROJECT_REF   (default: lpgrivowdcepcxradavu)
 *     PRODUCTION_PROJECT_REF (default: llnttutwhtvxtdktiizo)
 *
 * EXIT CODE
 *   0  skema setara (selisih hanya yang ada di daftar putih)
 *   1  ada selisih TIDAK terduga, atau snapshot gagal diambil
 *
 * CATATAN OPERASIONAL
 *   Supabase CLI hanya menautkan SATU project pada satu waktu, jadi skrip ini
 *   menautkan ulang sebelum tiap snapshot. Link dikembalikan ke staging di
 *   akhir (termasuk saat gagal), sesuai konvensi di docs/STATUS.md.
 *
 *   Skrip ini READ-ONLY. Ia tidak pernah menulis ke database mana pun.
 */
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const STAGING_REF = process.env.STAGING_PROJECT_REF || 'lpgrivowdcepcxradavu'
const PRODUCTION_REF = process.env.PRODUCTION_PROJECT_REF || 'llnttutwhtvxtdktiizo'
const VERBOSE = process.argv.includes('--verbose')

/**
 * PAGAR KESELAMATAN PRODUKSI.
 *
 * Skrip ini menautkan CLI ke project PRODUKSI untuk mengambil snapshot. Repo ini
 * secara sadar menjaga agar hal-hal yang menyentuh produksi tidak pernah terjadi
 * diam-diam (lihat guard `production` di scripts/local-gates/run-gate.mjs dan
 * catatan "migration ke produksi wajib GO eksplisit" di docs/STATUS.md).
 *
 * Karena itu jalur produksi di sini HARUS diminta secara eksplisit. Tanpa flag
 * ini skrip berhenti sebelum menyentuh apa pun, sehingga tidak mungkin ada
 * perintah rutin yang tanpa sengaja membandingkan ke produksi.
 *
 * Operasinya sendiri READ-ONLY: hanya SELECT katalog dan `supabase link`.
 */
if (process.env.DB_PARITY_ALLOW_PRODUCTION !== '1') {
  console.error(
    '[parity] Berhenti: skrip ini membandingkan dengan PRODUKSI.\n' +
      '[parity] Jalankan dengan pagar eksplisit:\n' +
      '[parity]\n' +
      '[parity]   DB_PARITY_ALLOW_PRODUCTION=1 node scripts/db-parity-check.mjs\n' +
      '[parity]\n' +
      '[parity] Operasinya read-only (hanya SELECT katalog) dan link CLI\n' +
      '[parity] dikembalikan ke staging di akhir.',
  )
  process.exit(1)
}

/** Skema yang menjadi tanggung jawab runtime aplikasi dan WAJIB setara. */
const RUNTIME_SCHEMAS = ['public', 'app_private']

/**
 * Daftar putih selisih yang DISENGAJA.
 *
 * Setiap entri wajib punya alasan. Menambah entri di sini berarti "selisih ini
 * kita terima" — jadi harus keputusan sadar, bukan cara membungkam gate.
 */
const INTENTIONAL_DIFFERENCES = [
  {
    kind: 'table',
    schema: 'app_private',
    name: 'cpns_skd_p1_import_stage',
    side: 'staging',
    reason:
      'Artefak cutover khusus staging. Tidak punya migration pembuat di repo dan ' +
      'disebut di scripts/production_cutover_extract_staging_runtime_schema.sql.',
  },
]

/**
 * Jalur kontrol negatif: `DB_PARITY_DISABLE_WHITELIST=1` mengosongkan daftar
 * putih sehingga gate WAJIB melaporkan selisih yang diketahui.
 *
 * Ini ada supaya klaim "gate ini benar-benar bisa gagal" dapat dibuktikan tanpa
 * menyabotase database mana pun. Verifikasi:
 *
 *   DB_PARITY_DISABLE_WHITELIST=1 node scripts/db-parity-check.mjs
 *   # harus exit 1 dan menyebut app_private.cpns_skd_p1_import_stage
 */
if (process.env.DB_PARITY_DISABLE_WHITELIST === '1') {
  INTENTIONAL_DIFFERENCES.length = 0
}

const SCHEMA_DIR = resolve(process.cwd(), 'supabase')

function run(command, args) {
  return spawnSync(command, args, {
    cwd: SCHEMA_DIR,
    encoding: 'utf8',
    env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: '1', DO_NOT_TRACK: '1' },
  })
}

function link(ref) {
  const result = run('supabase', ['link', '--project-ref', ref])
  if (result.status !== 0) {
    throw new Error(`Gagal menautkan ${ref}: ${(result.stderr || result.stdout || '').trim()}`)
  }
}

/**
 * Menjalankan satu query read-only dan mengembalikan barisnya.
 *
 * `supabase db query --output-format json` mengembalikan array objek. Kunci
 * kolom ditentukan oleh alias di SQL, jadi setiap snapshot memakai alias yang
 * sama agar dapat dibandingkan langsung.
 */
function query(sql) {
  const result = run('supabase', ['db', 'query', '--linked', '--output-format', 'json', sql])
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || '').trim().split('\n').slice(0, 4).join('\n')
    throw new Error(`Query gagal:\n${detail}`)
  }
  let parsed
  try {
    parsed = JSON.parse(result.stdout)
  } catch {
    throw new Error(`Output bukan JSON:\n${result.stdout.slice(0, 400)}`)
  }
  if (!Array.isArray(parsed)) throw new Error('Output JSON bukan array')
  return parsed
}

/** Ambil snapshot katalog untuk skema runtime. */
function snapshotRuntimeSchema() {
  const schemas = RUNTIME_SCHEMAS.map((s) => `'${s}'`).join(',')

  const functions = query(`
        select
            n.nspname                                as schema,
            p.proname                                as name,
            pg_get_function_identity_arguments(p.oid) as args,
            p.prosecdef::text                        as security_definer,
            coalesce(array_to_string(p.proconfig, ','), '') as config,
            coalesce((
                select string_agg(g.grantee, ',' order by g.grantee)
                from information_schema.role_routine_grants g
                where g.routine_schema = n.nspname and g.routine_name = p.proname
            ), '')                                   as acl
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname in (${schemas})
        order by 1, 2, 3
    `)

  const tables = query(`
        select
            c.table_schema as schema,
            c.table_name   as name,
            c.table_type   as type,
            coalesce((
                select string_agg(
                    col.column_name || ':' || col.data_type || ':' || col.is_nullable,
                    '|' order by col.ordinal_position
                )
                from information_schema.columns col
                where col.table_schema = c.table_schema and col.table_name = c.table_name
            ), '')         as columns
        from information_schema.tables c
        where c.table_schema in (${schemas})
        order by 1, 2
    `)

  const policies = query(`
        select
            schemaname as schema,
            tablename  as table_name,
            policyname as name,
            cmd        as command,
            coalesce(qual, '')            as using_expression,
            coalesce(with_check, '')      as check_expression,
            coalesce(array_to_string(roles, ','), '') as roles
        from pg_policies
        where schemaname in (${schemas})
        order by 1, 2, 3
    `)

  const indexes = query(`
        select
            schemaname as schema,
            tablename  as table_name,
            indexname  as name,
            indexdef   as definition
        from pg_indexes
        where schemaname in (${schemas})
        order by 1, 2, 3
    `)

  const triggers = query(`
        select
            event_object_schema as schema,
            event_object_table  as table_name,
            trigger_name        as name,
            event_manipulation  as event,
            action_timing       as timing
        from information_schema.triggers
        where event_object_schema in (${schemas})
        order by 1, 2, 3, 4
    `)

  const ledger = query(`
        select version from supabase_migrations.schema_migrations order by version
    `).map((row) => row.version)

  return { functions, tables, policies, indexes, triggers, ledger }
}

/** Nama tunggal per jenis, untuk pesan yang enak dibaca. */
const SINGULAR = {
  functions: 'function',
  tables: 'table',
  policies: 'policy',
  indexes: 'index',
  triggers: 'trigger',
}

/** Kunci identitas baris — dipakai untuk membandingkan kedua sisi. */
function keyOf(kind, row) {
  switch (kind) {
    case 'functions':
      return `${row.schema}.${row.name}(${row.args})`
    case 'tables':
      return `${row.schema}.${row.name}`
    case 'policies':
      return `${row.schema}.${row.table_name}.${row.name}`
    case 'indexes':
      return `${row.schema}.${row.name}`
    case 'triggers':
      return `${row.schema}.${row.table_name}.${row.name}.${row.event}`
    default:
      return JSON.stringify(row)
  }
}

/** Bandingkan dua snapshot; kembalikan daftar selisih yang sudah diklasifikasi. */
function compare(staging, production) {
  const differences = []

  for (const kind of ['functions', 'tables', 'policies', 'indexes', 'triggers']) {
    const left = new Map(staging[kind].map((row) => [keyOf(kind, row), row]))
    const right = new Map(production[kind].map((row) => [keyOf(kind, row), row]))

    for (const [key, row] of left) {
      if (!right.has(key)) {
        differences.push({
          kind: SINGULAR[kind],
          key,
          side: 'staging',
          detail: 'hanya ada di staging',
          row,
        })
      } else if (JSON.stringify(row) !== JSON.stringify(right.get(key))) {
        differences.push({
          kind: SINGULAR[kind],
          key,
          side: 'keduanya',
          detail: 'definisi berbeda',
          staging: row,
          production: right.get(key),
        })
      }
    }
    for (const [key, row] of right) {
      if (!left.has(key)) {
        differences.push({
          kind: SINGULAR[kind],
          key,
          side: 'produksi',
          detail: 'hanya ada di produksi',
          row,
        })
      }
    }
  }

  // Ledger dibandingkan sebagai himpunan, bukan urutan.
  const ledgerStaging = new Set(staging.ledger)
  const ledgerProduction = new Set(production.ledger)
  for (const version of ledgerStaging) {
    if (!ledgerProduction.has(version)) {
      differences.push({
        kind: 'migration_ledger',
        key: version,
        side: 'staging',
        detail: 'tercatat hanya di staging',
      })
    }
  }
  for (const version of ledgerProduction) {
    if (!ledgerStaging.has(version)) {
      differences.push({
        kind: 'migration_ledger',
        key: version,
        side: 'produksi',
        detail: 'tercatat hanya di produksi',
      })
    }
  }

  return differences
}

/**
 * Apakah selisih ini tercakup daftar putih?
 *
 * Pencocokan bersifat BERANTAI: bila sebuah tabel di daftar putih, maka index dan
 * trigger milik tabel itu ikut diterima. Ini disengaja — sebuah tabel tidak
 * mungkin ada tanpa primary key, jadi mewajibkan pendaftaran index-nya satu per
 * satu hanya menambah kebisingan tanpa menambah keamanan. Yang penting adalah
 * KEPUTUSAN tentang tabelnya tercatat beserta alasannya.
 *
 * Objek milik tabel yang tidak ada di daftar putih TIDAK ikut diterima.
 */
function whitelisted(difference) {
  // Selisih definisi tidak pernah diterima daftar putih: objeknya ada di kedua
  // sisi, jadi bentuknya memang seharusnya sama.
  if (difference.side === 'keduanya') return null

  const exact = INTENTIONAL_DIFFERENCES.find(
    (entry) =>
      entry.kind === difference.kind &&
      entry.side === difference.side &&
      difference.key === (entry.schema ? `${entry.schema}.${entry.name}` : entry.name),
  )
  if (exact) return exact

  // Index/trigger milik tabel yang di-daftar-putih.
  if (difference.kind === 'index' || difference.kind === 'trigger') {
    const table = INTENTIONAL_DIFFERENCES.find(
      (entry) =>
        entry.kind === 'table' &&
        entry.side === difference.side &&
        difference.key.startsWith(`${entry.schema}.${entry.name}`),
    )
    if (table) return { ...table, reason: `${table.reason} (objek turunan dari tabel tersebut)` }
  }

  return null
}

function main() {
  console.log('[parity] membandingkan skema runtime staging vs produksi')
  console.log(`[parity] staging  = ${STAGING_REF}`)
  console.log(`[parity] produksi = ${PRODUCTION_REF}`)

  let staging
  let production
  try {
    link(STAGING_REF)
    staging = snapshotRuntimeSchema()
    console.log(
      `[parity] staging : ${staging.functions.length} fungsi · ${staging.tables.length} tabel · ${staging.policies.length} policy · ${staging.indexes.length} index · ${staging.ledger.length} migrasi`,
    )

    link(PRODUCTION_REF)
    production = snapshotRuntimeSchema()
    console.log(
      `[parity] produksi: ${production.functions.length} fungsi · ${production.tables.length} tabel · ${production.policies.length} policy · ${production.indexes.length} index · ${production.ledger.length} migrasi`,
    )
  } finally {
    // Selalu kembalikan link ke staging, termasuk saat gagal.
    link(STAGING_REF)
  }

  const differences = compare(staging, production)
  const accepted = []
  const blocking = []
  for (const difference of differences) {
    if (whitelisted(difference)) accepted.push(difference)
    else blocking.push(difference)
  }

  if (accepted.length > 0) {
    console.log(`\n[parity] ${accepted.length} selisih DISENGAJA (daftar putih):`)
    for (const difference of accepted) {
      const entry = whitelisted(difference)
      console.log(`  · [${difference.kind}] ${difference.key} — hanya di ${difference.side}`)
      if (VERBOSE) console.log(`      alasan: ${entry.reason}`)
    }
  }

  if (blocking.length === 0) {
    console.log('\n[parity] ✓ skema setara — tidak ada selisih tak terduga')
    return 0
  }

  console.error(`\n[parity] ✗ ${blocking.length} selisih TIDAK terduga:\n`)
  for (const difference of blocking) {
    console.error(`  · [${difference.kind}] ${difference.key}`)
    console.error(`      ${difference.detail} (sisi: ${difference.side})`)
    if (VERBOSE && difference.staging) {
      console.error(`      staging  : ${JSON.stringify(difference.staging).slice(0, 300)}`)
      console.error(`      produksi : ${JSON.stringify(difference.production).slice(0, 300)}`)
    }
  }
  console.error(
    '\n[parity] Ini berarti repo, staging, dan produksi tidak sinkron.\n' +
      '[parity] JANGAN menganggap `supabase db push` sebagai bukti skema sudah sama —\n' +
      '[parity] ledger migrasi pernah terbukti tidak akurat (lihat\n' +
      '[parity] docs/DB_PARITY_STAGING_PRODUCTION_2026-09-18.md).\n' +
      '[parity] Bila selisih ini memang disengaja, tambahkan ke INTENTIONAL_DIFFERENCES\n' +
      '[parity] beserta alasannya.',
  )
  return 1
}

try {
  process.exit(main())
} catch (error) {
  console.error(`\n[parity] GAGAL: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
}
