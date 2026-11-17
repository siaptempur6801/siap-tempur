-- Distribution channels select an existing ready CPNS/TKA assessment.
-- Keep legacy organization templates and composed exams readable for history;
-- stop exposing template composition as a supported authenticated workflow.

create or replace function public.admin_upsert_assignment(
    p_id          uuid,
    p_batch_id    uuid,
    p_exam_id     uuid,
    p_template_id uuid,
    p_starts_at   timestamptz,
    p_due_at      timestamptz,
    p_is_active   boolean,
    p_notes       text
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
    v_actor uuid := auth.uid();
    v_org uuid;
    v_exam_status text;
    v_program_code text;
    v_exam_type_code text;
    v_items integer;
    v_section_questions integer;
    v_id uuid := p_id;
    v_existing_batch uuid;
begin
    if v_actor is null then
        raise exception 'Authentication required';
    end if;
    if not app_private.current_user_has_permission('organization.manage') then
        raise exception 'Organization manage permission required';
    end if;

    select b.organization_id
      into v_org
      from public.organization_batches b
     where b.id = p_batch_id;
    if v_org is null then
        raise exception 'Batch not found';
    end if;

    select e.status, upper(coalesce(p.code, '')), upper(coalesce(et.code, ''))
      into v_exam_status, v_program_code, v_exam_type_code
      from public.exams e
      join public.programs p on p.id = e.program_id
      join public.exam_types et on et.id = e.exam_type_id
     where e.id = p_exam_id;
    if not found then
        raise exception 'Exam not found';
    end if;
    if v_program_code not in ('CPNS', 'TKA') then
        raise exception 'Assignment requires a CPNS or TKA assessment';
    end if;
    if v_exam_type_code not in ('FULL_TRYOUT', 'MINI_TRYOUT', 'DRILL') then
        raise exception 'Assignment requires a tryout, mini tryout, or drill';
    end if;
    if upper(v_exam_status) not in ('ACTIVE', 'SCHEDULED', 'PUBLISHED', 'READY') then
        raise exception 'Assessment is not available';
    end if;
    if p_starts_at is not null and p_due_at is not null and p_due_at < p_starts_at then
        raise exception 'Assignment due must not be before its start';
    end if;

    select count(*) into v_items
      from public.exam_question_items i
     where i.exam_id = p_exam_id;
    select coalesce(sum(greatest(coalesce(s.question_count, 0), 0)), 0)
      into v_section_questions
      from public.exam_sections s
     where s.exam_id = p_exam_id;
    if v_items = 0 and v_section_questions = 0 then
        raise exception 'Cannot assign an assessment that has no questions';
    end if;

    if v_id is null then
        insert into public.organization_exam_assignments (
            organization_id, batch_id, exam_id, template_id,
            assigned_by, starts_at, due_at, is_active, notes
        ) values (
            v_org, p_batch_id, p_exam_id, p_template_id,
            v_actor, p_starts_at, p_due_at, coalesce(p_is_active, true),
            nullif(btrim(coalesce(p_notes, '')), '')
        ) returning id into v_id;
    else
        select a.batch_id into v_existing_batch
          from public.organization_exam_assignments a
         where a.id = v_id;
        if not found then
            raise exception 'Assignment not found';
        end if;
        if v_existing_batch <> p_batch_id then
            raise exception 'Assignment batch mismatch';
        end if;

        update public.organization_exam_assignments a
           set organization_id = v_org,
               exam_id = p_exam_id,
               template_id = coalesce(p_template_id, a.template_id),
               starts_at = p_starts_at,
               due_at = p_due_at,
               is_active = coalesce(p_is_active, true),
               notes = nullif(btrim(coalesce(p_notes, '')), '')
         where a.id = v_id;
    end if;

    return jsonb_build_object('id', v_id, 'batch_id', p_batch_id, 'exam_id', p_exam_id);
end;
$function$;

revoke all on function public.admin_upsert_assignment(uuid, uuid, uuid, uuid, timestamptz, timestamptz, boolean, text) from public, anon;
grant execute on function public.admin_upsert_assignment(uuid, uuid, uuid, uuid, timestamptz, timestamptz, boolean, text) to authenticated;

-- The old RPCs created private copies of questions/exams or could delete an
-- exam that might now be shared by other channels. Preserve the routines/data,
-- but remove the authenticated client entry points.
revoke all on function public.admin_upsert_org_template(uuid, uuid, text, integer, integer, integer, integer, integer, boolean, boolean, text, text, text) from public, anon, authenticated;
revoke all on function public.admin_list_org_templates(uuid) from public, anon, authenticated;
revoke all on function public.admin_template_shortages(uuid) from public, anon, authenticated;
revoke all on function public.admin_compose_exam_from_template(uuid, text, text) from public, anon, authenticated;
revoke all on function public.admin_delete_composed_exam(uuid) from public, anon, authenticated;

create or replace function app_private.validate_event_session_assessment()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
    v_event_program uuid;
    v_event_track uuid;
    v_exam_program uuid;
    v_exam_track uuid;
    v_program_code text;
    v_exam_type_code text;
    v_exam_status text;
    v_items integer;
    v_section_questions integer;
begin
    select e.program_id, e.track_id
      into v_event_program, v_event_track
      from public.events e
     where e.id = new.event_id;
    if not found then
        raise exception 'Event not found';
    end if;

    select e.program_id, e.track_id, upper(coalesce(p.code, '')), upper(coalesce(et.code, '')), e.status
      into v_exam_program, v_exam_track, v_program_code, v_exam_type_code, v_exam_status
      from public.exams e
      join public.programs p on p.id = e.program_id
      join public.exam_types et on et.id = e.exam_type_id
     where e.id = new.exam_id;
    if not found then
        raise exception 'Assessment not found';
    end if;

    -- Existing EVENT exams are grandfathered for edits to their schedule only.
    if v_exam_type_code = 'EVENT'
       and tg_op = 'UPDATE'
       and old.event_id = new.event_id
       and old.exam_id = new.exam_id then
        return new;
    end if;
    if v_program_code not in ('CPNS', 'TKA')
       or v_exam_type_code not in ('FULL_TRYOUT', 'MINI_TRYOUT', 'DRILL')
       or upper(v_exam_status) not in ('ACTIVE', 'SCHEDULED', 'PUBLISHED', 'READY') then
        raise exception 'Event requires an available CPNS/TKA tryout, mini tryout, or drill';
    end if;
    if v_event_program <> v_exam_program or v_event_track <> v_exam_track then
        raise exception 'Event assessment domain/level mismatch';
    end if;

    select count(*) into v_items
      from public.exam_question_items i
     where i.exam_id = new.exam_id;
    select coalesce(sum(greatest(coalesce(s.question_count, 0), 0)), 0)
      into v_section_questions
      from public.exam_sections s
     where s.exam_id = new.exam_id;
    if v_items = 0 and v_section_questions = 0 then
        raise exception 'Event assessment has no questions';
    end if;
    return new;
end;
$function$;

revoke all on function app_private.validate_event_session_assessment() from public, anon, authenticated;
drop trigger if exists event_sessions_validate_assessment on public.event_sessions;
create trigger event_sessions_validate_assessment
before insert or update of event_id, exam_id on public.event_sessions
for each row execute function app_private.validate_event_session_assessment();
