create or replace function app_private.audit_question_workflow_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_action text;
begin
  if old.status is distinct from new.status then
    v_action := 'question.workflow.' || lower(new.status);
  elsif old.reviewer_id is distinct from new.reviewer_id then
    v_action := 'question.workflow.reviewer_changed';
  else
    return new;
  end if;

  insert into public.audit_logs(actor_user_id, action, entity_type, entity_id, old_data, new_data)
  values (
    auth.uid(),
    v_action,
    'question',
    new.id,
    jsonb_build_object(
      'status', old.status,
      'reviewer_id', old.reviewer_id,
      'version', old.version,
      'published_at', old.published_at
    ),
    jsonb_build_object(
      'status', new.status,
      'reviewer_id', new.reviewer_id,
      'version', new.version,
      'published_at', new.published_at
    )
  );

  return new;
end;
$$;

create or replace function app_private.audit_content_review_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_action text;
  v_entity_id uuid;
begin
  v_entity_id := coalesce(new.entity_id, old.entity_id);

  if tg_op = 'INSERT' then
    v_action := 'content.review.created';
  elsif old.reviewer_id is distinct from new.reviewer_id and new.reviewer_id is not null then
    v_action := 'content.review.assigned';
  elsif old.status is distinct from new.status then
    v_action := 'content.review.' || lower(new.status);
  else
    return new;
  end if;

  insert into public.audit_logs(actor_user_id, action, entity_type, entity_id, old_data, new_data)
  values (
    auth.uid(),
    v_action,
    'question',
    v_entity_id,
    case when tg_op = 'INSERT' then null else jsonb_build_object(
      'review_id', old.id,
      'review_stage', old.review_stage,
      'review_round', old.review_round,
      'reviewer_id', old.reviewer_id,
      'status', old.status,
      'notes', old.notes,
      'question_version', old.question_version
    ) end,
    jsonb_build_object(
      'review_id', new.id,
      'review_stage', new.review_stage,
      'review_round', new.review_round,
      'reviewer_id', new.reviewer_id,
      'status', new.status,
      'notes', new.notes,
      'question_version', new.question_version
    )
  );

  return new;
end;
$$;

drop trigger if exists trg_audit_question_workflow on public.questions;
create trigger trg_audit_question_workflow
after update of status, reviewer_id on public.questions
for each row
when (old.status is distinct from new.status or old.reviewer_id is distinct from new.reviewer_id)
execute function app_private.audit_question_workflow_change();

drop trigger if exists trg_audit_content_review on public.content_reviews;
create trigger trg_audit_content_review
after insert or update of reviewer_id, status on public.content_reviews
for each row
execute function app_private.audit_content_review_change();
