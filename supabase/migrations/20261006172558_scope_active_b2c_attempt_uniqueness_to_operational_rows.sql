-- Replace the B2C active-attempt index so imported history is not treated as
-- a live operational session. Keep the legacy rows and their status untouched.
-- `migration_source` is explicit on imported history; missing metadata remains
-- eligible for enforcement, preserving compatibility with older Direct rows.
drop index if exists public.exam_attempts_one_active_b2c_distribution_context;

create unique index exam_attempts_one_active_b2c_distribution_context
  on public.exam_attempts(user_id, exam_id, (coalesce(metadata->>'eventId','')))
  where source='b2c'
    and assignment_id is null
    and metadata->>'migration_source' is distinct from 'production_legacy_rehearsal'
    and lower(status) in ('created','in_progress');
