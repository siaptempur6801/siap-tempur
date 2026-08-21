-- Milestone 3 / Slice 3.2: covering indexes for wrong-question state foreign keys.
create index if not exists idx_user_wrong_questions_user_track_id
  on public.user_wrong_questions(user_track_id);
create index if not exists idx_user_wrong_questions_subject_id
  on public.user_wrong_questions(subject_id);
create index if not exists idx_user_wrong_questions_knowledge_node_id
  on public.user_wrong_questions(knowledge_node_id);
create index if not exists idx_user_wrong_questions_source_attempt_question_id
  on public.user_wrong_questions(source_attempt_question_id);
create index if not exists idx_user_wrong_questions_last_source_attempt_id
  on public.user_wrong_questions(last_source_attempt_id);
create index if not exists idx_wrong_question_reviews_question_id
  on public.wrong_question_reviews(question_id);
