DO $$
DECLARE
  v_target_count integer;
BEGIN
  SELECT
    count(*)
  INTO
    v_target_count
  FROM
    public.exams e
    JOIN public.exam_types et ON et.id = e.exam_type_id
    JOIN public.tracks t ON t.id = e.track_id
    JOIN public.programs p ON p.id = t.program_id
  WHERE
    upper(p.code) = 'CPNS'
    AND upper(t.code) = 'SKD'
    AND upper(et.code) = 'FULL_TRYOUT'
    AND lower(e.status) = 'active';

  IF v_target_count <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one active CPNS/SKD FULL_TRYOUT exam, found %', v_target_count;
  END IF;

  UPDATE
    public.exams e
  SET
    token_cost = 1,
    updated_at = now()
  FROM
    public.exam_types et,
    public.tracks t,
    public.programs p
  WHERE
    et.id = e.exam_type_id
    AND t.id = e.track_id
    AND p.id = t.program_id
    AND upper(p.code) = 'CPNS'
    AND upper(t.code) = 'SKD'
    AND upper(et.code) = 'FULL_TRYOUT'
    AND lower(e.status) = 'active'
    AND e.token_cost IS DISTINCT FROM 1;
END
$$;
