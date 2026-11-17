-- Ensure Tryout Akbar event questions receive a global 1..N order.
-- The previous generator used the blueprint/category sort_order for every
-- question in that category, so multiple questions could show the same number.
CREATE OR REPLACE FUNCTION public.generate_tryout_event_questions (p_event_id uuid)
  RETURNS int
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  inserted_count int;
BEGIN
  IF p_event_id IS NULL THEN
    RAISE EXCEPTION 'Event ID wajib diisi';
  END IF;

  IF NOT EXISTS (
    SELECT
      1
    FROM
      public.tryout_events
    WHERE
      id = p_event_id) THEN
  RAISE EXCEPTION 'Event tidak ditemukan';
END IF;

  DELETE FROM public.tryout_event_questions
  WHERE event_id = p_event_id;

  WITH selected_questions AS (
    SELECT
      q.id AS question_id,
      tc.sort_order AS category_order,
      random() AS question_order
    FROM
      public.tryout_configurations tc
    CROSS JOIN LATERAL (
      SELECT
        q_inner.id
      FROM
        public.questions q_inner
      WHERE
        q_inner.type = tc.type::question_type
        AND q_inner.sub_category = tc.sub_category
      ORDER BY
        random()
      LIMIT tc.question_count) q
  WHERE
    tc.is_active = TRUE
),
ordered_questions AS (
  SELECT
    question_id,
    row_number() OVER (ORDER BY category_order,
      question_order)::int AS sort_order
  FROM
    selected_questions)
INSERT INTO public.tryout_event_questions (event_id, question_id, sort_order)
SELECT
  p_event_id,
  question_id,
  sort_order
FROM
  ordered_questions;

  get diagnostics inserted_count = row_count;
  RETURN inserted_count;
END;
$$;
