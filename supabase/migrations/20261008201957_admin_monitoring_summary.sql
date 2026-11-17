create function public.admin_monitoring_summary(
  p_event_id uuid default null,
  p_organization_id uuid default null,
  p_batch_id uuid default null,
  p_assignment_id uuid default null,
  p_exam_id uuid default null,
  p_include_report boolean default true
) returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  result jsonb;
begin
  if (p_event_id is null and (p_organization_id is null or p_batch_id is null))
    or (p_event_id is not null and (p_organization_id is not null or p_batch_id is not null or p_assignment_id is not null)) then
    raise exception 'One monitoring scope is required';
  end if;

  with roster as materialized (
    select r.id, r.user_id
    from public.event_registrations r
    where p_event_id is not null and r.event_id = p_event_id
    union all
    select r.id, r.user_id
    from public.organization_participants r
    where p_event_id is null
      and r.organization_id = p_organization_id
      and r.batch_id = p_batch_id
  ), current_roster as materialized (
    select r.id, a.id as attempt_id, a.status as attempt_status, a.total_score, a.percentage
    from roster r
    left join lateral (
      select a.id, a.status, a.total_score, a.percentage
      from public.exam_attempts a
      where (
        (p_event_id is not null and a.source = 'b2c' and a.user_id = r.user_id
          and a.metadata @> jsonb_build_object('eventId', p_event_id::text))
        or (p_event_id is null and a.source = 'organization' and a.participant_id = r.id
          and a.organization_id = p_organization_id and a.batch_id = p_batch_id)
      )
        and (p_assignment_id is null or a.assignment_id = p_assignment_id)
        and (p_exam_id is null or a.exam_id = p_exam_id)
      order by a.started_at desc, a.id desc
      limit 1
    ) a on true
  ), summary as (
    select
      count(*) as total,
      count(*) filter (where attempt_id is null) as not_started,
      count(*) filter (where attempt_status = 'in_progress') as in_progress,
      count(*) filter (where attempt_status = 'completed') as completed,
      count(*) filter (where attempt_status = 'completed' and total_score is not null) as scored,
      count(*) filter (where attempt_status = 'completed' and percentage < 25 and percentage <> '-Infinity'::numeric) as band0,
      count(*) filter (where attempt_status = 'completed' and percentage >= 25 and percentage < 50) as band1,
      count(*) filter (where attempt_status = 'completed' and percentage >= 50 and percentage < 75) as band2,
      count(*) filter (where attempt_status = 'completed' and percentage >= 75 and percentage not in ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)) as band3,
      count(*) filter (where attempt_status = 'completed' and (percentage is null or percentage in ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric))) as unknown
    from current_roster
  )
  select jsonb_build_object(
    'total', s.total,
    'summary', jsonb_build_object(
      'total', s.total,
      'notStarted', s.not_started,
      'inProgress', s.in_progress,
      'completed', s.completed
    ),
    'report', case when p_include_report then jsonb_build_object(
      'scored', s.scored,
      'completionRate', case when s.total = 0 then null else round(s.completed * 100.0 / s.total)::integer end,
      'bands', jsonb_build_array(
        jsonb_build_object('label', '0–24%', 'count', s.band0),
        jsonb_build_object('label', '25–49%', 'count', s.band1),
        jsonb_build_object('label', '50–74%', 'count', s.band2),
        jsonb_build_object('label', '75–100%', 'count', s.band3),
        jsonb_build_object('label', 'Persentase belum tersedia', 'count', s.unknown)
      )
    ) else null end
  ) into result
  from summary s;

  return result;
end;
$$;

comment on function public.admin_monitoring_summary(uuid, uuid, uuid, uuid, uuid, boolean)
  is 'Returns aggregate monitoring metrics without participant rows or per-attempt progress payloads.';

revoke all on function public.admin_monitoring_summary(uuid, uuid, uuid, uuid, uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.admin_monitoring_summary(uuid, uuid, uuid, uuid, uuid, boolean)
  to service_role;
