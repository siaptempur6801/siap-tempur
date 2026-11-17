-- Attempt numbers are scoped to an assessment, so compare creation time first
-- when exporting the participant's latest result across assignments.
create or replace function public.admin_export_organization(
    p_organization_id uuid,
    p_batch_id        uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
    v_actor uuid := auth.uid();
    v_org   public.organizations%rowtype;
begin
    if v_actor is null then
        raise exception 'Authentication required';
    end if;

    if not app_private.current_user_has_permission('organization.manage') then
        raise exception 'Organization manage permission required';
    end if;

    select * into v_org from public.organizations where id = p_organization_id;
    if not found then
        raise exception 'Organization not found';
    end if;

    return (
        with scoped as (
            select
                pt.id as participant_id,
                pt.participant_code,
                pt.full_name_snapshot,
                pt.email_snapshot,
                pt.phone_snapshot,
                pt.unit,
                pt.jabatan,
                pt.status as participant_status,
                pt.user_id,
                b.id as batch_id,
                b.code as batch_code,
                b.name as batch_name,
                a.id as attempt_id,
                a.status as attempt_status,
                a.started_at,
                a.submitted_at,
                a.duration_used_seconds,
                a.total_score,
                a.percentage,
                a.passed
              from public.organization_participants pt
              join public.organization_batches b on b.id = pt.batch_id
              left join lateral (
                    select ea.id, ea.status, ea.started_at, ea.submitted_at,
                           ea.duration_used_seconds, ea.total_score, ea.percentage, ea.passed
                      from public.exam_attempts ea
                     -- Penyaringan ganda: sumber DAN instansi. Inilah yang
                     -- menjamin KPI §11 "0 data B2C / antar instansi tercampur".
                     where ea.participant_id = pt.id
                       and ea.source = 'organization'
                       and ea.organization_id = p_organization_id
                     order by ea.created_at desc, ea.attempt_number desc
                     limit 1
              ) a on true
             where pt.organization_id = p_organization_id
               and (p_batch_id is null or pt.batch_id = p_batch_id)
        ),
        with_scores as (
            select
                sc.*,
                coalesce((select s.raw_score from public.attempt_scores s join public.subjects sub on sub.id = s.subject_id
                           where s.attempt_id = sc.attempt_id and sub.code = 'TWK'), 0) as twk_score,
                coalesce((select s.raw_score from public.attempt_scores s join public.subjects sub on sub.id = s.subject_id
                           where s.attempt_id = sc.attempt_id and sub.code = 'TIU'), 0) as tiu_score,
                coalesce((select s.raw_score from public.attempt_scores s join public.subjects sub on sub.id = s.subject_id
                           where s.attempt_id = sc.attempt_id and sub.code = 'TKP'), 0) as tkp_score
              from scoped sc
        ),
        ranked as (
            select ws.*,
                   case when ws.attempt_status = 'completed'
                        then rank() over (partition by ws.batch_id, (ws.attempt_status = 'completed')
                                          order by ws.total_score desc nulls last, ws.participant_code)
                        else null end as internal_rank
              from with_scores ws
        ),
        batch_summary as (
            select
                batch_id,
                batch_code,
                batch_name,
                count(*) as total_participants,
                count(*) filter (where attempt_id is not null) as total_present,
                count(*) filter (where attempt_status = 'completed') as total_completed,
                count(*) filter (where passed is true) as total_passed,
                round(avg(twk_score) filter (where attempt_status = 'completed'), 2) as avg_twk,
                round(avg(tiu_score) filter (where attempt_status = 'completed'), 2) as avg_tiu,
                round(avg(tkp_score) filter (where attempt_status = 'completed'), 2) as avg_tkp,
                round(avg(total_score) filter (where attempt_status = 'completed'), 2) as avg_total
              from ranked
             group by batch_id, batch_code, batch_name
        )
        select jsonb_build_object(
            'organization', jsonb_build_object('id', v_org.id, 'code', v_org.code, 'name', v_org.name),
            'generated_at', now(),
            'rekap', jsonb_build_object(
                'columns', jsonb_build_array(
                    'nama_instansi', 'nama_batch', 'total_peserta', 'total_hadir',
                    'total_selesai', 'total_lulus', 'rata_rata_twk', 'rata_rata_tiu',
                    'rata_rata_tkp', 'rata_rata_total'
                ),
                'rows', coalesce((
                    select jsonb_agg(jsonb_build_array(
                        v_org.name, bs.batch_name, bs.total_participants, bs.total_present,
                        bs.total_completed, bs.total_passed, bs.avg_twk, bs.avg_tiu,
                        bs.avg_tkp, bs.avg_total
                    ) order by bs.batch_name)
                      from batch_summary bs
                ), '[]'::jsonb)
            ),
            'detail', jsonb_build_object(
                'columns', jsonb_build_array(
                    'participant_code', 'full_name', 'email', 'phone', 'unit', 'jabatan',
                    'nama_instansi', 'nama_batch', 'status_ujian', 'waktu_mulai',
                    'waktu_selesai', 'durasi_detik', 'skor_twk', 'skor_tiu', 'skor_tkp',
                    'total_skor', 'status_lulus'
                ),
                'rows', coalesce((
                    select jsonb_agg(jsonb_build_array(
                        r.participant_code, r.full_name_snapshot, r.email_snapshot, r.phone_snapshot,
                        r.unit, r.jabatan, v_org.name, r.batch_name,
                        coalesce(r.attempt_status, r.participant_status),
                        r.started_at, r.submitted_at, r.duration_used_seconds,
                        r.twk_score, r.tiu_score, r.tkp_score, r.total_score,
                        case when r.passed is null then null when r.passed then 'Lulus' else 'Tidak lulus' end
                    ) order by r.batch_name, r.participant_code)
                      from ranked r
                ), '[]'::jsonb)
            ),
            'ranking', jsonb_build_object(
                'columns', jsonb_build_array(
                    'peringkat', 'participant_code', 'full_name', 'nama_batch',
                    'skor_twk', 'skor_tiu', 'skor_tkp', 'total_skor', 'status_lulus'
                ),
                'rows', coalesce((
                    select jsonb_agg(jsonb_build_array(
                        r.internal_rank, r.participant_code, r.full_name_snapshot, r.batch_name,
                        r.twk_score, r.tiu_score, r.tkp_score, r.total_score,
                        case when r.passed is null then null when r.passed then 'Lulus' else 'Tidak lulus' end
                    ) order by r.batch_name, r.internal_rank)
                      from ranked r
                     where r.internal_rank is not null
                ), '[]'::jsonb)
            ),
            'no_show', jsonb_build_object(
                'columns', jsonb_build_array(
                    'participant_code', 'full_name', 'email', 'phone', 'nama_batch',
                    'status_peserta', 'keterangan'
                ),
                'rows', coalesce((
                    select jsonb_agg(jsonb_build_array(
                        r.participant_code, r.full_name_snapshot, r.email_snapshot, r.phone_snapshot,
                        r.batch_name, r.participant_status,
                        case
                            when r.attempt_status = 'in_progress' then 'Sudah mulai, belum selesai'
                            when r.attempt_status is null then 'Belum mulai'
                            else null
                        end
                    ) order by r.batch_name, r.participant_code)
                      from ranked r
                     where r.attempt_status is distinct from 'completed'
                ), '[]'::jsonb)
            )
        )
    );
end;
$function$;
