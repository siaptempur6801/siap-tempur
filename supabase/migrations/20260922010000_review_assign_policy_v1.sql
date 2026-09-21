-- Review Queue — kebijakan penugasan reviewer (aturan C).
--
-- MASALAH
--   `assign_question_reviewer` hanya memeriksa `content.review` ATAU
--   `question.manage`, sehingga seorang CONTENT_REVIEWER dapat menugaskan soal
--   ke reviewer lain dan merebut review yang sudah dipegang orang lain.
--
-- ATURAN BARU
--   1. Klaim untuk diri sendiri: cukup `content.review`.
--   2. Menugaskan / memindahkan ke orang lain: wajib `content.assign` atau
--      `question.manage` (ADMIN/SUPER_ADMIN).
--   3. Review yang sudah dipegang reviewer lain tidak dapat direbut lewat klaim
--      diri; manager/assigner tetap boleh memindahkannya.
--
-- `claim_pilot_review_stage` (klaim massal) sudah self-only dan tidak berubah.
begin;

insert into public.permissions(code, name, description)
select 'content.assign', 'Assign Reviewer', 'Menugaskan atau memindahkan reviewer konten'
where not exists (select 1 from public.permissions where code='content.assign');

insert into public.role_permissions(role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code='content.assign'
where r.code in ('ADMIN','SUPER_ADMIN')
  and not exists (
    select 1 from public.role_permissions rp
    where rp.role_id=r.id and rp.permission_id=p.id
  );

create or replace function app_private.assign_question_reviewer(p_question_id uuid, p_reviewer_id uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_actor uuid := auth.uid();
  v_q public.questions%rowtype;
  v_stage text;
  v_review public.content_reviews%rowtype;
  v_reviewer_ok boolean;
  v_can_assign_others boolean;
begin
  if v_actor is null then raise exception 'Authentication required'; end if;
  if not app_private.current_user_has_permission('content.review')
     and not app_private.current_user_has_permission('question.manage')
     and not app_private.current_user_has_permission('content.assign') then
    raise exception 'Reviewer assignment permission required';
  end if;

  select * into v_q from public.questions where id=p_question_id for update;
  if not found then raise exception 'Question not found'; end if;

  if p_reviewer_id = v_q.author_id then
    raise exception 'Author cannot review their own question';
  end if;

  v_can_assign_others := app_private.current_user_has_permission('content.assign')
    or app_private.current_user_has_permission('question.manage');

  -- Menugaskan ke ORANG LAIN adalah aksi manajerial.
  if p_reviewer_id is distinct from v_actor and not v_can_assign_others then
    raise exception 'Reviewer assignment permission required';
  end if;

  select exists(
    select 1
    from public.profiles pr
    where pr.id=p_reviewer_id and pr.status='active'
  ) and exists(
    select 1
    from public.user_roles ur
    join public.role_permissions rp on rp.role_id=ur.role_id
    join public.permissions pe on pe.id=rp.permission_id
    where ur.user_id=p_reviewer_id and pe.code='content.review'
  ) into v_reviewer_ok;

  if not v_reviewer_ok then
    raise exception 'Target user is not an active content reviewer';
  end if;

  v_stage := case v_q.status
    when 'submitted' then 'editorial'
    when 'editorial_review' then 'editorial'
    when 'academic_review' then 'academic'
    when 'technical_qa' then 'technical_qa'
    else null end;

  if v_stage is null then
    raise exception 'Question cannot receive reviewer in status %', v_q.status;
  end if;

  select * into v_review
  from public.content_reviews
  where entity_type='question' and entity_id=p_question_id
    and review_stage=v_stage and status='pending'
  order by review_round desc, created_at desc
  limit 1
  for update;

  if v_review.id is null then
    raise exception 'No pending % review found', v_stage;
  end if;

  -- Klaim diri tidak boleh merebut review yang sudah dipegang reviewer lain.
  if p_reviewer_id = v_actor
     and v_review.reviewer_id is not null
     and v_review.reviewer_id is distinct from v_actor
     and not v_can_assign_others then
    raise exception 'Review is already assigned to another reviewer';
  end if;

  update public.content_reviews
     set reviewer_id=p_reviewer_id, assigned_at=now(), updated_at=now()
   where id=v_review.id;

  perform set_config('app.workflow_action', 'assign_reviewer', true);
  update public.questions
     set reviewer_id=p_reviewer_id,
         status=case when status='submitted' then 'editorial_review' else status end,
         updated_at=now()
   where id=p_question_id;

  return jsonb_build_object('question_id',p_question_id,'review_stage',v_stage,'review_round',v_review.review_round,'reviewer_id',p_reviewer_id);
end;
$function$;

notify pgrst,'reload schema';
commit;
