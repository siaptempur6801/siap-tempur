-- Read-only admin projections. Permission/context checks remain in server services.
-- Invoker rights never elevate table access. Sensitive projections are service-role only.
create function public.admin_assessment_supply(p_exam_ids uuid[])
returns table(exam_id uuid, bound_count bigint, approved_bound_count bigint, reviewed_bound_count bigint, sections jsonb)
language sql stable security invoker set search_path = '' as $$
  select e.id, b.total, b.approved, b.reviewed,
    coalesce((select jsonb_agg(jsonb_build_object('subject_id',s.subject_id,'question_count',s.question_count,
      'published_count',(select count(*) from public.questions q where q.subject_id=s.subject_id
        and q.status in ('published','PUBLISHED','active','ACTIVE'))))
      from public.exam_sections s where s.exam_id=e.id), '[]'::jsonb)
  from public.exams e
  cross join lateral (
    select count(*) as total,
      count(*) filter(where lower(q.status) in ('approved','published','active') and q.version=i.question_version) as approved,
      count(*) filter(where (select count(*) from (
        select distinct on (r.review_stage) r.review_stage,r.status,r.completed_at
        from public.content_reviews r where r.entity_type='question' and r.entity_id=i.question_id
          and r.question_version=i.question_version and r.review_stage in ('academic','editorial','technical_qa')
        order by r.review_stage,r.created_at desc,r.id desc
      ) latest where latest.status='approved' and latest.completed_at is not null)=3) as reviewed
    from public.exam_question_items i left join public.questions q on q.id=i.question_id where i.exam_id=e.id
  ) b
  where e.id=any(p_exam_ids);
$$;

create function public.admin_drill_supply(p_program_id uuid,p_track_id uuid,p_node_ids uuid[])
returns table(node_id uuid, available_count bigint)
language sql stable security invoker set search_path = '' as $$
  select n.id,count(distinct q.id)
  from public.knowledge_nodes n
  left join public.knowledge_node_paths p on p.ancestor_id=n.id
  left join public.question_knowledge_nodes m on m.knowledge_node_id=p.descendant_id and m.relation_type='primary'
  left join public.questions q on q.id=m.question_id and q.subject_id=n.subject_id
    and q.program_id=p_program_id and q.track_id=p_track_id and q.status in ('approved','published')
    and exists(select 1 from public.question_versions v where v.question_id=q.id and v.version=q.version)
  where n.id=any(p_node_ids) group by n.id;
$$;

create function public.admin_resource_counts(p_kind text,p_ids uuid[])
returns table(resource_id uuid, total bigint)
language plpgsql stable security invoker set search_path = '' as $$
begin
  case p_kind
    when 'event_participants' then return query select r.event_id,count(*) from public.event_registrations r where r.event_id=any(p_ids) group by r.event_id;
    when 'organization_assignments' then return query select a.organization_id,count(*) from public.organization_exam_assignments a where a.organization_id=any(p_ids) group by a.organization_id;
    when 'user_entitlements' then return query select e.user_id,count(*) from public.entitlements e where e.user_id=any(p_ids) and e.status='active' group by e.user_id;
    else raise exception 'Unsupported admin count resource';
  end case;
end;
$$;

-- Authenticated invoker uses the caller's existing questions RLS, including author/reviewer boundaries.
create function public.admin_question_status_counts(p_program_id uuid,p_track_id uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('total',count(*), 'draft',count(*) filter(where status='draft'),
    'assignedToMe',0,'unassigned',count(*) filter(where status in ('submitted','editorial_review','academic_review','technical_qa') and reviewer_id is null),
    'published',count(*) filter(where status='published'),'approved',count(*) filter(where status='approved'),
    'revisionRequired',count(*) filter(where status='revision_required'),
    'editorial',count(*) filter(where status in ('submitted','editorial_review')),
    'academic',count(*) filter(where status='academic_review'),'technical',count(*) filter(where status='technical_qa'))
  from public.questions where program_id=p_program_id and track_id=p_track_id;
$$;

create function public.admin_monitoring_page(
  p_event_id uuid default null,p_organization_id uuid default null,p_batch_id uuid default null,
  p_assignment_id uuid default null,p_exam_id uuid default null,p_search text default '',p_status text default '',p_page integer default 1
) returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare result jsonb;
begin
  if (p_event_id is null and (p_organization_id is null or p_batch_id is null))
    or (p_event_id is not null and (p_organization_id is not null or p_batch_id is not null or p_assignment_id is not null)) then
    raise exception 'One monitoring scope is required';
  end if;
  with roster as materialized (
    select r.id,r.user_id,coalesce(nullif(p.full_name,''),nullif(p.display_name,''),'Peserta') as name,
      null::text as email,p.full_name as search_name
    from public.event_registrations r left join public.profiles p on p.id=r.user_id
    where p_event_id is not null and r.event_id=p_event_id
    union all
    select r.id,r.user_id,r.full_name_snapshot,r.email_snapshot,r.full_name_snapshot
    from public.organization_participants r where p_event_id is null
      and r.organization_id=p_organization_id and r.batch_id=p_batch_id
  ), current_roster as materialized (
    select r.*,a.id as attempt_id,a.status as attempt_status,a.percentage,a.total_score,
      case when a.id is null then null else jsonb_build_object(
        'id',a.id,'user_id',a.user_id,'participant_id',a.participant_id,'exam_id',a.exam_id,'status',a.status,
        'started_at',a.started_at,'submitted_at',a.submitted_at,'duration_used_seconds',a.duration_used_seconds,
        'total_score',a.total_score,'percentage',a.percentage,'last_question_position',a.last_question_position,
        'assignment_id',a.assignment_id,'organization_id',a.organization_id,'batch_id',a.batch_id,'source',a.source
      ) end as attempt
    from roster r left join lateral (
      select a.id,a.user_id,a.participant_id,a.exam_id,a.status,a.started_at,a.submitted_at,a.duration_used_seconds,
        a.total_score,a.percentage,a.last_question_position,a.assignment_id,a.organization_id,a.batch_id,a.source
      from public.exam_attempts a where
        ((p_event_id is not null and a.source='b2c' and a.user_id=r.user_id and a.metadata @> jsonb_build_object('eventId',p_event_id::text))
        or (p_event_id is null and a.source='organization' and a.participant_id=r.id
          and a.organization_id=p_organization_id and a.batch_id=p_batch_id))
        and (p_assignment_id is null or a.assignment_id=p_assignment_id) and (p_exam_id is null or a.exam_id=p_exam_id)
      order by a.started_at desc,a.id desc limit 1
    ) a on true
  ), matched as materialized (
    select c.id,c.user_id,c.name,c.email,c.attempt_id,c.attempt from current_roster c
    where (coalesce(p_search,'')='' or c.search_name ilike '%'||p_search||'%' escape '\'
      or (p_event_id is null and c.email ilike '%'||p_search||'%' escape '\'))
      and (coalesce(p_status,'')='' or (p_status='not_started' and c.attempt_id is null) or c.attempt_status=p_status)
  ), totals as (
    select count(*) as total,greatest(1,ceil(count(*)/25.0)::integer) as last_page from matched
  ), selected_page as (
    select m.id,m.user_id,m.name,m.email,m.attempt_id,m.attempt from matched m order by m.id limit 25
      offset (select (least(greatest(1,coalesce(p_page,1)),last_page)-1)*25 from totals)
  ), summary as (
    select count(*) as total,count(*) filter(where attempt_id is null) as not_started,
      count(*) filter(where attempt_status='in_progress') as in_progress,
      count(*) filter(where attempt_status='completed') as completed,
      count(*) filter(where attempt_status='completed' and total_score is not null) as scored,
      count(*) filter(where attempt_status='completed' and percentage <25 and percentage <> '-Infinity'::numeric) as band0,
      count(*) filter(where attempt_status='completed' and percentage>=25 and percentage<50) as band1,
      count(*) filter(where attempt_status='completed' and percentage>=50 and percentage<75) as band2,
      count(*) filter(where attempt_status='completed' and percentage>=75 and percentage not in ('NaN'::numeric,'Infinity'::numeric,'-Infinity'::numeric)) as band3,
      count(*) filter(where attempt_status='completed' and (percentage is null or percentage in ('NaN'::numeric,'Infinity'::numeric,'-Infinity'::numeric))) as unknown
    from current_roster
  ) select jsonb_build_object(
    'total',t.total,'page',least(greatest(1,coalesce(p_page,1)),t.last_page),
    'summary',jsonb_build_object('total',s.total,'notStarted',s.not_started,'inProgress',s.in_progress,'completed',s.completed),
    'report',jsonb_build_object('scored',s.scored,'completionRate',case when s.total=0 then null else round(s.completed*100.0/s.total)::integer end,
      'bands',jsonb_build_array(jsonb_build_object('label','0–24%','count',s.band0),jsonb_build_object('label','25–49%','count',s.band1),
        jsonb_build_object('label','50–74%','count',s.band2),jsonb_build_object('label','75–100%','count',s.band3),
        jsonb_build_object('label','Persentase belum tersedia','count',s.unknown))),
    'rows',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'email',p.email,'attempt',p.attempt,
      'progress',case when p.attempt_id is null then null else jsonb_build_object('total',progress.total,'answered',progress.answered) end) order by p.id)
      from selected_page p cross join lateral (
        select count(*) as total,count(*) filter(where exists(select 1 from public.attempt_answers a where a.attempt_question_id=q.id and a.answered_at is not null)) as answered
        from public.attempt_questions q where q.attempt_id=p.attempt_id
      ) progress),'[]'::jsonb)
  ) into result from totals t cross join summary s;
  return result;
end;
$$;

create function public.admin_question_page(
  p_program_id uuid,p_track_id uuid,p_search text default '',p_status text default '',p_subject_id uuid default null,
  p_node_id uuid default null,p_review text default '',p_stage text default '',p_reviewer text default '',p_page integer default 1,p_id uuid default null
) returns jsonb language sql stable security invoker set search_path = '' as $$
  with candidates as materialized (
    select q.id,q.question_code,q.subject_id,q.question_type,q.stem,q.difficulty,q.source_type,q.source_reference,
      q.status,q.version,q.author_id,q.reviewer_id,q.published_at,q.updated_at
    from public.questions q where q.program_id=p_program_id and q.track_id=p_track_id
      and (p_id is null or q.id=p_id) and (coalesce(p_status,'')='' or q.status=p_status)
      and (p_subject_id is null or q.subject_id=p_subject_id) and (coalesce(p_stage,'')='' or (p_stage='editorial' and q.status in ('submitted','editorial_review')) or (p_stage='academic' and q.status='academic_review') or (p_stage='technical_qa' and q.status='technical_qa'))
      and (coalesce(p_reviewer,'')='' or (p_reviewer='unassigned' and q.reviewer_id is null) or q.reviewer_id::text=p_reviewer)
      and (coalesce(p_search,'')='' or q.question_code ilike '%'||p_search||'%' escape '\' or q.stem ilike '%'||p_search||'%' escape '\')
      and (p_node_id is null or exists(select 1 from public.question_knowledge_nodes m
        where m.question_id=q.id and m.relation_type='primary' and (m.knowledge_node_id=p_node_id or exists(
          select 1 from public.knowledge_node_paths p where p.ancestor_id=p_node_id and p.descendant_id=m.knowledge_node_id))))
  ), matched as materialized (
    select q.id,q.question_code,q.subject_id,q.question_type,q.stem,q.difficulty,q.source_type,q.source_reference,
      q.status,q.version,q.author_id,q.reviewer_id,q.published_at,q.updated_at from candidates q
    where coalesce(p_review,'')='' or exists (
      select 1 from (
        select case
          when bool_or(coalesce(r.notes,'') ~* 'blocked[_ ]asset|aset.*belum|asset.*missing' and r.status<>'approved') then 'blocked_asset'
          when bool_or(coalesce(r.notes,'') ~* 'blocked[_ ]content' and r.status<>'approved') then 'blocked_content'
          when bool_or(r.status='rejected') then 'rejected'
          when count(*) filter(where r.review_stage in ('academic','editorial','technical_qa') and r.status='approved' and r.completed_at is not null)=3 then 'approved'
          else 'needs_review' end as state from (
            select distinct on (r.review_stage) r.review_stage,r.status,r.notes,r.completed_at
            from public.content_reviews r where r.entity_type='question' and r.entity_id=q.id and r.question_version=q.version
            order by r.review_stage,r.created_at desc,r.id desc
          ) r
      ) state where state.state=p_review or (p_review='blocked' and state.state in ('blocked_asset','blocked_content'))
    )
  ), totals as (select count(*) as total,greatest(1,ceil(count(*)/25.0)::integer) as last_page from matched),
  page as (select m.id,m.question_code,m.subject_id,m.question_type,m.stem,m.difficulty,m.source_type,m.source_reference,
    m.status,m.version,m.author_id,m.reviewer_id,m.published_at,m.updated_at from matched m
    order by m.updated_at desc,m.id limit 25 offset (greatest(1,coalesce(p_page,1))-1)*25)
  select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(p) order by p.updated_at desc,p.id) from page p),'[]'::jsonb),
    'total',t.total,'lastPage',t.last_page,'clampTo',case when greatest(1,coalesce(p_page,1))>t.last_page then t.last_page else null end)
  from totals t;
$$;

revoke all on function public.admin_assessment_supply(uuid[]),public.admin_drill_supply(uuid,uuid,uuid[]),
  public.admin_resource_counts(text,uuid[]),public.admin_monitoring_page(uuid,uuid,uuid,uuid,uuid,text,text,integer),
  public.admin_question_page(uuid,uuid,text,text,uuid,uuid,text,text,text,integer,uuid) from public,anon,authenticated;
grant execute on function public.admin_assessment_supply(uuid[]),public.admin_drill_supply(uuid,uuid,uuid[]),
  public.admin_resource_counts(text,uuid[]),public.admin_monitoring_page(uuid,uuid,uuid,uuid,uuid,text,text,integer),
  public.admin_question_page(uuid,uuid,text,text,uuid,uuid,text,text,text,integer,uuid) to service_role;
revoke all on function public.admin_question_status_counts(uuid,uuid) from public,anon;
grant execute on function public.admin_question_status_counts(uuid,uuid) to authenticated,service_role;
