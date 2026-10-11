-- Disposable regression probe for the production index predicate.
-- Runs in one session and drops its temporary table before returning.
DO $$
DECLARE
  v_user uuid := '11111111-1111-4111-8111-111111111111';
  v_exam uuid := '22222222-2222-4222-8222-222222222222';
  v_event_a uuid := '33333333-3333-4333-8333-333333333333';
  v_event_b uuid := '44444444-4444-4444-8444-444444444444';
  v_assignment_a uuid := '55555555-5555-4555-8555-555555555555';
  v_assignment_b uuid := '66666666-6666-4666-8666-666666666666';
BEGIN
  CREATE TEMPORARY TABLE attempt_uniqueness_probe (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id uuid NOT NULL,
    exam_id uuid NOT NULL,
    source text NOT NULL,
    assignment_id uuid,
    status text NOT NULL,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb
  );

    CREATE UNIQUE INDEX attempt_uniqueness_probe_b2c_uq ON attempt_uniqueness_probe (user_id, exam_id, (coalesce(metadata ->> 'eventId', '')))
    WHERE
      source = 'b2c' AND assignment_id IS NULL AND metadata ->> 'migration_source' IS DISTINCT FROM 'production_legacy_rehearsal' AND lower(status) IN ('created', 'in_progress');

    CREATE UNIQUE INDEX attempt_uniqueness_probe_org_uq ON attempt_uniqueness_probe (user_id, assignment_id)
    WHERE
      source = 'organization' AND assignment_id IS NOT NULL AND lower(status) IN ('created', 'in_progress');
    -- Two same-context legacy history rows coexist, and a modern Direct row can
    -- coexist with that history for the same user and assessment.
    INSERT INTO attempt_uniqueness_probe (user_id, exam_id, source, status, metadata)
    VALUES
      (v_user, v_exam, 'b2c', 'in_progress', '{"migration_source":"production_legacy_rehearsal","history_class":"full"}'),
      (v_user, v_exam, 'b2c', 'in_progress', '{"migration_source":"production_legacy_rehearsal","history_class":"full"}'),
      (v_user, v_exam, 'b2c', 'in_progress', '{"accessContext":"DIRECT"}');
    -- A duplicate modern Direct attempt must be rejected.
    BEGIN
      INSERT INTO attempt_uniqueness_probe (user_id, exam_id, source, status, metadata)
        VALUES (v_user, v_exam, 'b2c', 'in_progress', '{"accessContext":"DIRECT"}');
      RAISE EXCEPTION 'expected modern Direct duplicate to violate unique index';
    EXCEPTION
      WHEN unique_violation THEN
        NULL;
    END;
    -- Separate Event references are allowed, while a duplicate in one Event is not.
    INSERT INTO attempt_uniqueness_probe (user_id, exam_id, source, status, metadata)
    VALUES
      (v_user, v_exam, 'b2c', 'in_progress', jsonb_build_object('accessContext', 'EVENT', 'eventId', v_event_a::text)),
      (v_user, v_exam, 'b2c', 'in_progress', jsonb_build_object('accessContext', 'EVENT', 'eventId', v_event_b::text));
    BEGIN
      INSERT INTO attempt_uniqueness_probe (user_id, exam_id, source, status, metadata)
        VALUES (v_user, v_exam, 'b2c', 'in_progress', jsonb_build_object('accessContext', 'EVENT', 'eventId', v_event_a::text));
        RAISE EXCEPTION 'expected same-Event duplicate to violate unique index';
    EXCEPTION
      WHEN unique_violation THEN
        NULL;
    END;
    -- Organization's separate assignment boundary remains unchanged.
    INSERT INTO attempt_uniqueness_probe (user_id, exam_id, source, assignment_id, status)
    VALUES
      (v_user, v_exam, 'organization', v_assignment_a, 'in_progress'),
      (v_user, v_exam, 'organization', v_assignment_b, 'in_progress');
    BEGIN
      INSERT INTO attempt_uniqueness_probe (user_id, exam_id, source, assignment_id, status)
        VALUES (v_user, v_exam, 'organization', v_assignment_a, 'in_progress');
        RAISE EXCEPTION 'expected same-Assignment duplicate to violate unique index';
    EXCEPTION
      WHEN unique_violation THEN
        NULL;
    END;

    DROP TABLE attempt_uniqueness_probe;
END
$$;
