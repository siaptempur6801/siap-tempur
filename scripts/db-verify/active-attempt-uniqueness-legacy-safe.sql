-- Disposable regression probe for the production index predicate.
-- Runs in one session and drops its temporary table before returning.
do $$
declare
  v_user uuid := '11111111-1111-4111-8111-111111111111';
  v_exam uuid := '22222222-2222-4222-8222-222222222222';
  v_event_a uuid := '33333333-3333-4333-8333-333333333333';
  v_event_b uuid := '44444444-4444-4444-8444-444444444444';
  v_assignment_a uuid := '55555555-5555-4555-8555-555555555555';
  v_assignment_b uuid := '66666666-6666-4666-8666-666666666666';
begin
  create temporary table attempt_uniqueness_probe (
    id bigint generated always as identity primary key,
    user_id uuid not null,
    exam_id uuid not null,
    source text not null,
    assignment_id uuid,
    status text not null,
    metadata jsonb not null default '{}'::jsonb
  );

  create unique index attempt_uniqueness_probe_b2c_uq
    on attempt_uniqueness_probe(user_id, exam_id, (coalesce(metadata->>'eventId','')))
    where source='b2c'
      and assignment_id is null
      and metadata->>'migration_source' is distinct from 'production_legacy_rehearsal'
      and lower(status) in ('created','in_progress');

  create unique index attempt_uniqueness_probe_org_uq
    on attempt_uniqueness_probe(user_id, assignment_id)
    where source='organization'
      and assignment_id is not null
      and lower(status) in ('created','in_progress');

  -- Two same-context legacy history rows coexist, and a modern Direct row can
  -- coexist with that history for the same user and assessment.
  insert into attempt_uniqueness_probe(user_id,exam_id,source,status,metadata) values
    (v_user,v_exam,'b2c','in_progress','{"migration_source":"production_legacy_rehearsal","history_class":"full"}'),
    (v_user,v_exam,'b2c','in_progress','{"migration_source":"production_legacy_rehearsal","history_class":"full"}'),
    (v_user,v_exam,'b2c','in_progress','{"accessContext":"DIRECT"}');

  -- A duplicate modern Direct attempt must be rejected.
  begin
    insert into attempt_uniqueness_probe(user_id,exam_id,source,status,metadata)
    values(v_user,v_exam,'b2c','in_progress','{"accessContext":"DIRECT"}');
    raise exception 'expected modern Direct duplicate to violate unique index';
  exception when unique_violation then
    null;
  end;

  -- Separate Event references are allowed, while a duplicate in one Event is not.
  insert into attempt_uniqueness_probe(user_id,exam_id,source,status,metadata) values
    (v_user,v_exam,'b2c','in_progress',jsonb_build_object('accessContext','EVENT','eventId',v_event_a::text)),
    (v_user,v_exam,'b2c','in_progress',jsonb_build_object('accessContext','EVENT','eventId',v_event_b::text));
  begin
    insert into attempt_uniqueness_probe(user_id,exam_id,source,status,metadata)
    values(v_user,v_exam,'b2c','in_progress',jsonb_build_object('accessContext','EVENT','eventId',v_event_a::text));
    raise exception 'expected same-Event duplicate to violate unique index';
  exception when unique_violation then
    null;
  end;

  -- Organization's separate assignment boundary remains unchanged.
  insert into attempt_uniqueness_probe(user_id,exam_id,source,assignment_id,status) values
    (v_user,v_exam,'organization',v_assignment_a,'in_progress'),
    (v_user,v_exam,'organization',v_assignment_b,'in_progress');
  begin
    insert into attempt_uniqueness_probe(user_id,exam_id,source,assignment_id,status)
    values(v_user,v_exam,'organization',v_assignment_a,'in_progress');
    raise exception 'expected same-Assignment duplicate to violate unique index';
  exception when unique_violation then
    null;
  end;

  drop table attempt_uniqueness_probe;
end
$$;
