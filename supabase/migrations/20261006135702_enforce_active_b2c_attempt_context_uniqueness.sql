-- One active B2C attempt per user, assessment, and Event reference.
-- The empty reference represents Direct; a populated reference represents one
-- specific Event. Organization attempts are protected by their existing index.
create unique index if not exists exam_attempts_one_active_b2c_distribution_context
  on public.exam_attempts(user_id, exam_id, (coalesce(metadata->>'eventId','')))
  where source='b2c'
    and assignment_id is null
    and lower(status) in ('created','in_progress');
