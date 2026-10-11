-- Milestone 2: remove learner track activation dependency on a service-role client.
-- The public wrapper is authenticated-only and always derives the user from auth.uid().
CREATE OR REPLACE FUNCTION app_private.activate_user_track_for_user (p_user_id uuid, p_program_code text, p_track_code text, p_target_year integer DEFAULT NULL, p_school_name text DEFAULT NULL, p_school_grade text DEFAULT NULL)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $$
DECLARE
  v_program_id uuid;
  v_program_code text;
  v_track_id uuid;
  v_track_code text;
  v_user_track_id uuid;
  v_school_name text := nullif (btrim(coalesce(p_school_name, '')),'');
  v_school_grade text := nullif (btrim(coalesce(p_school_grade, '')),'');
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF NOT EXISTS (
    SELECT
      1
    FROM
      public.profiles
    WHERE
      id = p_user_id
      AND status = 'active') THEN
  RAISE EXCEPTION 'Active user profile not found';
END IF;

  v_program_code := upper(btrim(coalesce(p_program_code, '')));
  v_track_code := upper(btrim(coalesce(p_track_code, '')));
  IF v_program_code = '' OR length(v_program_code) > 32 THEN
    RAISE EXCEPTION 'Invalid program code';
  END IF;
  IF v_track_code = '' OR length(v_track_code) > 32 THEN
    RAISE EXCEPTION 'Invalid track code';
  END IF;
  IF p_target_year IS NOT NULL AND (p_target_year < 2025 OR p_target_year > 2100) THEN
    RAISE EXCEPTION 'Invalid target year';
  END IF;
  IF v_school_name IS NOT NULL AND length(v_school_name) > 160 THEN
    RAISE EXCEPTION 'School name too long';
  END IF;
  IF v_school_grade IS NOT NULL AND length(v_school_grade) > 32 THEN
    RAISE EXCEPTION 'School grade too long';
  END IF;

  SELECT
    p.id,
    p.code
  INTO
    v_program_id,
    v_program_code
  FROM
    public.programs p
  WHERE
    upper(p.code) = v_program_code
    AND lower(p.status) = 'active'
  LIMIT 1;
  IF v_program_id IS NULL THEN
    RAISE EXCEPTION 'Active program not found';
  END IF;

  SELECT
    t.id,
    t.code
  INTO
    v_track_id,
    v_track_code
  FROM
    public.tracks t
  WHERE
    t.program_id = v_program_id
    AND upper(t.code) = v_track_code
    AND lower(t.status) = 'active'
  LIMIT 1;
  IF v_track_id IS NULL THEN
    RAISE EXCEPTION 'Active track not found';
  END IF;

  PERFORM
    pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || v_track_id::text, 0));

INSERT INTO public.user_tracks (user_id, track_id, status, target_year, started_at, completed_at, created_at, updated_at)
  VALUES (p_user_id, v_track_id, 'active', p_target_year, now(), NULL, now(), now())
ON CONFLICT (user_id, track_id)
  DO UPDATE SET
    status = 'active',
    target_year = excluded.target_year,
    completed_at = NULL,
    updated_at = now()
  RETURNING
    id
  INTO
    v_user_track_id;

  IF v_school_name IS NOT NULL OR v_school_grade IS NOT NULL THEN
    INSERT INTO public.user_track_preferences (user_track_id, school_name, school_grade, preferences, created_at, updated_at)
      VALUES (v_user_track_id, v_school_name, v_school_grade, jsonb_build_object('source', 'tka_entry'), now(), now())
    ON CONFLICT (user_track_id)
      DO UPDATE SET
        school_name = excluded.school_name,
        school_grade = excluded.school_grade,
        preferences = coalesce(public.user_track_preferences.preferences, '{}'::jsonb) || jsonb_build_object('source', 'tka_entry'),
        updated_at = now();
  END IF;

  RETURN jsonb_build_object('userTrackId', v_user_track_id, 'programCode', v_program_code, 'trackCode', v_track_code, 'status', 'active', 'targetYear', p_target_year);
END;
$$;

CREATE OR REPLACE FUNCTION public.activate_user_track (p_program_code text, p_track_code text, p_target_year integer DEFAULT NULL, p_school_name text DEFAULT NULL, p_school_grade text DEFAULT NULL)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $$
DECLARE
  v_user uuid := auth.uid ();
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  RETURN app_private.activate_user_track_for_user (v_user, p_program_code, p_track_code, p_target_year, p_school_name, p_school_grade);
END;
$$;

REVOKE ALL ON FUNCTION public.activate_user_track (text, text, integer, text, text) FROM public;

GRANT EXECUTE ON FUNCTION public.activate_user_track (text, text, integer, text, text) TO authenticated;
