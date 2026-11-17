create or replace function public.recalculate_leaderboard(p_leaderboard_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_board public.leaderboards%rowtype;
begin
  select * into v_board
  from public.leaderboards
  where id = p_leaderboard_id;

  if not found then
    raise exception 'LEADERBOARD_NOT_FOUND';
  end if;

  delete from public.leaderboard_entries
  where leaderboard_id = p_leaderboard_id;

  with candidate_attempts as (
    select
      ea.id as attempt_id,
      ea.user_id,
      coalesce(ea.total_score, 0)::numeric as total_score,
      coalesce(ea.duration_used_seconds, 2147483647) as duration_seconds,
      ea.submitted_at,
      row_number() over (
        partition by ea.user_id
        order by
          coalesce(ea.total_score, 0) desc,
          coalesce(ea.duration_used_seconds, 2147483647) asc,
          ea.submitted_at asc nulls last,
          ea.id asc
      ) as user_best_rank
    from public.exam_attempts ea
    join public.exams e on e.id = ea.exam_id
    join public.exam_types et on et.id = e.exam_type_id
    where lower(ea.status) = 'completed'
      and et.code = 'FULL_TRYOUT'
      and (v_board.program_id is null or e.program_id = v_board.program_id)
      and (v_board.track_id is null or e.track_id = v_board.track_id)
      and ea.submitted_at is not null
      and ea.submitted_at >= v_board.starts_at
      and ea.submitted_at <= v_board.ends_at
  ),
  best_attempts as (
    select * from candidate_attempts where user_best_rank = 1
  ),
  subject_scores as (
    select
      ats.attempt_id,
      max(ats.raw_score) filter (where s.code = 'TWK') as score_twk,
      max(ats.raw_score) filter (where s.code = 'TIU') as score_tiu,
      max(ats.raw_score) filter (where s.code = 'TKP') as score_tkp
    from public.attempt_scores ats
    left join public.subjects s on s.id = ats.subject_id
    join best_attempts ba on ba.attempt_id = ats.attempt_id
    group by ats.attempt_id
  ),
  ranked as (
    select
      ba.*,
      coalesce(ss.score_twk, 0)::numeric as score_twk,
      coalesce(ss.score_tiu, 0)::numeric as score_tiu,
      coalesce(ss.score_tkp, 0)::numeric as score_tkp,
      row_number() over (
        order by
          ba.total_score desc,
          ba.duration_seconds asc,
          ba.submitted_at asc nulls last,
          ba.user_id asc
      )::integer as rank_pos
    from best_attempts ba
    left join subject_scores ss on ss.attempt_id = ba.attempt_id
  )
  insert into public.leaderboard_entries (
    leaderboard_id,
    user_id,
    score,
    rank,
    metadata,
    updated_at
  )
  select
    p_leaderboard_id,
    ranked.user_id,
    ranked.total_score,
    ranked.rank_pos,
    jsonb_build_object(
      'attemptId', ranked.attempt_id,
      'durationSeconds', ranked.duration_seconds,
      'submittedAt', ranked.submitted_at,
      'scoreTWK', ranked.score_twk,
      'scoreTIU', ranked.score_tiu,
      'scoreTKP', ranked.score_tkp
    ),
    now()
  from ranked;
end;
$$;

revoke all on function public.recalculate_leaderboard(uuid) from public;
revoke all on function public.recalculate_leaderboard(uuid) from anon;
revoke all on function public.recalculate_leaderboard(uuid) from authenticated;
grant execute on function public.recalculate_leaderboard(uuid) to service_role;
