ALTER TABLE public.test_answers
  ADD COLUMN IF NOT EXISTS option_order uuid[] NULL;
