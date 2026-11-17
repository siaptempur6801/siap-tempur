-- Milestone 3 / Slice 3.2: covering indexes for wrong-question state foreign keys.
CREATE INDEX IF NOT EXISTS idx_user_wrong_questions_user_track_id ON public.user_wrong_questions (user_track_id);

CREATE INDEX IF NOT EXISTS idx_user_wrong_questions_subject_id ON public.user_wrong_questions (subject_id);

CREATE INDEX IF NOT EXISTS idx_user_wrong_questions_knowledge_node_id ON public.user_wrong_questions (knowledge_node_id);

CREATE INDEX IF NOT EXISTS idx_user_wrong_questions_source_attempt_question_id ON public.user_wrong_questions (source_attempt_question_id);

CREATE INDEX IF NOT EXISTS idx_user_wrong_questions_last_source_attempt_id ON public.user_wrong_questions (last_source_attempt_id);

CREATE INDEX IF NOT EXISTS idx_wrong_question_reviews_question_id ON public.wrong_question_reviews (question_id);
