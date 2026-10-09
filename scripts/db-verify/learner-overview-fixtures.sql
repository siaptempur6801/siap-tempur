-- Staging-only transaction. All synthetic attempts roll back, including triggers.
-- Run as a privileged SQL connection on verified staging. Uses a disposable CI
-- user, never a real learner; requires that the user has no existing attempts.
begin;
do $$
declare u uuid; e uuid; other_user uuid; totals record; q uuid; a uuid; opt uuid; result record;
begin
    select id into u from auth.users where email like 'ci-tka-optimization-%@example.invalid' order by created_at desc limit 1;
    if u is null or exists(select 1 from public.exam_attempts where user_id=u) then
        raise exception 'Requires fresh disposable optimization TKA user';
    end if;
    perform set_config('optimization.fixture_user',u::text,true);
    select id into e from public.exams order by id limit 1;
    -- > PostgREST's default 1000-row cap; fractional/negative scores, every XP
    -- minimum, invalid metadata type, and both case variants of completion.
    insert into public.exam_attempts(exam_id,user_id,attempt_number,status,total_score,metadata)
    select e,u,n,case when n%2=0 then 'COMPLETED' else 'completed' end,
        case when n%5=0 then null when n%5=1 then -2 when n%5=2 then 12.99 when n%5=3 then 40.99 else 0 end,
        case n%6 when 0 then '{"practiceKind":"drill"}'::jsonb when 1 then '{"practiceKind":"mini_tryout"}'::jsonb
            when 2 then '{"practiceKind":"full_tryout"}'::jsonb when 3 then '{"practiceKind":"event"}'::jsonb
            when 4 then '{"practiceKind":42}'::jsonb else '{}'::jsonb end
    from generate_series(1,1005) n;
    select * into totals from public.practice_completed_attempt_totals(u);
    if totals.total_sessions <> 1005 or totals.total_xp <> (
        select sum(greatest(greatest(0,floor(coalesce(total_score,0))),
            case metadata->>'practiceKind' when 'mini_tryout' then 20 when 'full_tryout' then 30 when 'event' then 30 else 10 end))
        from public.exam_attempts where user_id=u
    ) then raise exception 'XP/count parity failed'; end if;
    perform set_config('optimization.fixture_xp',totals.total_xp::text,true);
    insert into public.exam_attempts(exam_id,user_id,attempt_number,status,metadata,updated_at)
        values(e,u,1006,'in_progress',jsonb_build_object('accessContext','event','eventId',gen_random_uuid()),now()),
              (e,u,1007,'in_progress','{"accessContext":"direct"}',now()+interval '1 second'),
              (e,u,1008,'submitted','{"accessContext":"organization"}',now()+interval '2 seconds');
    perform set_config('request.jwt.claim.sub',u::text,true);
    select * into result from public.learner_exam_attempt_summaries(array[e],false);
    if result.attempt_count<>1008 or result.active_attempt_id is distinct from
        (select id from public.exam_attempts where user_id=u and attempt_number=1007) then
        raise exception 'All-context count/active parity failed'; end if;
    select * into result from public.learner_exam_attempt_summaries(array[e],true);
    if result.attempt_count<>1006 then raise exception 'Direct-only quota parity failed'; end if;
    select id into a from public.exam_attempts where user_id=u and attempt_number=1007;
    select id into q from public.questions order by id limit 1;
    insert into public.attempt_questions(attempt_id,question_id,question_version,position,question_snapshot,max_score)
        select a,q,1,n,'{}',5 from generate_series(1,1005) n;
    select id into opt from public.question_options where question_id=q order by id limit 1;
    insert into public.attempt_answers(attempt_question_id,selected_option_id,answered_at)
        select id,case when position=1 then opt else null end,now()
        from public.attempt_questions where attempt_id=a and position in (1,2);
    select * into result from public.practice_active_attempt_overviews(u) where id=a;
    if result.question_count<>1005 or result.answered_questions<>1 then raise exception 'Active question count parity failed'; end if;
    select id into other_user from auth.users where id<>u order by id limit 1;
    perform set_config('request.jwt.claim.sub',other_user::text,true);
    if exists(select 1 from public.learner_exam_attempt_summaries(array[e],false) where active_attempt_id=a) then
        raise exception 'Cross-user leak'; end if;
end $$;
-- The same call under the actual learner role enforces both RLS and auth.uid().
select set_config('request.jwt.claim.sub',current_setting('optimization.fixture_user'),true);
set local role authenticated;
do $$
declare totals record;
begin
    select * into totals from public.learner_completed_attempt_totals();
    if totals.total_sessions<>1005 or totals.total_xp<>current_setting('optimization.fixture_xp')::bigint then
        raise exception 'Authenticated reward XP/count parity failed'; end if;
    perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
    select * into totals from public.learner_completed_attempt_totals();
    if totals.total_sessions<>0 or totals.total_xp<>0 then raise exception 'Cross-user reward leak'; end if;
end $$;
select * from public.learner_exam_attempt_summaries('{}'::uuid[],false);
rollback;
