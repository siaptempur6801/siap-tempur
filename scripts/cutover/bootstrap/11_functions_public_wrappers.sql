-- Generated from canonical staging lpgrivowdcepcxradavu via pg_get_functiondef().
-- Public runtime functions <= 1000 chars; CPNS migration-only helpers excluded.
-- DO NOT apply to production before explicit final GO.

CREATE OR REPLACE FUNCTION public.activate_user_track(p_program_code text, p_track_code text, p_target_year integer DEFAULT NULL::integer, p_school_name text DEFAULT NULL::text, p_school_grade text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  return app_private.activate_user_track_for_user(
    v_user,p_program_code,p_track_code,p_target_year,p_school_name,p_school_grade
  );
end;
$function$

CREATE OR REPLACE FUNCTION public.assign_question_reviewer(p_question_id uuid, p_reviewer_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$ select app_private.assign_question_reviewer(p_question_id, p_reviewer_id); $function$

CREATE OR REPLACE FUNCTION public.bulk_review_pilot_stage(p_batch text, p_decision text, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select app_private.bulk_review_pilot_stage(p_batch, p_decision, p_notes);
$function$

CREATE OR REPLACE FUNCTION public.claim_pilot_review_stage(p_batch text)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select app_private.claim_pilot_review_stage(p_batch);
$function$

CREATE OR REPLACE FUNCTION public.complete_exam_section(p_attempt_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_user uuid:=auth.uid(); begin
  if v_user is null then raise exception 'Authentication required'; end if;
  return app_private.complete_exam_section_for_user(v_user,p_attempt_id);
end;$function$

CREATE OR REPLACE FUNCTION public.generate_tka_smp_exam(p_exam_id uuid, p_seed text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not app_private.has_permission('exam.manage') then raise exception 'exam.manage permission required'; end if;
  return app_private.generate_tka_smp_exam(p_exam_id,p_seed);
end;$function$

CREATE OR REPLACE FUNCTION public.get_content_question_detail(p_question_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$ select app_private.get_content_question_detail(p_question_id); $function$

CREATE OR REPLACE FUNCTION public.get_exam_attempt_result(p_attempt_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_user uuid:=auth.uid(); begin
  if v_user is null then raise exception 'Authentication required'; end if;
  return app_private.get_exam_attempt_result_for_user(v_user,p_attempt_id);
end;$function$

CREATE OR REPLACE FUNCTION public.get_exam_attempt_review(p_attempt_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_user uuid:=auth.uid(); begin
  if v_user is null then raise exception 'Authentication required'; end if;
  return app_private.get_exam_attempt_review_for_user(v_user,p_attempt_id);
end;$function$

CREATE OR REPLACE FUNCTION public.get_exam_attempt_state(p_attempt_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_user uuid:=auth.uid(); begin
  if v_user is null then raise exception 'Authentication required'; end if;
  return app_private.get_exam_attempt_state_for_user(v_user,p_attempt_id);
end;$function$

CREATE OR REPLACE FUNCTION public.get_tka_smp_remedial_for_attempt(p_source_attempt_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid := auth.uid();
  v_session_id uuid;
begin
  if v_user is null then
    raise exception 'Authentication required';
  end if;

  select rs.id
    into v_session_id
  from public.remedial_sessions rs
  where rs.user_id = v_user
    and rs.source_attempt_id = p_source_attempt_id
  limit 1;

  if v_session_id is null then
    return jsonb_build_object('session', null, 'items', '[]'::jsonb);
  end if;

  return app_private.get_tka_smp_remedial_payload_for_user(v_user, v_session_id);
end;
$function$

CREATE OR REPLACE FUNCTION public.get_tka_smp_remedial_session(p_session_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Authentication required';
  end if;

  return app_private.get_tka_smp_remedial_payload_for_user(v_user, p_session_id);
end;
$function$

CREATE OR REPLACE FUNCTION public.get_user_authorization(p_user_id uuid, p_scope_type text DEFAULT NULL::text, p_scope_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$ select app_private.get_user_authorization(p_user_id,p_scope_type,p_scope_id); $function$

CREATE OR REPLACE FUNCTION public.grant_content_reviewer(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select app_private.grant_content_reviewer(p_user_id);
$function$

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  insert into public.profiles (id, full_name, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email,''), '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name')
  )
  on conflict (id) do nothing;
  return new;
end;
$function$

CREATE OR REPLACE FUNCTION public.is_tka_smp_monetization_enforced()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce((
    select ff.enabled
    from public.feature_flags ff
    where ff.key = 'tka.smp.monetization_enforcement'
  ), false);
$function$

CREATE OR REPLACE FUNCTION public.list_content_people()
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$ select app_private.list_content_people(); $function$

CREATE OR REPLACE FUNCTION public.publish_question(p_question_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$ select app_private.publish_question(p_question_id); $function$

CREATE OR REPLACE FUNCTION public.review_question_stage(p_question_id uuid, p_decision text, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$ select app_private.review_question_stage(p_question_id, p_decision, p_notes); $function$

CREATE OR REPLACE FUNCTION public.review_tka_smp_remedial_item(p_session_id uuid, p_item_id uuid, p_option_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Authentication required';
  end if;

  return app_private.review_tka_smp_remedial_item_for_user(
    v_user,
    p_session_id,
    p_item_id,
    p_option_ids
  );
end;
$function$

CREATE OR REPLACE FUNCTION public.review_wrong_question(p_wrong_question_id uuid, p_option_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Authentication required';
  end if;

  return app_private.review_wrong_question_for_user(v_user, p_wrong_question_id, p_option_ids);
end;
$function$

CREATE OR REPLACE FUNCTION public.save_exam_answer(p_attempt_question_id uuid, p_option_ids uuid[] DEFAULT NULL::uuid[], p_answer_value text DEFAULT NULL::text, p_time_spent_seconds integer DEFAULT 0, p_is_flagged boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_user uuid:=auth.uid(); begin
  if v_user is null then raise exception 'Authentication required'; end if;
  return app_private.save_exam_answer_for_user(v_user,p_attempt_question_id,p_option_ids,p_answer_value,p_time_spent_seconds,p_is_flagged);
end;$function$

CREATE OR REPLACE FUNCTION public.save_question_draft(p_question_id uuid, p_program_code text, p_track_code text, p_subject_code text, p_question_type text, p_stem text, p_difficulty text, p_cognitive_level text, p_estimated_seconds integer, p_source_reference text, p_stimulus_id uuid, p_explanation text, p_knowledge_node_id uuid, p_options jsonb, p_change_reason text)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select app_private.save_question_draft(
    p_question_id,p_program_code,p_track_code,p_subject_code,p_question_type,p_stem,p_difficulty,
    p_cognitive_level,p_estimated_seconds,p_source_reference,p_stimulus_id,p_explanation,p_knowledge_node_id,
    p_options,p_change_reason
  );
$function$

CREATE OR REPLACE FUNCTION public.set_articles_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$function$

CREATE OR REPLACE FUNCTION public.start_exam_attempt(p_exam_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_user uuid:=auth.uid(); begin
  if v_user is null then raise exception 'Authentication required'; end if;
  return app_private.start_exam_attempt_for_user(p_exam_id,v_user);
end;$function$

CREATE OR REPLACE FUNCTION public.submit_exam_attempt(p_attempt_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_user uuid:=auth.uid(); begin
  if v_user is null then raise exception 'Authentication required'; end if;
  return app_private.submit_exam_attempt_for_user(v_user,p_attempt_id);
end;$function$

CREATE OR REPLACE FUNCTION public.submit_question_for_review(p_question_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$ select app_private.submit_question_for_review(p_question_id); $function$
