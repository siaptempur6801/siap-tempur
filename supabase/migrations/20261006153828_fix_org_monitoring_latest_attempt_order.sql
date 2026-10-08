-- Attempt numbers are scoped to an assessment. Monitoring one row per
-- participant must select by creation time across different assignments.
-- -----------------------------------------------------------------------------
create or replace function public.admin_batch_monitoring(p_batch_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
    v_actor uuid := auth.uid();
    v_batch public.organization_batches%rowtype;
begin
    if v_actor is null then
        raise exception 'Authentication required';
    end if;

    if not app_private.current_user_has_permission('organization.manage') then
        raise exception 'Organization manage permission required';
    end if;

    select * into v_batch from public.organization_batches where id = p_batch_id;
    if not found then
        raise exception 'Batch not found';
    end if;

    return (
        with participants as (
            select
                p.id,
                p.participant_code,
                p.full_name_snapshot,
                p.email_snapshot,
                p.phone_snapshot,
                p.unit,
                p.status as participant_status,
                p.user_id,
                -- Attempt terbaru peserta ini PADA BATCH INI. Peserta bisa
                -- mengerjakan lebih dari sekali bila template mengizinkannya.
                (
                    select a.id from public.exam_attempts a
                     where a.participant_id = p.id
                       and a.source = 'organization'
                       and a.organization_id = v_batch.organization_id
                       and a.batch_id = p_batch_id
                     order by a.created_at desc, a.attempt_number desc
                     limit 1
                ) as attempt_id
              from public.organization_participants p
             where p.batch_id = p_batch_id
        ),
        scored as (
            select
                pt.*,
                a.status as attempt_status,
                a.started_at,
                a.submitted_at,
                a.duration_used_seconds,
                a.total_score,
                a.percentage,
                a.passed,
                coalesce((
                    select s.raw_score from public.attempt_scores s
                     join public.subjects sub on sub.id = s.subject_id
                     where s.attempt_id = pt.attempt_id and sub.code = 'TWK'
                ), 0) as twk_score,
                coalesce((
                    select s.raw_score from public.attempt_scores s
                     join public.subjects sub on sub.id = s.subject_id
                     where s.attempt_id = pt.attempt_id and sub.code = 'TIU'
                ), 0) as tiu_score,
                coalesce((
                    select s.raw_score from public.attempt_scores s
                     join public.subjects sub on sub.id = s.subject_id
                     where s.attempt_id = pt.attempt_id and sub.code = 'TKP'
                ), 0) as tkp_score
              from participants pt
              left join public.exam_attempts a on a.id = pt.attempt_id
        ),
        ranked as (
            select
                sc.*,
                -- Peringkat dihitung ULANG di dalam batch ini saja (§7.6).
                --
                -- Memakai `rank()`, bukan `row_number()`: dua peserta dengan skor
                -- sama seharusnya berbagi peringkat, dan `row_number()` akan
                -- memaksakan urutan semu berdasarkan kode peserta.
                --
                -- `partition by (… = 'completed')` dipakai karena `FILTER` TIDAK
                -- berlaku untuk fungsi window — hanya untuk agregat. Peserta yang
                -- belum selesai masuk partisi lain, dan nilainya di-null-kan.
                case
                    when sc.attempt_status = 'completed' then
                        rank() over (
                            partition by (sc.attempt_status = 'completed')
                            order by sc.total_score desc nulls last, sc.participant_code
                        )
                    else null
                end as internal_rank
              from scored sc
        )
        select jsonb_build_object(
            'batch', jsonb_build_object(
                'id', v_batch.id,
                'code', v_batch.code,
                'name', v_batch.name,
                'status', v_batch.status
            ),
            'summary', jsonb_build_object(
                'total', count(*),
                'linked', count(*) filter (where user_id is not null),
                'not_started', count(*) filter (where attempt_id is null),
                'in_progress', count(*) filter (where attempt_status = 'in_progress'),
                'completed', count(*) filter (where attempt_status = 'completed'),
                'passed', count(*) filter (where passed is true),
                'withdrawn', count(*) filter (where participant_status = 'withdrawn')
            ),
            'participants', coalesce(jsonb_agg(jsonb_build_object(
                'participant_id', id,
                'participant_code', participant_code,
                'full_name', full_name_snapshot,
                'email', email_snapshot,
                'phone', phone_snapshot,
                'unit', unit,
                'participant_status', participant_status,
                'linked', user_id is not null,
                'attempt_status', attempt_status,
                'started_at', started_at,
                'submitted_at', submitted_at,
                'duration_seconds', duration_used_seconds,
                'twk_score', twk_score,
                'tiu_score', tiu_score,
                'tkp_score', tkp_score,
                'total_score', total_score,
                'percentage', percentage,
                'passed', passed,
                'internal_rank', internal_rank
            ) order by participant_code), '[]'::jsonb)
        )
        from ranked
    );
end;
$function$;
