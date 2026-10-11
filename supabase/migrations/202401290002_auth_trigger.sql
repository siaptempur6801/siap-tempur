-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user ()
  RETURNS TRIGGER
  AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, streak_count)
    VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name', 0);
  RETURN new;
END;
$$
LANGUAGE plpgsql
SECURITY DEFINER;

-- Trigger execution
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user ();
