CREATE OR REPLACE FUNCTION app_private.audit_question_workflow_change ()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $$
DECLARE
  v_action text;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    v_action := 'question.workflow.' || lower(NEW.status);
  ELSIF OLD.reviewer_id IS DISTINCT FROM NEW.reviewer_id THEN
    v_action := 'question.workflow.reviewer_changed';
  ELSE
    RETURN new;
  END IF;

  INSERT INTO public.audit_logs (actor_user_id, action, entity_type, entity_id, old_data, new_data)
    VALUES (auth.uid (), v_action, 'question', NEW.id, jsonb_build_object('status', OLD.status, 'reviewer_id', OLD.reviewer_id, 'version', OLD.version, 'published_at', OLD.published_at), jsonb_build_object('status', NEW.status, 'reviewer_id', NEW.reviewer_id, 'version', NEW.version, 'published_at', NEW.published_at));

  RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION app_private.audit_content_review_change ()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $$
DECLARE
  v_action text;
  v_entity_id uuid;
BEGIN
  v_entity_id := coalesce(NEW.entity_id, OLD.entity_id);

  IF tg_op = 'INSERT' THEN
    v_action := 'content.review.created';
  ELSIF OLD.reviewer_id IS DISTINCT FROM NEW.reviewer_id
      AND NEW.reviewer_id IS NOT NULL THEN
      v_action := 'content.review.assigned';
  ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
    v_action := 'content.review.' || lower(NEW.status);
  ELSE
    RETURN new;
  END IF;

  INSERT INTO public.audit_logs (actor_user_id, action, entity_type, entity_id, old_data, new_data)
    VALUES (auth.uid (), v_action, 'question', v_entity_id, CASE WHEN tg_op = 'INSERT' THEN
        NULL
      ELSE
        jsonb_build_object('review_id', OLD.id, 'review_stage', OLD.review_stage, 'review_round', OLD.review_round, 'reviewer_id', OLD.reviewer_id, 'status', OLD.status, 'notes', OLD.notes, 'question_version', OLD.question_version)
      END, jsonb_build_object('review_id', NEW.id, 'review_stage', NEW.review_stage, 'review_round', NEW.review_round, 'reviewer_id', NEW.reviewer_id, 'status', NEW.status, 'notes', NEW.notes, 'question_version', NEW.question_version));

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_question_workflow ON public.questions;

CREATE TRIGGER trg_audit_question_workflow
  AFTER UPDATE OF status,
  reviewer_id ON public.questions
  FOR EACH ROW
  WHEN (old.status IS DISTINCT FROM new.status OR old.reviewer_id IS DISTINCT FROM new.reviewer_id)
  EXECUTE FUNCTION app_private.audit_question_workflow_change ();

DROP TRIGGER IF EXISTS trg_audit_content_review ON public.content_reviews;

CREATE TRIGGER trg_audit_content_review
  AFTER INSERT OR UPDATE OF reviewer_id,
  status ON public.content_reviews
  FOR EACH ROW
  EXECUTE FUNCTION app_private.audit_content_review_change ();
