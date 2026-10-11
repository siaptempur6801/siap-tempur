-- Function to update streak
CREATE OR REPLACE FUNCTION update_user_streak ()
  RETURNS TRIGGER
  AS $$
DECLARE
  current_streak int;
  last_date date;
  today date := CURRENT_DATE;
BEGIN
  -- Only run if status changed to completed
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    SELECT
      streak_count,
      last_activity_date
    INTO
      current_streak,
      last_date
    FROM
      profiles
    WHERE
      id = NEW.user_id;
    IF last_date IS NULL THEN
      -- First time
      UPDATE
        profiles
      SET
        streak_count = 1,
        last_activity_date = today
      WHERE
        id = NEW.user_id;
    ELSIF last_date = today - 1 THEN
      -- Consecutive day
      UPDATE
        profiles
      SET
        streak_count = current_streak + 1,
        last_activity_date = today
      WHERE
        id = NEW.user_id;
    ELSIF last_date < today - 1 THEN
      -- Streak broken (unless freeze used - logic to be added later)
      UPDATE
        profiles
      SET
        streak_count = 1,
        last_activity_date = today
      WHERE
        id = NEW.user_id;
    ELSIF last_date = today THEN
      -- Already done today, just ensure date matches (idempotent)
      -- Do nothing to streak
    END IF;
  END IF;
  RETURN new;
END;
$$
LANGUAGE plpgsql
SECURITY DEFINER;

-- Trigger
CREATE TRIGGER on_session_complete
  AFTER UPDATE ON test_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_streak ();
