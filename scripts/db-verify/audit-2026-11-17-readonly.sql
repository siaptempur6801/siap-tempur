-- Verifikasi read-only hasil audit 2026-11-17.
-- Jalankan terpisah di staging lalu production (SQL Editor atau
-- `supabase db query --linked --file ...`). Seluruh isi dibungkus transaksi
-- READ ONLY; tidak ada data atau skema yang berubah.
BEGIN TRANSACTION READ ONLY;
-- 1. Kunci jawaban: harus 0 baris.
SELECT
  table_name,
  grantee,
  privilege_type
FROM
  information_schema.role_table_grants
WHERE
  table_schema = 'public'
  AND table_name IN ('attempt_questions', 'attempt_answers', 'attempt_answer_options', 'question_versions', 'question_options', 'question_explanations')
  AND grantee IN ('anon', 'authenticated', 'PUBLIC');
-- 2. RPC khusus server: kolom client_can_execute harus false semua.
SELECT
  p.oid::regprocedure AS fn,
  p.prosecdef AS security_definer,
  has_function_privilege('authenticated', p.oid, 'EXECUTE')
  OR has_function_privilege('anon', p.oid, 'EXECUTE') AS client_can_execute
FROM
  pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE
  n.nspname = 'public'
  AND p.proname IN ('recalculate_leaderboard', 'recalculate_event_rankings', 'fulfill_paid_order', 'update_attempt_answer_scores', 'rebuild_leaderboard');
-- 3. SECURITY DEFINER tanpa search_path terpin: harus 0 baris untuk public/app_private.
SELECT
  n.nspname,
  p.oid::regprocedure AS fn
FROM
  pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE
  p.prosecdef
  AND n.nspname IN ('public', 'app_private')
  AND NOT EXISTS (
    SELECT
      1
    FROM
      unnest(coalesce(p.proconfig, '{}')) AS c
    WHERE
      c LIKE 'search\_path=%')
ORDER BY
  1,
  2;
-- 4. Preflight migration 20261117090000: harus false semua sebelum apply.
SELECT
  t AS table_name,
  has_table_privilege('authenticated', t, 'INSERT')
  OR has_table_privilege('authenticated', t, 'UPDATE')
  OR has_any_column_privilege('authenticated', t, 'INSERT')
  OR has_any_column_privilege('authenticated', t, 'UPDATE') AS authenticated_can_write
FROM
  unnest(ARRAY['public.exam_attempts', 'public.attempt_answers', 'public.event_registrations']) AS t;
-- 5. Policy ranking & tulis: setelah apply, *_read tidak lagi USING (true)
--    dan policy *_insert_own/*_update_own di tiga tabel di atas tidak ada.
SELECT
  tablename,
  policyname,
  cmd,
  qual
FROM
  pg_policies
WHERE
  schemaname = 'public'
  AND tablename IN ('leaderboard_entries', 'event_rankings', 'exam_attempts', 'attempt_answers', 'event_registrations')
ORDER BY
  1,
  2;
-- 5b. Setelah migration 20261117100000: FK pemilik transaksi harus SET NULL
--     (confdeltype = 'n') untuk orders.user_id dan refunds.requested_by; refunds.processed_by
--     (staf) tetap 'r'. Trigger anonimisasi harus ada dan aktif (tgenabled = 'O').
SELECT
  c.conrelid::regclass AS table_name,
  c.conname,
  c.confdeltype
FROM
  pg_constraint c
WHERE
  c.contype = 'f'
  AND c.confrelid = 'public.profiles'::regclass
  AND c.conrelid IN ('public.orders'::regclass, 'public.refunds'::regclass);
SELECT
  tgname,
  tgenabled
FROM
  pg_trigger
WHERE
  tgrelid = 'public.profiles'::regclass
  AND tgname = 'anonymize_commerce_before_profile_delete';
-- 6. Skema yang diekspos Data API: legacy_prod dan app_private tidak boleh ada.
SELECT
  current_setting('pgrst.db_schemas', TRUE) AS exposed_schemas;
-- 7. Tabel public tanpa RLS: harus 0 baris.
SELECT
  c.relname
FROM
  pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE
  n.nspname = 'public'
  AND c.relkind = 'r'
  AND NOT c.relrowsecurity;
ROLLBACK;
