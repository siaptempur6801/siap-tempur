-- Ensure Tryout Akbar event questions receive a global 1..N order.
-- The previous generator used the blueprint/category sort_order for every
-- question in that category, so multiple questions could show the same number.

create or replace function public.generate_tryout_event_questions(p_event_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count int;
begin
  if p_event_id is null then
    raise exception 'Event ID wajib diisi';
  end if;

  if not exists (select 1 from public.tryout_events where id = p_event_id) then
    raise exception 'Event tidak ditemukan';
  end if;

  delete from public.tryout_event_questions where event_id = p_event_id;

  with selected_questions as (
    select
      q.id as question_id,
      tc.sort_order as category_order,
      random() as question_order
    from public.tryout_configurations tc
    cross join lateral (
      select q_inner.id
      from public.questions q_inner
      where q_inner.type = tc.type::question_type
        and q_inner.sub_category = tc.sub_category
      order by random()
      limit tc.question_count
    ) q
    where tc.is_active = true
  ),
  ordered_questions as (
    select
      question_id,
      row_number() over (order by category_order, question_order)::int as sort_order
    from selected_questions
  )
  insert into public.tryout_event_questions (event_id, question_id, sort_order)
  select p_event_id, question_id, sort_order
  from ordered_questions;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;
