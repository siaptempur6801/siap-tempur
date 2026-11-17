-- Attempt numbers are scoped to an assessment, so compare creation time first
-- when exporting the participant's latest result across assignments.
CREATE OR REPLACE FUNCTION public.admin_export_organization (p_organization_id uuid, p_batch_id uuid DEFAULT NULL)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_actor uuid := auth.uid ();
  v_org public.organizations%rowtype;
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
    v_org
  FROM
    public.organizations
  WHERE
    id = p_organization_id;
  IF NOT found THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;

  RETURN ( WITH scoped AS (
      SELECT
        pt.id AS participant_id,
        pt.participant_code,
        pt.full_name_snapshot,
        pt.email_snapshot,
        pt.phone_snapshot,
        pt.unit,
        pt.jabatan,
        pt.status AS participant_status,
        pt.user_id,
        b.id AS batch_id,
        b.code AS batch_code,
        b.name AS batch_name,
        a.id AS attempt_id,
        a.status AS attempt_status,
        a.started_at,
        a.submitted_at,
        a.duration_used_seconds,
        a.total_score,
        a.percentage,
        a.passed
      FROM
        public.organization_participants pt
        JOIN public.organization_batches b ON b.id = pt.batch_id
        LEFT JOIN LATERAL (
          SELECT
            ea.id,
            ea.status,
            ea.started_at,
            ea.submitted_at,
            ea.duration_used_seconds,
            ea.total_score,
            ea.percentage,
            ea.passed
          FROM
            public.exam_attempts ea
            -- Penyaringan ganda: sumber DAN instansi. Inilah yang
            -- menjamin KPI §11 "0 data B2C / antar instansi tercampur".
          WHERE
            ea.participant_id = pt.id
            AND ea.source = 'organization'
            AND ea.organization_id = p_organization_id
          ORDER BY
            ea.created_at DESC,
            ea.attempt_number DESC
          LIMIT 1) a ON TRUE
      WHERE
        pt.organization_id = p_organization_id
        AND (p_batch_id IS NULL
          OR pt.batch_id = p_batch_id)),
    with_scores AS (
      SELECT
        sc.*,
        coalesce((
          SELECT
            s.raw_score
          FROM public.attempt_scores s
          JOIN public.subjects sub ON sub.id = s.subject_id
        WHERE
          s.attempt_id = sc.attempt_id
          AND sub.code = 'TWK'), 0) AS twk_score,
        coalesce((
          SELECT
            s.raw_score
          FROM public.attempt_scores s
          JOIN public.subjects sub ON sub.id = s.subject_id
        WHERE
          s.attempt_id = sc.attempt_id
          AND sub.code = 'TIU'), 0) AS tiu_score,
        coalesce((
          SELECT
            s.raw_score
          FROM public.attempt_scores s
          JOIN public.subjects sub ON sub.id = s.subject_id
        WHERE
          s.attempt_id = sc.attempt_id
          AND sub.code = 'TKP'), 0) AS tkp_score
      FROM
        scoped sc),
      ranked AS (
        SELECT
          ws.*,
          CASE WHEN ws.attempt_status = 'completed' THEN
            rank() OVER (PARTITION BY ws.batch_id,
              (ws.attempt_status = 'completed') ORDER BY ws.total_score DESC nulls LAST,
            ws.participant_code)
          ELSE
            NULL
          END AS internal_rank
        FROM
          with_scores ws),
        batch_summary AS (
          SELECT
            batch_id,
            batch_code,
            batch_name,
            count(*) AS total_participants,
            count(*) FILTER (WHERE attempt_id IS NOT NULL) AS total_present,
            count(*) FILTER (WHERE attempt_status = 'completed') AS total_completed,
          count(*) FILTER (WHERE passed IS TRUE) AS total_passed,
          round(avg(twk_score) FILTER (WHERE attempt_status = 'completed'), 2) AS avg_twk,
          round(avg(tiu_score) FILTER (WHERE attempt_status = 'completed'), 2) AS avg_tiu,
          round(avg(tkp_score) FILTER (WHERE attempt_status = 'completed'), 2) AS avg_tkp,
          round(avg(total_score) FILTER (WHERE attempt_status = 'completed'), 2) AS avg_total
        FROM
          ranked
        GROUP BY
          batch_id,
          batch_code,
          batch_name
)
        SELECT
          jsonb_build_object('organization', jsonb_build_object('id', v_org.id, 'code', v_org.code, 'name', v_org.name), 'generated_at', now(), 'rekap', jsonb_build_object('columns', jsonb_build_array('nama_instansi', 'nama_batch', 'total_peserta', 'total_hadir', 'total_selesai', 'total_lulus', 'rata_rata_twk', 'rata_rata_tiu', 'rata_rata_tkp', 'rata_rata_total'), 'rows', coalesce((
              SELECT
                jsonb_agg(jsonb_build_array(v_org.name, bs.batch_name, bs.total_participants, bs.total_present, bs.total_completed, bs.total_passed, bs.avg_twk, bs.avg_tiu, bs.avg_tkp, bs.avg_total)
                ORDER BY bs.batch_name)
              FROM batch_summary bs), '[]'::jsonb)), 'detail', jsonb_build_object('columns', jsonb_build_array('participant_code', 'full_name', 'email', 'phone', 'unit', 'jabatan', 'nama_instansi', 'nama_batch', 'status_ujian', 'waktu_mulai', 'waktu_selesai', 'durasi_detik', 'skor_twk', 'skor_tiu', 'skor_tkp', 'total_skor', 'status_lulus'), 'rows', coalesce((
            SELECT
              jsonb_agg(jsonb_build_array(r.participant_code, r.full_name_snapshot, r.email_snapshot, r.phone_snapshot, r.unit, r.jabatan, v_org.name, r.batch_name, coalesce(r.attempt_status, r.participant_status), r.started_at, r.submitted_at, r.duration_used_seconds, r.twk_score, r.tiu_score, r.tkp_score, r.total_score, CASE WHEN r.passed IS NULL THEN
                    NULL
                  WHEN r.passed THEN
                    'Lulus'
                  ELSE
                    'Tidak lulus'
                  END)
              ORDER BY r.batch_name, r.participant_code)
            FROM ranked r), '[]'::jsonb)), 'ranking', jsonb_build_object('columns', jsonb_build_array('peringkat', 'participant_code', 'full_name', 'nama_batch', 'skor_twk', 'skor_tiu', 'skor_tkp', 'total_skor', 'status_lulus'), 'rows', coalesce((
          SELECT
            jsonb_agg(jsonb_build_array(r.internal_rank, r.participant_code, r.full_name_snapshot, r.batch_name, r.twk_score, r.tiu_score, r.tkp_score, r.total_score, CASE WHEN r.passed IS NULL THEN
                  NULL
                WHEN r.passed THEN
                  'Lulus'
                ELSE
                  'Tidak lulus'
                END)
            ORDER BY r.batch_name, r.internal_rank)
          FROM ranked r
          WHERE
            r.internal_rank IS NOT NULL), '[]'::jsonb)), 'no_show', jsonb_build_object('columns', jsonb_build_array('participant_code', 'full_name', 'email', 'phone', 'nama_batch', 'status_peserta', 'keterangan'), 'rows', coalesce((
          SELECT
            jsonb_agg(jsonb_build_array(r.participant_code, r.full_name_snapshot, r.email_snapshot, r.phone_snapshot, r.batch_name, r.participant_status, CASE WHEN r.attempt_status = 'in_progress' THEN
                  'Sudah mulai, belum selesai'
                WHEN r.attempt_status IS NULL THEN
                  'Belum mulai'
                ELSE
                  NULL
                END)
            ORDER BY r.batch_name, r.participant_code)
          FROM ranked r
          WHERE
            r.attempt_status IS DISTINCT FROM 'completed'), '[]'::jsonb))));
END;
$function$;
