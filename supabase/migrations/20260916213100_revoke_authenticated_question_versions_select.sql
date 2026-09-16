-- P0 security fix — authenticated tidak boleh membaca question_versions.
--
-- question_versions.snapshot dibangun oleh app_private.ensure_question_snapshot() dan
-- memuat 'is_correct' + 'score' untuk setiap opsi (lihat scripts/cutover/bootstrap/
-- 09_functions_app_private_n_r.sql). Kombinasi berikut membocorkan kunci jawaban:
--
--   GRANT SELECT ON TABLE public.question_versions TO authenticated;          -- 18_acl.sql
--   CREATE POLICY question_versions_authoring_select ... q.status = approved/published  -- 16_policies_q_z.sql
--
-- Terkonfirmasi aktif di staging live (pg_dump: GRANT SELECT ... TO authenticated).
--
-- Aman dicabut karena:
--   1. semua fungsi runtime yang membaca question_versions berjalan sebagai
--      SECURITY DEFINER (ensure_question_snapshot, start_exam_attempt_for_user,
--      save_question_draft, admin_upsert_drill_exam_v1, dst.), sehingga tidak
--      memerlukan privilege tabel milik caller;
--   2. seluruh pembaca di aplikasi memakai service-role client
--      (src/services/admin-exams.service.ts, src/services/admin-v2.service.ts);
--   3. detail versi untuk workspace review tetap tersedia lewat RPC
--      get_content_question_detail yang memakai SECURITY DEFINER + guard permission.
--
-- Verifikasi setelah apply (harus 0 baris):
--   select grantee, privilege_type
--   from information_schema.role_table_grants
--   where table_schema = 'public' and table_name = 'question_versions'
--     and grantee in ('anon', 'authenticated');

revoke select on table public.question_versions from public, anon, authenticated;
drop policy if exists question_versions_authoring_select on public.question_versions;
