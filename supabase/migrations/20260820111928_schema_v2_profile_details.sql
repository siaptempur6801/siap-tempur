alter table public.profiles
  add column if not exists bio text,
  add column if not exists education_level text,
  add column if not exists target_instance text;

alter table public.profiles
  drop constraint if exists profiles_bio_length_check,
  add constraint profiles_bio_length_check check (bio is null or char_length(bio) <= 500),
  drop constraint if exists profiles_education_level_length_check,
  add constraint profiles_education_level_length_check check (education_level is null or char_length(education_level) <= 80),
  drop constraint if exists profiles_target_instance_length_check,
  add constraint profiles_target_instance_length_check check (target_instance is null or char_length(target_instance) <= 120);
