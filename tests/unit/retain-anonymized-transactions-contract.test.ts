import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const repoRoot = resolve(__dirname, '../..')
const migration = readFileSync(
  resolve(
    repoRoot,
    'supabase/migrations/20261117100000_retain_anonymized_transactions_on_account_delete.sql',
  ),
  'utf8',
).replace(/^\s*--.*$/gm, '')

function functionBody() {
  const start = migration.indexOf('FUNCTION app_private.anonymize_commerce_before_profile_delete')
  const end = migration.indexOf('$function$;', start)
  return migration.slice(start, end)
}

describe('N-19 — transaksi disimpan dan dianonimkan saat akun dihapus', () => {
  it.each([
    ['orders', 'user_id', 'fk_orders_user_id_profiles'],
    ['refunds', 'requested_by', 'fk_refunds_requested_by_profiles'],
  ])('public.%s.%s menjadi nullable dengan ON DELETE SET NULL', (table, column, fk) => {
    expect(migration).toContain(
      `ALTER TABLE public.${table}\n  ALTER COLUMN ${column} DROP NOT NULL;`,
    )
    expect(migration).toMatch(
      new RegExp(
        `ADD CONSTRAINT ${fk} FOREIGN KEY \\(${column}\\) REFERENCES public\\.profiles \\(id\\) ON DELETE SET NULL;`,
      ),
    )
    expect(migration).not.toMatch(new RegExp(`${fk}[^;]*ON DELETE CASCADE`))
  })

  it('FK lama dihapus berdasarkan katalog, bukan nama tebakan', () => {
    expect(migration).toMatch(/FROM\s+pg_constraint c/)
    expect(migration).toContain("c.confrelid = 'public.profiles'::regclass")
    expect(migration.indexOf('DROP CONSTRAINT')).toBeLessThan(
      migration.indexOf('ADD CONSTRAINT fk_orders_user_id_profiles'),
    )
  })

  it('trigger BEFORE DELETE pada profiles menjalankan anonimisasi', () => {
    expect(migration).toMatch(
      /CREATE TRIGGER anonymize_commerce_before_profile_delete\s+BEFORE DELETE ON public\.profiles\s+FOR EACH ROW\s+EXECUTE FUNCTION app_private\.anonymize_commerce_before_profile_delete \(\);/,
    )
  })

  it('fungsi trigger SECURITY DEFINER dengan search_path kosong dan tidak bisa dipanggil klien', () => {
    const body = functionBody()
    expect(body).toMatch(/SECURITY DEFINER\s+SET search_path TO ''/)
    expect(migration).toMatch(
      /REVOKE ALL ON FUNCTION app_private\.anonymize_commerce_before_profile_delete \(\) FROM PUBLIC, anon, authenticated;/,
    )
  })

  it('membuang data pelanggan/kartu dan membatalkan transaksi pending', () => {
    const body = functionBody()
    for (const key of ['customer_details', 'masked_card', 'card_token', 'email', 'phone'])
      expect(body).toContain(`'${key}'`)
    expect(body).toContain('payload = e.payload - v_pii_keys')
    expect(body).toContain('raw_response = p.raw_response - v_pii_keys')
    expect(body).toMatch(/WHEN lower\(p\.status\) = 'pending' THEN\s+'cancel'/)
    expect(body).toMatch(/WHEN lower\(o\.status\) = 'pending' THEN\s+'cancelled'/)
    expect(body).toContain('anonymized_at = now()')
    expect(body).toContain('RETURN OLD;')
  })

  it('admin menampilkan transaksi tanpa pemilik sebagai "Akun dihapus"', () => {
    const service = readFileSync(
      resolve(repoRoot, 'src/services/admin-commerce-workspace.service.ts'),
      'utf8',
    )
    expect(service).toContain("export const DELETED_ACCOUNT_LABEL = 'Akun dihapus'")
    expect(service).toContain('user_id: string | null')
    expect(service).not.toContain('orders.map((o) => String(o.user_id))')
  })
})
