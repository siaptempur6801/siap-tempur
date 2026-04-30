alter table public.test_answers
  add column if not exists option_order uuid[] null;
