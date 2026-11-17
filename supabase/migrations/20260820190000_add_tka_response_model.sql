CREATE TABLE IF NOT EXISTS public.question_stimuli (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  stimulus_code text NOT NULL,
  program_id uuid NOT NULL REFERENCES public.programs (id) ON DELETE RESTRICT,
  track_id uuid NOT NULL REFERENCES public.tracks (id) ON DELETE RESTRICT,
  subject_id uuid NOT NULL REFERENCES public.subjects (id) ON DELETE RESTRICT,
  title text,
  content text NOT NULL,
  image_url text,
  source_reference text,
  status text NOT NULL DEFAULT 'draft',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (program_id, track_id, subject_id, stimulus_code)
);

CREATE INDEX IF NOT EXISTS idx_question_stimuli_catalog ON public.question_stimuli (program_id, track_id, subject_id);

CREATE INDEX IF NOT EXISTS idx_question_stimuli_status ON public.question_stimuli (status);

ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS stimulus_id uuid,
  ADD COLUMN IF NOT EXISTS stimulus_order integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS response_config jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT
      1
    FROM
      pg_constraint
    WHERE
      conname = 'questions_stimulus_id_fkey'
      AND conrelid = 'public.questions'::regclass) THEN
  ALTER TABLE public.questions
    ADD CONSTRAINT questions_stimulus_id_fkey FOREIGN KEY (stimulus_id) REFERENCES public.question_stimuli (id) ON DELETE SET NULL;
END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_questions_stimulus_id ON public.questions (stimulus_id);

ALTER TABLE public.question_options
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS response_group text,
  ADD COLUMN IF NOT EXISTS response_group_order integer,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_question_options_group ON public.question_options (question_id, response_group_order, sort_order);

ALTER TABLE public.question_stimuli ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.question_stimuli FROM anon, authenticated;
