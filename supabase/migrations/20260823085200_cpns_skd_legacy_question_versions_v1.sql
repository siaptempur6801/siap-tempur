insert into public.question_versions(question_id,version,snapshot,changed_by,change_reason,created_at)
select
  q.id,
  q.version,
  jsonb_build_object(
    'question', jsonb_build_object(
      'question_code',q.question_code,
      'program_id',q.program_id,
      'track_id',q.track_id,
      'subject_id',q.subject_id,
      'question_type',q.question_type,
      'stem',q.stem,
      'difficulty',q.difficulty,
      'cognitive_level',q.cognitive_level,
      'source_type',q.source_type,
      'source_reference',q.source_reference,
      'estimated_seconds',q.estimated_seconds,
      'stimulus_id',q.stimulus_id,
      'stimulus_order',q.stimulus_order,
      'response_config',q.response_config
    ),
    'options', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id',qo.id,
          'option_key',qo.option_key,
          'content',qo.content,
          'is_correct',qo.is_correct,
          'score',qo.score,
          'sort_order',qo.sort_order,
          'image_url',qo.image_url,
          'response_group',qo.response_group,
          'response_group_order',qo.response_group_order,
          'metadata',qo.metadata
        ) order by qo.sort_order
      ) from public.question_options qo where qo.question_id=q.id
    ),'[]'::jsonb),
    'stimulus', case when q.stimulus_id is null then null else (
      select to_jsonb(qs) from public.question_stimuli qs where qs.id=q.stimulus_id
    ) end,
    'explanations', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'format',qe.format,
          'content',qe.content,
          'version',qe.version,
          'video_url',qe.video_url
        ) order by qe.version
      ) from public.question_explanations qe where qe.question_id=q.id
    ),'[]'::jsonb),
    'knowledge_nodes', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'relation_type',qkn.relation_type,
          'knowledge_node_id',qkn.knowledge_node_id
        ) order by qkn.relation_type,qkn.knowledge_node_id
      ) from public.question_knowledge_nodes qkn where qkn.question_id=q.id
    ),'[]'::jsonb)
  ),
  q.author_id,
  'Schema V2 legacy CPNS/SKD published snapshot backfill for Drill compatibility',
  now()
from public.questions q
join public.tracks t on t.id=q.track_id and t.code='SKD'
join public.programs p on p.id=q.program_id and p.code='CPNS'
where q.status in ('approved','published')
  and not exists (
    select 1 from public.question_versions qv where qv.question_id=q.id and qv.version=q.version
  )
on conflict (question_id,version) do nothing;
