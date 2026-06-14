-- Add per-section live score breakdown for admin event leaderboard.
-- This keeps scoring server-side and avoids exposing answer keys to clients.

drop function if exists public.get_live_event_leaderboard(uuid);

create function public.get_live_event_leaderboard(p_event_id uuid)
returns table (
  user_id uuid,
  full_name text,
  avatar_url text,
  progress_count bigint,
  score_twk bigint,
  score_tiu bigint,
  score_tkp bigint,
  total_score bigint,
  live_rank bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Access denied. Only admins can view the live leaderboard.';
  end if;

  return query
  with session_scores as (
    select
      tes.user_id,
      tes.started_at,
      count(a.option_id) as answered_count,
      coalesce(sum(
        case
          when q.type = 'TWK' and o.is_correct then 5
          else 0
        end
      ), 0) as score_twk,
      coalesce(sum(
        case
          when q.type = 'TIU' and o.is_correct then 5
          else 0
        end
      ), 0) as score_tiu,
      coalesce(sum(
        case
          when q.type = 'TKP' then coalesce(o.score_value, 0)
          else 0
        end
      ), 0) as score_tkp
    from public.tryout_event_sessions tes
    left join public.test_answers a on a.session_id = tes.session_id
    left join public.questions q on q.id = a.question_id
    left join public.options o on o.id = a.option_id
    where tes.event_id = p_event_id
    group by tes.user_id, tes.started_at
  )
  select
    ss.user_id,
    p.full_name,
    p.avatar_url,
    ss.answered_count,
    ss.score_twk,
    ss.score_tiu,
    ss.score_tkp,
    ss.score_twk + ss.score_tiu + ss.score_tkp as total_score,
    rank() over (order by (ss.score_twk + ss.score_tiu + ss.score_tkp) desc, ss.started_at asc) as live_rank
  from session_scores ss
  join public.profiles p on p.id = ss.user_id
  order by live_rank asc
  limit 50;
end;
$$;

revoke execute on function public.get_live_event_leaderboard(uuid) from public, anon;
grant execute on function public.get_live_event_leaderboard(uuid) to authenticated, service_role;
