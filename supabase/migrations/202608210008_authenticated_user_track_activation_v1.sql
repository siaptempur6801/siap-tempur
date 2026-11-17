-- Milestone 2: remove learner track activation dependency on a service-role client.
-- The public wrapper is authenticated-only and always derives the user from auth.uid().

create or replace function app_private.activate_user_track_for_user(
  p_user_id uuid,
  p_program_code text,
  p_track_code text,
  p_target_year integer default null,
  p_school_name text default null,
  p_school_grade text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_program_id uuid;
  v_program_code text;
  v_track_id uuid;
  v_track_code text;
  v_user_track_id uuid;
  v_school_name text := nullif(btrim(coalesce(p_school_name,'')),'');
  v_school_grade text := nullif(btrim(coalesce(p_school_grade,'')),'');
begin
  if p_user_id is null then raise exception 'Authentication required'; end if;
  if not exists(select 1 from public.profiles where id=p_user_id and status='active') then
    raise exception 'Active user profile not found';
  end if;

  v_program_code := upper(btrim(coalesce(p_program_code,'')));
  v_track_code := upper(btrim(coalesce(p_track_code,'')));
  if v_program_code = '' or length(v_program_code) > 32 then raise exception 'Invalid program code'; end if;
  if v_track_code = '' or length(v_track_code) > 32 then raise exception 'Invalid track code'; end if;
  if p_target_year is not null and (p_target_year < 2025 or p_target_year > 2100) then
    raise exception 'Invalid target year';
  end if;
  if v_school_name is not null and length(v_school_name) > 160 then raise exception 'School name too long'; end if;
  if v_school_grade is not null and length(v_school_grade) > 32 then raise exception 'School grade too long'; end if;

  select p.id,p.code into v_program_id,v_program_code
  from public.programs p
  where upper(p.code)=v_program_code and lower(p.status)='active'
  limit 1;
  if v_program_id is null then raise exception 'Active program not found'; end if;

  select t.id,t.code into v_track_id,v_track_code
  from public.tracks t
  where t.program_id=v_program_id and upper(t.code)=v_track_code and lower(t.status)='active'
  limit 1;
  if v_track_id is null then raise exception 'Active track not found'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || v_track_id::text,0));

  insert into public.user_tracks(
    user_id,track_id,status,target_year,started_at,completed_at,created_at,updated_at
  ) values (
    p_user_id,v_track_id,'active',p_target_year,now(),null,now(),now()
  )
  on conflict(user_id,track_id) do update set
    status='active',
    target_year=excluded.target_year,
    completed_at=null,
    updated_at=now()
  returning id into v_user_track_id;

  if v_school_name is not null or v_school_grade is not null then
    insert into public.user_track_preferences(
      user_track_id,school_name,school_grade,preferences,created_at,updated_at
    ) values (
      v_user_track_id,v_school_name,v_school_grade,jsonb_build_object('source','tka_entry'),now(),now()
    )
    on conflict(user_track_id) do update set
      school_name=excluded.school_name,
      school_grade=excluded.school_grade,
      preferences=coalesce(public.user_track_preferences.preferences,'{}'::jsonb) || jsonb_build_object('source','tka_entry'),
      updated_at=now();
  end if;

  return jsonb_build_object(
    'userTrackId',v_user_track_id,
    'programCode',v_program_code,
    'trackCode',v_track_code,
    'status','active',
    'targetYear',p_target_year
  );
end;
$$;

create or replace function public.activate_user_track(
  p_program_code text,
  p_track_code text,
  p_target_year integer default null,
  p_school_name text default null,
  p_school_grade text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  return app_private.activate_user_track_for_user(
    v_user,p_program_code,p_track_code,p_target_year,p_school_name,p_school_grade
  );
end;
$$;

revoke all on function public.activate_user_track(text,text,integer,text,text) from public;
grant execute on function public.activate_user_track(text,text,integer,text,text) to authenticated;
