-- Audit 2026-11-17: N-07 (lama P2-1), N-08 (lama P2-4), P3-6.
--
-- 1. Policy tulis milik authenticated pada exam_attempts, attempt_answers, dan
--    event_registrations tidak pernah terpakai: ACL kanonik hanya memberi SELECT,
--    dan seluruh penulisan berjalan lewat RPC SECURITY DEFINER / service role.
--    Policy itu tidak dibatasi kolom, jadi satu GRANT di masa depan akan
--    membuka penulisan total_score/passed/rank. Policy dihapus.
-- 2. leaderboard_entries_read dan event_rankings_read memakai USING (true):
--    setiap pengguna login bisa membaca user_id, skor, dan peringkat seluruh
--    papan. Aplikasi membaca kedua tabel lewat service role atau fungsi
--    SECURITY DEFINER, jadi akses langsung dipersempit ke baris milik sendiri
--    (plus admin.access).
-- 3. Dua tabel impor legacy di app_private belum ber-RLS. Skema ini tidak
--    diekspos ke Data API; RLS diaktifkan sebagai pertahanan berlapis. Pemilik
--    tabel dan service_role tetap melewati RLS.
--
-- Preflight di bawah menggagalkan migration bila ACL live ternyata memberi hak
-- tulis ke authenticated, karena dalam kondisi itu policy tulis TIDAK mati dan
-- penghapusannya mengubah perilaku aplikasi.
DO $$
DECLARE
  v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY['public.exam_attempts', 'public.attempt_answers', 'public.event_registrations'] LOOP
    IF has_table_privilege('authenticated', v_table, 'INSERT') OR has_table_privilege('authenticated', v_table, 'UPDATE') OR has_any_column_privilege('authenticated', v_table, 'INSERT') OR has_any_column_privilege('authenticated', v_table, 'UPDATE') THEN
      RAISE EXCEPTION 'Preflight gagal: authenticated memiliki hak tulis pada %. Tinjau ACL sebelum menghapus policy tulis.', v_table;
    END IF;
  END LOOP;
END
$$;

DROP POLICY IF EXISTS exam_attempts_insert_own ON public.exam_attempts;

DROP POLICY IF EXISTS exam_attempts_update_own ON public.exam_attempts;

DROP POLICY IF EXISTS attempt_answers_insert_own ON public.attempt_answers;

DROP POLICY IF EXISTS attempt_answers_update_own ON public.attempt_answers;

DROP POLICY IF EXISTS event_registrations_insert_own ON public.event_registrations;

DROP POLICY IF EXISTS leaderboard_entries_read ON public.leaderboard_entries;

CREATE POLICY leaderboard_entries_read ON public.leaderboard_entries AS PERMISSIVE
  FOR SELECT TO authenticated
  USING (((user_id = (
    SELECT
      auth.uid () AS uid))
      OR (
        SELECT
          app_private.has_permission ('admin.access'::text) AS has_permission)));

DROP POLICY IF EXISTS event_rankings_read ON public.event_rankings;

CREATE POLICY event_rankings_read ON public.event_rankings AS PERMISSIVE
  FOR SELECT TO authenticated
  USING (((user_id = (
    SELECT
      auth.uid () AS uid))
      OR (
        SELECT
          app_private.has_permission ('admin.access'::text) AS has_permission)));

ALTER TABLE IF EXISTS app_private.cpns_legacy_mapping_reviews ENABLE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS app_private.cpns_legacy_import_stage ENABLE ROW LEVEL SECURITY;
