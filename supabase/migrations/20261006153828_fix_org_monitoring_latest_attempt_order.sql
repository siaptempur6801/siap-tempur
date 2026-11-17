-- Attempt numbers are scoped to an assessment. Monitoring one row per
-- participant must select by creation time across different assignments.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_batch_monitoring (p_batch_id uuid)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_actor uuid := auth.uid ();
  v_batch public.organization_batches%rowtype;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT app_private.current_user_has_permission ('organization.manage') THEN
    RAISE EXCEPTION 'Organization manage permission required';
  END IF;

  SELECT
    *
  INTO
    v_batch
  FROM
    public.organization_batches
  WHERE
    id = p_batch_id;
  IF NOT found THEN
    RAISE EXCEPTION 'Batch not found';
  END IF;

  RETURN ( WITH participants AS (
      SELECT
        p.id,
        p.participant_code,
        p.full_name_snapshot,
        p.email_snapshot,
        p.phone_snapshot,
        p.unit,
        p.status AS participant_status,
        p.user_id,
        -- Attempt terbaru peserta ini PADA BATCH INI. Peserta bisa
        -- mengerjakan lebih dari sekali bila template mengizinkannya.
        (
          SELECT
            a.id
          FROM
            public.exam_attempts a
          WHERE
            a.participant_id = p.id
            AND a.source = 'organization'
            AND a.organization_id = v_batch.organization_id
            AND a.batch_id = p_batch_id
          ORDER BY
            a.created_at DESC,
            a.attempt_number DESC
          LIMIT 1) AS attempt_id
    FROM
      public.organization_participants p
    WHERE
      p.batch_id = p_batch_id),
    scored AS (
      SELECT
        pt.*,
        a.status AS attempt_status,
        a.started_at,
        a.submitted_at,
        a.duration_used_seconds,
        a.total_score,
        a.percentage,
        a.passed,
        coalesce((
          SELECT
            s.raw_score
          FROM public.attempt_scores s
          JOIN public.subjects sub ON sub.id = s.subject_id
        WHERE
          s.attempt_id = pt.attempt_id
          AND sub.code = 'TWK'), 0) AS twk_score,
        coalesce((
          SELECT
            s.raw_score
          FROM public.attempt_scores s
          JOIN public.subjects sub ON sub.id = s.subject_id
        WHERE
          s.attempt_id = pt.attempt_id
          AND sub.code = 'TIU'), 0) AS tiu_score,
        coalesce((
          SELECT
            s.raw_score
          FROM public.attempt_scores s
          JOIN public.subjects sub ON sub.id = s.subject_id
        WHERE
          s.attempt_id = pt.attempt_id
          AND sub.code = 'TKP'), 0) AS tkp_score
      FROM
        participants pt
      LEFT JOIN public.exam_attempts a ON a.id = pt.attempt_id),
    ranked AS (
      SELECT
        sc.*,
        -- Peringkat dihitung ULANG di dalam batch ini saja (§7.6).
        --
        -- Memakai `rank()`, bukan `row_number()`: dua peserta dengan skor
        -- sama seharusnya berbagi peringkat, dan `row_number()` akan
        -- memaksakan urutan semu berdasarkan kode peserta.
        --
        -- `partition by (… = 'completed')` dipakai karena `FILTER` TIDAK
        -- berlaku untuk fungsi window — hanya untuk agregat. Peserta yang
        -- belum selesai masuk partisi lain, dan nilainya di-null-kan.
        CASE WHEN sc.attempt_status = 'completed' THEN
          rank() OVER (PARTITION BY (sc.attempt_status = 'completed') ORDER BY sc.total_score DESC nulls LAST,
          sc.participant_code)
        ELSE
          NULL
        END AS internal_rank
      FROM
        scored sc
)
      SELECT
        jsonb_build_object('batch', jsonb_build_object('id', v_batch.id, 'code', v_batch.code, 'name', v_batch.name, 'status', v_batch.status), 'summary', jsonb_build_object('total', count(*), 'linked', count(*) FILTER (WHERE user_id IS NOT NULL), 'not_started', count(*) FILTER (WHERE attempt_id IS NULL), 'in_progress', count(*) FILTER (WHERE attempt_status = 'in_progress'), 'completed', count(*) FILTER (WHERE attempt_status = 'completed'), 'passed', count(*) FILTER (WHERE passed IS TRUE), 'withdrawn', count(*) FILTER (WHERE participant_status = 'withdrawn')), 'participants', coalesce(jsonb_agg(jsonb_build_object('participant_id', id, 'participant_code', participant_code, 'full_name', full_name_snapshot, 'email', email_snapshot, 'phone', phone_snapshot, 'unit', unit, 'participant_status', participant_status, 'linked', user_id IS NOT NULL, 'attempt_status', attempt_status, 'started_at', started_at, 'submitted_at', submitted_at, 'duration_seconds', duration_used_seconds, 'twk_score', twk_score, 'tiu_score', tiu_score, 'tkp_score', tkp_score, 'total_score', total_score, 'percentage', percentage, 'passed', passed, 'internal_rank', internal_rank)
            ORDER BY participant_code), '[]'::jsonb))
      FROM
        ranked);
END;
$function$;
