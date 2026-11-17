-- Align CPNS/SKD practice exam token costs with the user-facing product contract.
-- Mini Tryout and Drilling Materi both advertise one token per new session.
-- Idempotent: only repairs active zero-cost CPNS/SKD MINI_TRYOUT and DRILL exams.
UPDATE
  public.exams AS e
SET
  token_cost = 1,
  updated_at = now()
FROM
  public.exam_types AS et,
  public.tracks AS t,
  public.programs AS p
WHERE
  e.exam_type_id = et.id
  AND e.track_id = t.id
  AND t.program_id = p.id
  AND p.code = 'CPNS'
  AND t.code = 'SKD'
  AND et.code IN ('MINI_TRYOUT', 'DRILL')
  AND lower(e.status) = 'active'
  AND e.token_cost = 0;
