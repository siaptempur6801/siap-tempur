-- Audit 2026-11-17: satu-satunya tabel public tanpa RLS di staging dan production.
-- `review_batches` sudah tidak bisa diakses anon/authenticated (REVOKE ALL di
-- 20260919100000), dan tidak ada fungsi yang memakainya. RLS tanpa policy menambah
-- lapisan pertahanan: pemilik tabel (postgres) dan service_role tetap dapat membaca.
ALTER TABLE IF EXISTS public.review_batches ENABLE ROW LEVEL SECURITY;
