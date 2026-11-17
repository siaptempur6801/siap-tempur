-- Roll back the local-only CPNS instansi schema if it was accidentally applied.
-- This migration is idempotent and intentionally removes organization-scoped exam data.
DROP POLICY IF EXISTS "Operators view organization answers" ON public.test_answers;

DROP POLICY IF EXISTS "Operators view organization sessions" ON public.test_sessions;

DROP POLICY IF EXISTS "Operators manage organizations" ON public.organizations;

DROP POLICY IF EXISTS "Participants view own organizations" ON public.organizations;

DROP POLICY IF EXISTS "Operators manage organization members" ON public.organization_members;

DROP POLICY IF EXISTS "Operators manage organization batches" ON public.organization_batches;

DROP POLICY IF EXISTS "Participants view own batches" ON public.organization_batches;

DROP POLICY IF EXISTS "Operators manage organization participants" ON public.organization_participants;

DROP POLICY IF EXISTS "Participants view own participant rows" ON public.organization_participants;

DROP POLICY IF EXISTS "Operators manage organization exam templates" ON public.organization_exam_templates;

DROP POLICY IF EXISTS "Participants view own organization exam templates" ON public.organization_exam_templates;

DROP POLICY IF EXISTS "Operators manage organization exam assignments" ON public.organization_exam_assignments;

DROP POLICY IF EXISTS "Participants view own organization exam assignments" ON public.organization_exam_assignments;

DO $rollback$
DECLARE
  cleanup_conditions text[] := ARRAY[]::text[];
BEGIN
  IF EXISTS (
    SELECT
      1
    FROM
      information_schema.columns
    WHERE
      table_schema = 'public'
      AND table_name = 'test_sessions'
      AND column_name = 'source') THEN
  cleanup_conditions := array_append(cleanup_conditions, 'source = ''organization''');
END IF;

  IF EXISTS (
    SELECT
      1
    FROM
      information_schema.columns
    WHERE
      table_schema = 'public'
      AND table_name = 'test_sessions'
      AND column_name = 'organization_id') THEN
  cleanup_conditions := array_append(cleanup_conditions, 'organization_id is not null');
END IF;

  IF EXISTS (
    SELECT
      1
    FROM
      information_schema.columns
    WHERE
      table_schema = 'public'
      AND table_name = 'test_sessions'
      AND column_name = 'organization_batch_id') THEN
  cleanup_conditions := array_append(cleanup_conditions, 'organization_batch_id is not null');
END IF;

  IF EXISTS (
    SELECT
      1
    FROM
      information_schema.columns
    WHERE
      table_schema = 'public'
      AND table_name = 'test_sessions'
      AND column_name = 'organization_assignment_id') THEN
  cleanup_conditions := array_append(cleanup_conditions, 'organization_assignment_id is not null');
END IF;

  IF EXISTS (
    SELECT
      1
    FROM
      information_schema.columns
    WHERE
      table_schema = 'public'
      AND table_name = 'test_sessions'
      AND column_name = 'organization_participant_id') THEN
  cleanup_conditions := array_append(cleanup_conditions, 'organization_participant_id is not null');
END IF;

  IF array_length(cleanup_conditions, 1) > 0 THEN
    EXECUTE format('delete from public.test_sessions where %s', array_to_string(cleanup_conditions, ' or '));
  END IF;
END
$rollback$;

DROP INDEX IF EXISTS public.test_sessions_source_idx;

DROP INDEX IF EXISTS public.test_sessions_org_export_idx;

DROP INDEX IF EXISTS public.test_sessions_org_participant_idx;

DROP INDEX IF EXISTS public.test_sessions_org_assignment_idx;

ALTER TABLE IF EXISTS public.test_sessions
  DROP CONSTRAINT IF EXISTS test_sessions_source_check,
  DROP CONSTRAINT IF EXISTS test_sessions_attempt_number_check,
  DROP CONSTRAINT IF EXISTS test_sessions_organization_id_fkey,
  DROP CONSTRAINT IF EXISTS test_sessions_organization_batch_id_fkey,
  DROP CONSTRAINT IF EXISTS test_sessions_organization_assignment_id_fkey,
  DROP CONSTRAINT IF EXISTS test_sessions_organization_participant_id_fkey;

ALTER TABLE IF EXISTS public.test_sessions
  DROP COLUMN IF EXISTS source,
  DROP COLUMN IF EXISTS organization_id,
  DROP COLUMN IF EXISTS organization_batch_id,
  DROP COLUMN IF EXISTS organization_assignment_id,
  DROP COLUMN IF EXISTS organization_participant_id,
  DROP COLUMN IF EXISTS attempt_number;

DROP TABLE IF EXISTS public.organization_exam_assignments;

DROP TABLE IF EXISTS public.organization_participants;

DROP TABLE IF EXISTS public.organization_members;

DROP TABLE IF EXISTS public.organization_exam_templates;

DROP TABLE IF EXISTS public.organization_batches;

DROP TABLE IF EXISTS public.organizations;

DROP FUNCTION IF EXISTS public.set_current_timestamp_updated_at ();

DROP FUNCTION IF EXISTS public.is_platform_operator ();
