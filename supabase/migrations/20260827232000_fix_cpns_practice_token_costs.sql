-- Align CPNS/SKD practice exam token costs with the user-facing product contract.
-- Mini Tryout and Drilling Materi both advertise one token per new session.
-- Idempotent: only repairs active zero-cost CPNS/SKD MINI_TRYOUT and DRILL exams.

update public.exams as e
set token_cost = 1,
    updated_at = now()
from public.exam_types as et,
     public.tracks as t,
     public.programs as p
where e.exam_type_id = et.id
  and e.track_id = t.id
  and t.program_id = p.id
  and p.code = 'CPNS'
  and t.code = 'SKD'
  and et.code in ('MINI_TRYOUT', 'DRILL')
  and lower(e.status) = 'active'
  and e.token_cost = 0;
