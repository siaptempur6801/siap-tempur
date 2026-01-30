-- Function to update streak
create or replace function update_user_streak()
returns trigger as $$
declare
  current_streak int;
  last_date date;
  today date := current_date;
begin
  -- Only run if status changed to completed
  if new.status = 'completed' and old.status != 'completed' then
    
    select streak_count, last_activity_date 
    into current_streak, last_date
    from profiles
    where id = new.user_id;
    
    if last_date is null then
       -- First time
       update profiles set streak_count = 1, last_activity_date = today where id = new.user_id;
    elsif last_date = today - 1 then
       -- Consecutive day
       update profiles set streak_count = current_streak + 1, last_activity_date = today where id = new.user_id;
    elsif last_date < today - 1 then
       -- Streak broken (unless freeze used - logic to be added later)
       update profiles set streak_count = 1, last_activity_date = today where id = new.user_id;
    elsif last_date = today then
       -- Already done today, just ensure date matches (idempotent)
       -- Do nothing to streak
    end if;
    
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger
create trigger on_session_complete
  after update on test_sessions
  for each row
  execute function update_user_streak();
