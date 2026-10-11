DO $$
DECLARE
  v_program_id uuid;
  v_track_id uuid;
  v_board_id uuid;
BEGIN
  IF EXISTS (
    SELECT
      1
    FROM
      information_schema.tables
    WHERE
      table_schema = 'public'
      AND table_name = 'test_sessions') THEN
  RAISE EXCEPTION 'Refusing Schema V2 leaderboard QA seed on legacy/production-shaped database';
END IF;

  SELECT
    id
  INTO
    v_program_id
  FROM
    public.programs
  WHERE
    code = 'CPNS';
  SELECT
    id
  INTO
    v_track_id
  FROM
    public.tracks
  WHERE
    program_id = v_program_id
    AND code = 'SKD';

  IF v_program_id IS NULL OR v_track_id IS NULL THEN
    RAISE EXCEPTION 'CPNS/SKD catalog missing';
  END IF;

  INSERT INTO public.leaderboards (code, name, leaderboard_type, program_id, track_id, starts_at, ends_at, status)
    VALUES ('CPNS_NATIONAL_ALL_TIME', 'Ranking Nasional CPNS', 'national', v_program_id, v_track_id, '2026-01-01T00:00:00+07:00', '2030-12-31T23:59:59+07:00', 'active')
  ON CONFLICT (code)
    DO UPDATE SET
      name = excluded.name,
      leaderboard_type = excluded.leaderboard_type,
      program_id = excluded.program_id,
      track_id = excluded.track_id,
      starts_at = excluded.starts_at,
      ends_at = excluded.ends_at,
      status = excluded.status
    RETURNING
      id
    INTO
      v_board_id;

  PERFORM
    public.recalculate_leaderboard (v_board_id);
END
$$;
