-- =============================================================================
-- Finalisasi otomatis attempt yang melewati tenggat (audit fase 1, A-07)
--
-- MASALAH
--   Attempt `in_progress` hanya dinilai saat peserta kembali (mulai ulang) atau
--   membuka halaman ringkasan. Peserta Event yang putus koneksi di akhir tidak
--   pernah masuk ranking dan tidak mendapat sertifikat, walau jawabannya tersimpan.
--
-- PERBAIKAN (keputusan pemilik 2026-11-17)
--   1. `app_private.attempt_finalization_deadline(attempt)` — satu definisi tenggat:
--      - mesin bersama (tanpa `attempt_section_states`): started_at +
--        metadata.durationSeconds + 2 menit. Tanpa durasi (drill bebas) → NULL.
--      - mesin bersesi (TKA): `deadline_at` seksi aktif (atau `completed_at`
--        terakhir bila semua seksi selesai). Attempt Event: paling cepat saat sesi
--        event berakhir + 10 menit. Attempt lain: + 24 jam, supaya peserta yang
--        hanya terlambat menekan "lanjut" tidak kehilangan seksi berikutnya.
--      Attempt impor legacy (`migration_source = production_legacy_rehearsal`)
--      selalu NULL dan tidak pernah disentuh.
--   2. `public.list_expired_in_progress_attempts(limit)` — kandidat untuk cron.
--   3. `public.finalize_expired_sectioned_attempt(attempt)` — menutup seksi yang
--      tersisa lalu memanggil submit bawaan (`submit_exam_attempt_for_user`).
--      Menolak attempt yang belum melewati tenggat.
--   Attempt mesin bersama dinilai oleh aplikasi (examCompletionService), sama
--   dengan jalur submit biasa. Semua fungsi hanya untuk service_role.
-- =============================================================================
CREATE OR REPLACE FUNCTION app_private.attempt_finalization_deadline (p_attempt_id uuid)
  RETURNS timestamptz
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path = ''
  AS $$
DECLARE
  v_attempt public.exam_attempts%rowtype;
  v_sectioned boolean;
  v_section_deadline timestamptz;
  v_session_end timestamptz;
  v_duration numeric;
BEGIN
  SELECT
    *
  INTO
    v_attempt
  FROM
    public.exam_attempts
  WHERE
    id = p_attempt_id;
  IF NOT found OR lower(v_attempt.status)
    NOT IN ('in_progress', 'created') OR v_attempt.started_at IS NULL OR v_attempt.metadata ->> 'migration_source' IS NOT DISTINCT FROM 'production_legacy_rehearsal' THEN
    RETURN NULL;
  END IF;
  SELECT
    EXISTS (
      SELECT
        1
      FROM
        public.attempt_section_states
      WHERE
        attempt_id = p_attempt_id)
  INTO
    v_sectioned;
  IF NOT v_sectioned THEN
    IF coalesce(v_attempt.metadata ->> 'durationSeconds', '') !~ '^[0-9]+(\.[0-9]+)?$' THEN
      RETURN NULL;
    END IF;
    v_duration := (v_attempt.metadata ->> 'durationSeconds')::numeric;
    IF v_duration <= 0 THEN
      RETURN NULL;
    END IF;
    RETURN v_attempt.started_at + make_interval(secs => v_duration::double precision) + interval '2 minutes';
  END IF;
  SELECT
    coalesce(max(deadline_at) FILTER (WHERE status = 'active'), max(completed_at) FILTER (WHERE status = 'completed'))
  INTO
    v_section_deadline
  FROM
    public.attempt_section_states
  WHERE
    attempt_id = p_attempt_id;
  IF v_section_deadline IS NULL THEN
    RETURN NULL;
  END IF;
  IF coalesce(v_attempt.metadata ->> 'eventSessionId', '') ~ '^[0-9a-fA-F-]{36}$' THEN
    SELECT
      ends_at
    INTO
      v_session_end
    FROM
      public.event_sessions
    WHERE
      id = (v_attempt.metadata ->> 'eventSessionId')::uuid;
    RETURN greatest (v_section_deadline, coalesce(v_session_end, v_section_deadline)) + interval '10 minutes';
  END IF;
  RETURN v_section_deadline + interval '24 hours';
END;
$$;

CREATE OR REPLACE FUNCTION public.list_expired_in_progress_attempts (p_limit integer DEFAULT 50)
  RETURNS TABLE (
    attempt_id uuid,
    user_id uuid,
    engine text,
    deadline timestamptz)
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = ''
  AS $$
  SELECT
    c.id,
    c.user_id,
    CASE WHEN EXISTS (
      SELECT
        1
      FROM
        public.attempt_section_states s
      WHERE
        s.attempt_id = c.id) THEN
      'sectioned'
    ELSE
      'shared'
    END,
    c.deadline
  FROM (
    SELECT
      ea.id,
      ea.user_id,
      app_private.attempt_finalization_deadline (ea.id) AS deadline
    FROM
      public.exam_attempts ea
    WHERE
      lower(ea.status) IN ('in_progress', 'created')
      AND ea.started_at < now() - interval '2 minutes') c
WHERE
  c.deadline IS NOT NULL
  AND c.deadline < now()
ORDER BY
  c.deadline ASC
LIMIT greatest (1, least (coalesce(p_limit, 50), 200));
$$;

CREATE OR REPLACE FUNCTION public.finalize_expired_sectioned_attempt (p_attempt_id uuid)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $$
DECLARE
  v_user_id uuid;
  v_deadline timestamptz;
  v_step jsonb;
  v_result jsonb;
  v_guard integer := 0;
BEGIN
  SELECT
    user_id
  INTO
    v_user_id
  FROM
    public.exam_attempts
  WHERE
    id = p_attempt_id
    AND status = 'in_progress'
  FOR UPDATE;
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('attempt_id', p_attempt_id, 'finalized', FALSE, 'reason', 'NOT_IN_PROGRESS');
  END IF;
  v_deadline := app_private.attempt_finalization_deadline (p_attempt_id);
  IF v_deadline IS NULL OR v_deadline >= now() THEN
    RETURN jsonb_build_object('attempt_id', p_attempt_id, 'finalized', FALSE, 'reason', 'NOT_EXPIRED');
  END IF;
  LOOP
    v_guard := v_guard + 1;
    IF v_guard > 50 THEN
      RAISE EXCEPTION 'FINALIZE_SECTION_LOOP_GUARD';
    END IF;
    v_step := app_private.complete_exam_section_for_user (v_user_id, p_attempt_id);
    EXIT
    WHEN coalesce((v_step ->> 'ready_to_submit')::boolean, FALSE);
  END LOOP;
  v_result := app_private.submit_exam_attempt_for_user (v_user_id, p_attempt_id);
  INSERT INTO public.attempt_events (attempt_id, event_type, metadata)
    VALUES (p_attempt_id, 'auto_finalized', jsonb_build_object('deadline', v_deadline, 'reason', 'deadline_passed'));
  RETURN coalesce(v_result, '{}'::jsonb) || jsonb_build_object('attempt_id', p_attempt_id, 'finalized', TRUE);
END;
$$;

REVOKE ALL ON FUNCTION app_private.attempt_finalization_deadline (uuid) FROM public, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.list_expired_in_progress_attempts (integer) FROM public, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.list_expired_in_progress_attempts (integer) TO service_role;

REVOKE ALL ON FUNCTION public.finalize_expired_sectioned_attempt (uuid) FROM public, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.finalize_expired_sectioned_attempt (uuid) TO service_role;
