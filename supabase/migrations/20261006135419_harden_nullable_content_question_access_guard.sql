-- Close the SQL NULL bypass in the production answer-key guard.
-- `author_id = v_actor` and `reviewer_id = v_actor` are NULL when the row has
-- no author/reviewer. In PL/pgSQL, `IF NOT NULL` does not enter the branch.
-- Treat NULL as an explicit denial while preserving author/reviewer and
-- content-workspace access.

create or replace function app_private.get_content_question_detail(p_question_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_actor uuid := auth.uid();
  v_q public.questions%rowtype;
  v_allowed boolean;
  v_result jsonb;
begin
  if v_actor is null then raise exception 'Authentication required'; end if;
  select * into v_q from public.questions where id=p_question_id;
  if not found then raise exception 'Question not found'; end if;

  v_allowed :=
    v_q.author_id = v_actor
    or v_q.reviewer_id = v_actor
    or app_private.current_user_has_permission('admin.access')
    or app_private.current_user_has_permission('question.manage')
    or app_private.current_user_has_permission('content.read')
    or app_private.current_user_has_permission('content.create')
    or app_private.current_user_has_permission('content.update')
    or app_private.current_user_has_permission('content.review')
    or app_private.current_user_has_permission('content.publish');
  if coalesce(v_allowed,false) is not true then
    raise exception 'Question detail access denied';
  end if;

  select jsonb_build_object(
    'question',to_jsonb(v_q),
    'options',coalesce((select jsonb_agg(to_jsonb(o) order by o.sort_order) from public.question_options o where o.question_id=v_q.id),'[]'::jsonb),
    'explanation',(select to_jsonb(e) from public.question_explanations e where e.question_id=v_q.id order by e.version desc,e.created_at desc limit 1),
    'stimulus',(select to_jsonb(s) from public.question_stimuli s where s.id=v_q.stimulus_id),
    'knowledge_mappings',coalesce((select jsonb_agg(to_jsonb(qk)) from public.question_knowledge_nodes qk where qk.question_id=v_q.id),'[]'::jsonb),
    'knowledge_nodes',coalesce((select jsonb_agg(to_jsonb(k) order by k.depth,k.sort_order,k.name) from public.knowledge_nodes k where k.id in (select qk.knowledge_node_id from public.question_knowledge_nodes qk where qk.question_id=v_q.id)),'[]'::jsonb),
    'versions',coalesce((select jsonb_agg(to_jsonb(v) order by v.version desc) from public.question_versions v where v.question_id=v_q.id),'[]'::jsonb),
    'reviews',coalesce((select jsonb_agg(to_jsonb(r) order by r.review_round desc,r.created_at desc) from public.content_reviews r where r.entity_type='question' and r.entity_id=v_q.id),'[]'::jsonb),
    'audit_logs',coalesce((select jsonb_agg(to_jsonb(a) order by a.created_at desc) from (select * from public.audit_logs a where a.entity_type='question' and a.entity_id=v_q.id order by a.created_at desc limit 100) a),'[]'::jsonb),
    'stimulus_candidates',coalesce((select jsonb_agg(to_jsonb(s) order by s.updated_at desc) from (select * from public.question_stimuli s where s.program_id=v_q.program_id and s.track_id=v_q.track_id and s.subject_id=v_q.subject_id order by s.updated_at desc limit 100) s),'[]'::jsonb),
    'subject_knowledge_nodes',coalesce((select jsonb_agg(to_jsonb(k) order by k.depth,k.sort_order,k.name) from public.knowledge_nodes k where k.subject_id=v_q.subject_id and upper(k.status)='ACTIVE'),'[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$function$;
