-- =============================================================================
-- MVP CPNS Instansi Managed Service — Fase 6 & 7: monitoring dan data export
--
-- Sumber: PRD §6.5 (monitoring), §6.6 (export data), §7.6 (ranking internal),
--         §7.7 (kolom export), §8 (non-fungsional), §14 langkah 7–8.
--
-- PEMISAHAN DATA ADALAH SYARAT, BUKAN KENYAMANAN
--   §12 menetapkan risikonya eksplisit ("data B2C dan instansi bercampur") dan §11
--   menjadikannya KPI: "0 data B2C tercampur ke export instansi" dan "0 data antar
--   instansi tercampur". Karena itu SETIAP query di sini memfilter
--   `source = 'organization'` DAN `organization_id`, dan tidak ada satu pun yang
--   mengandalkan penyaringan di sisi halaman.
--
-- RANKING INTERNAL, BUKAN LEADERBOARD NASIONAL
--   §7.6 menuntut ranking instansi tidak tercampur dengan leaderboard nasional.
--   Peringkat di sini dihitung ulang di dalam batch/instansi memakai
--   `row_number()` atas skor peserta instansi saja.
--
-- KENAPA SATU RPC UNTUK SELURUH EXPORT
--   §6.6 meminta empat bentuk unduhan (rekap, detail, ranking, no-show) dan
--   format utamanya XLSX — satu berkas berisi empat sheet. Mengambilnya dalam
--   satu panggilan berarti satu perjalanan ke database untuk satu berkas, bukan
--   empat.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Monitoring progres peserta. Permission: organization.manage.
--
--    Menggabungkan tiga sumber yang menjawab pertanyaan berbeda:
--      - peserta (siapa yang SEHARUSNYA ikut),
--      - attempt (siapa yang benar-benar mengerjakan),
--      - attempt_scores (bagaimana hasilnya per subjek).
--    Peserta yang belum pernah mengerjakan tetap muncul — justru merekalah yang
--    perlu terlihat pada monitoring.
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
                     order by a.attempt_number desc, a.created_at desc
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

-- -----------------------------------------------------------------------------
-- 2. Seluruh data export untuk satu instansi (opsional satu batch).
--    Permission: organization.manage.
--
--    Mengembalikan EMPAT kumpulan data sekaligus, masing-masing dengan daftar
--    kolomnya sendiri, supaya lapisan penyusun berkas tidak perlu tahu nama kolom
--    maupun aturan penyaringannya — keduanya ditentukan di sini, dekat datanya.
-- -----------------------------------------------------------------------------
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
                     order by ea.attempt_number desc, ea.created_at desc
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

revoke all on function public.admin_batch_monitoring(uuid) from public, anon;
revoke all on function public.admin_export_organization(uuid, uuid) from public, anon;
grant execute on function public.admin_batch_monitoring(uuid) to authenticated;
grant execute on function public.admin_export_organization(uuid, uuid) to authenticated;
