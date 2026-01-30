-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role, subscription_status, streak_count)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    'user',
    'free',
    0
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger execution
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();
