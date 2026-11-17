INSERT INTO public.question_versions (question_id, version, snapshot, changed_by, change_reason, created_at)
SELECT
  q.id,
  q.version,
  jsonb_build_object('question', jsonb_build_object('question_code', q.question_code, 'program_id', q.program_id, 'track_id', q.track_id, 'subject_id', q.subject_id, 'question_type', q.question_type, 'stem', q.stem, 'difficulty', q.difficulty, 'cognitive_level', q.cognitive_level, 'source_type', q.source_type, 'source_reference', q.source_reference, 'estimated_seconds', q.estimated_seconds, 'stimulus_id', q.stimulus_id, 'stimulus_order', q.stimulus_order, 'response_config', q.response_config), 'options', coalesce((
      SELECT
        jsonb_agg(jsonb_build_object('id', qo.id, 'option_key', qo.option_key, 'content', qo.content, 'is_correct', qo.is_correct, 'score', qo.score, 'sort_order', qo.sort_order, 'image_url', qo.image_url, 'response_group', qo.response_group, 'response_group_order', qo.response_group_order, 'metadata', qo.metadata)
      ORDER BY qo.sort_order)
      FROM public.question_options qo
      WHERE
        qo.question_id = q.id), '[]'::jsonb), 'stimulus', CASE WHEN q.stimulus_id IS NULL THEN
      NULL
    ELSE
      (
        SELECT
          to_jsonb (qs)
        FROM public.question_stimuli qs
        WHERE
          qs.id = q.stimulus_id)
    END, 'explanations', coalesce((
      SELECT
        jsonb_agg(jsonb_build_object('format', qe.format, 'content', qe.content, 'version', qe.version, 'video_url', qe.video_url)
        ORDER BY qe.version)
      FROM public.question_explanations qe
      WHERE
        qe.question_id = q.id), '[]'::jsonb), 'knowledge_nodes', coalesce((
      SELECT
        jsonb_agg(jsonb_build_object('relation_type', qkn.relation_type, 'knowledge_node_id', qkn.knowledge_node_id)
        ORDER BY qkn.relation_type, qkn.knowledge_node_id)
      FROM public.question_knowledge_nodes qkn
    WHERE
      qkn.question_id = q.id), '[]'::jsonb)),
  q.author_id,
  'Schema V2 legacy CPNS/SKD published snapshot backfill for Drill compatibility',
  now()
FROM
  public.questions q
  JOIN public.tracks t ON t.id = q.track_id
    AND t.code = 'SKD'
  JOIN public.programs p ON p.id = q.program_id
    AND p.code = 'CPNS'
WHERE
  q.status IN ('approved', 'published')
  AND NOT EXISTS (
    SELECT
      1
    FROM
      public.question_versions qv
    WHERE
      qv.question_id = q.id
      AND qv.version = q.version)
  ON CONFLICT (question_id,
    version)
  DO NOTHING;
