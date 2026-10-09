-- READ ONLY. Run on the explicitly selected project and retain the output.
-- This inspects prerequisites; it does not repair ledger drift or apply DDL.
BEGIN READ ONLY;
SELECT current_user, current_database(), current_setting('server_version') AS server_version;
SELECT version, name FROM supabase_migrations.schema_migrations
WHERE version IN ('20261009060323', '20261009063825') ORDER BY version;
WITH expected(signature) AS (VALUES
    ('public.practice_completed_attempt_totals(uuid)'),
    ('public.practice_active_attempt_overviews(uuid)'),
    ('public.learner_exam_attempt_summaries(uuid[],boolean)'),
    ('public.learner_completed_attempt_totals()')
)
SELECT e.signature, p.oid IS NOT NULL AS installed, p.prosecdef, p.provolatile,
    p.proconfig, md5(pg_get_functiondef(p.oid)) AS definition_hash,
    CASE WHEN p.oid IS NOT NULL THEN has_function_privilege('anon', p.oid, 'EXECUTE') END AS anon_execute,
    CASE WHEN p.oid IS NOT NULL THEN has_function_privilege('authenticated', p.oid, 'EXECUTE') END AS learner_execute,
    CASE WHEN p.oid IS NOT NULL THEN has_function_privilege('service_role', p.oid, 'EXECUTE') END AS service_execute
FROM expected e LEFT JOIN pg_proc p ON p.oid = to_regprocedure(e.signature)
ORDER BY e.signature;
SELECT n.nspname AS schema, c.relname, c.relrowsecurity,
    has_table_privilege('authenticated', c.oid, 'INSERT, UPDATE, DELETE') AS learner_table_write,
    has_table_privilege('authenticated', c.oid, 'SELECT') AS learner_table_select,
    has_any_column_privilege('authenticated', c.oid, 'INSERT, UPDATE') AS learner_column_write,
    has_any_column_privilege('authenticated', c.oid, 'SELECT') AS learner_column_select
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname IN
    ('exam_attempts','attempt_answers','attempt_questions','question_versions','question_options','question_explanations')
ORDER BY c.relname;
SELECT n.nspname AS schema, p.proname, pg_get_function_identity_arguments(p.oid) AS args,
    p.prosecdef, p.proconfig, md5(pg_get_functiondef(p.oid)) AS definition_hash,
    has_function_privilege('authenticated',p.oid,'EXECUTE') AS learner_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname IN ('public','app_private') AND p.proname IN
    ('save_attempt_answer_for_user','save_tka_full_exam_answer_for_user','submit_exam_attempt_for_user',
     'fulfill_paid_order','recalculate_leaderboard','recalculate_event_rankings')
ORDER BY n.nspname, p.proname;
ROLLBACK;
