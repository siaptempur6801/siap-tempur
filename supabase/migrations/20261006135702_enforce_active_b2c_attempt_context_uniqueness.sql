-- One active B2C attempt per user, assessment, and Event reference.
-- The empty reference represents Direct; a populated reference represents one
-- specific Event. Organization attempts are protected by their existing index.
CREATE UNIQUE INDEX IF NOT EXISTS exam_attempts_one_active_b2c_distribution_context ON public.exam_attempts (user_id, exam_id, (coalesce(metadata ->> 'eventId', '')))
WHERE
  source = 'b2c' AND assignment_id IS NULL AND lower(status) IN ('created', 'in_progress');
