-- Generated from canonical staging lpgrivowdcepcxradavu.
-- 11 runtime public triggers only. auth.users.on_auth_user_created is an external invariant and is NOT recreated here.
-- DO NOT apply to production before explicit final GO.

CREATE TRIGGER set_articles_updated_at BEFORE UPDATE ON articles FOR EACH ROW EXECUTE FUNCTION set_articles_updated_at();
CREATE TRIGGER trg_audit_content_review AFTER INSERT OR UPDATE OF reviewer_id, status ON content_reviews FOR EACH ROW EXECUTE FUNCTION app_private.audit_content_review_change();
CREATE TRIGGER trg_exam_question_items_approved_only BEFORE INSERT OR UPDATE OF question_id, question_version, exam_id ON exam_question_items FOR EACH ROW EXECUTE FUNCTION app_private.guard_exam_question_item();
CREATE TRIGGER trg_audit_question_workflow AFTER UPDATE OF status, reviewer_id ON questions FOR EACH ROW WHEN (old.status IS DISTINCT FROM new.status OR old.reviewer_id IS DISTINCT FROM new.reviewer_id) EXECUTE FUNCTION app_private.audit_question_workflow_change();
CREATE TRIGGER trg_questions_workflow_guard BEFORE UPDATE ON questions FOR EACH ROW EXECUTE FUNCTION app_private.enforce_question_workflow_guard();
CREATE TRIGGER trg_tka_smp_readiness_after_progress_delete AFTER DELETE ON user_knowledge_progress REFERENCING OLD TABLE AS old_rows FOR EACH STATEMENT EXECUTE FUNCTION app_private.refresh_tka_smp_readiness_from_old_progress();
CREATE TRIGGER trg_tka_smp_readiness_after_progress_insert AFTER INSERT ON user_knowledge_progress REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION app_private.refresh_tka_smp_readiness_from_new_progress();
CREATE TRIGGER trg_tka_smp_readiness_after_progress_update AFTER UPDATE ON user_knowledge_progress REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION app_private.refresh_tka_smp_readiness_from_new_progress();
CREATE TRIGGER trg_tka_smp_recommendations_after_progress_delete AFTER DELETE ON user_knowledge_progress REFERENCING OLD TABLE AS old_rows FOR EACH STATEMENT EXECUTE FUNCTION app_private.refresh_tka_smp_recommendations_from_old_progress();
CREATE TRIGGER trg_tka_smp_recommendations_after_progress_insert AFTER INSERT ON user_knowledge_progress REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION app_private.refresh_tka_smp_recommendations_from_new_progress();
CREATE TRIGGER trg_tka_smp_recommendations_after_progress_update AFTER UPDATE ON user_knowledge_progress REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION app_private.refresh_tka_smp_recommendations_from_new_progress();

-- Remove the bootstrap-only CREATE privilege before canonical ACL normalization.
REVOKE CREATE ON SCHEMA public FROM postgres;
