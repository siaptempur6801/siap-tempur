do $$
declare
  v_program_id uuid;
  v_track_id uuid;
  v_board_id uuid;
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'test_sessions'
  ) then
    raise exception 'Refusing Schema V2 leaderboard QA seed on legacy/production-shaped database';
  end if;

  select id into v_program_id from public.programs where code = 'CPNS';
  select id into v_track_id from public.tracks where program_id = v_program_id and code = 'SKD';

  if v_program_id is null or v_track_id is null then
    raise exception 'CPNS/SKD catalog missing';
  end if;

  insert into public.leaderboards (
    code, name, leaderboard_type, program_id, track_id,
    starts_at, ends_at, status
  ) values (
    'CPNS_NATIONAL_ALL_TIME',
    'Ranking Nasional CPNS',
    'national',
    v_program_id,
    v_track_id,
    '2026-01-01T00:00:00+07:00',
    '2030-12-31T23:59:59+07:00',
    'active'
  )
  on conflict (code) do update set
    name = excluded.name,
    leaderboard_type = excluded.leaderboard_type,
    program_id = excluded.program_id,
    track_id = excluded.track_id,
    starts_at = excluded.starts_at,
    ends_at = excluded.ends_at,
    status = excluded.status
  returning id into v_board_id;

  perform public.recalculate_leaderboard(v_board_id);
end $$;
