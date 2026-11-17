-- Replace the B2C active-attempt index so imported history is not treated as
-- a live operational session. Keep the legacy rows and their status untouched.
-- `migration_source` is explicit on imported history; missing metadata remains
-- eligible for enforcement, preserving compatibility with older Direct rows.
DROP INDEX IF EXISTS public.exam_attempts_one_active_b2c_distribution_context;

CREATE UNIQUE INDEX exam_attempts_one_active_b2c_distribution_context ON public.exam_attempts (user_id, exam_id, (coalesce(metadata ->> 'eventId', '')))
WHERE
  source = 'b2c' AND assignment_id IS NULL AND metadata ->> 'migration_source' IS DISTINCT FROM 'production_legacy_rehearsal' AND lower(status) IN ('created', 'in_progress');
