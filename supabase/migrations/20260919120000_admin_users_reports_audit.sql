-- =============================================================================
-- Modul admin: Users & Roles, Reports, Audit Log
--
-- LATAR
--   Tujuh peran ada di database, tetapi hanya empat yang punya tempat mendarat:
--   SUPER_ADMIN dan ADMIN (semua modul), CONTENT_EDITOR dan CONTENT_REVIEWER
--   (lewat Review Queue). Tiga sisanya tidak:
--
--     FINANCE       admin.access, order.read, payment.manage, report.read,
--                   entitlement.manage  -> hanya Commerce yang punya halaman
--     SUPPORT       admin.access, user.read, user.manage, order.read
--                   -> TIDAK ADA halaman user management sama sekali
--     SCHOOL_ADMIN  organization.manage, report.read
--                   -> tanpa admin.access, jadi dilempar ke /cpns/dashboard
--
--   Akibatnya sejumlah permission (`user.read`, `user.manage`, `role.manage`,
--   `audit.read`, `report.read`, `organization.manage`, `entitlement.manage`)
--   tidak punya UI apa pun, dan `SCHOOL_ADMIN` mengalami dead-end navigation.
--
-- KENAPA RPC, BUKAN SELECT LANGSUNG
--   `user_roles`, `roles`, `permissions`, dan `audit_logs` mengaktifkan RLS
--   TANPA satu pun policy — jadi `authenticated` tidak bisa membacanya sama
--   sekali (deny by default). `profiles` pun hanya punya policy
--   `id = auth.uid() OR has_permission('admin.access')`, yang tidak mengenal
--   `user.read`. Konsisten dengan arsitektur RPC-first repo ini, seluruh akses
--   lewat fungsi SECURITY DEFINER yang memeriksa permission di dalamnya.
--
-- PENJAGA ANTI-LOCKOUT
--   Operasi tulis di sini bisa mencabut akses admin dari seseorang — termasuk
--   dari diri sendiri. Tiga penjaga ditanam di DATABASE, bukan di UI:
--     1. tidak boleh mencabut peran sendiri;
--     2. tidak boleh menonaktifkan akun sendiri;
--     3. tidak boleh menghilangkan SUPER_ADMIN terakhir (atau yang terakhir aktif).
--   Ketiganya ditegakkan di dalam fungsi supaya tidak bisa dilewati lewat
--   server action, API, maupun SQL langsung.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Daftar pengguna + peran + status.
--    Permission: user.read atau user.manage.
--    `total` dihitung lewat window function supaya tabel hanya dipindai sekali.
-- -----------------------------------------------------------------------------
create or replace function public.admin_list_users(
    p_search text default null,
    p_role   text default null,
    p_status text default null,
    p_limit  integer default 50,
    p_offset integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
    v_actor uuid := auth.uid();
    v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 200);
    v_offset integer := greatest(coalesce(p_offset, 0), 0);
    v_rows jsonb;
    v_total integer := 0;
begin
    if v_actor is null then
        raise exception 'Authentication required';
    end if;

    if not (
        app_private.current_user_has_permission('user.read')
        or app_private.current_user_has_permission('user.manage')
    ) then
        raise exception 'User read permission required';
    end if;

    with filtered as (
        select
            pr.id,
            pr.full_name,
            pr.display_name,
            pr.status,
            pr.created_at,
            pr.onboarding_completed,
            au.email::text as email,
            au.last_sign_in_at,
            coalesce((
                select jsonb_agg(distinct r.code order by r.code)
                  from public.user_roles ur
                  join public.roles r on r.id = ur.role_id
                 where ur.user_id = pr.id
            ), '[]'::jsonb) as roles,
            (
                select count(*)
                  from public.exam_attempts a
                 where a.user_id = pr.id
            ) as attempt_count
          from public.profiles pr
          left join auth.users au on au.id = pr.id
         where (p_search is null or p_search = ''
                or pr.full_name ilike '%' || p_search || '%'
                or pr.display_name ilike '%' || p_search || '%'
                or au.email ilike '%' || p_search || '%')
           and (p_status is null or p_status = '' or pr.status = p_status)
           and (p_role is null or p_role = '' or exists (
                select 1
                  from public.user_roles ur
                  join public.roles r on r.id = ur.role_id
                 where ur.user_id = pr.id and r.code = p_role
           ))
    ), paged as (
        select f.*, count(*) over () as total_count
          from filtered f
         order by f.created_at desc, f.id
         limit v_limit offset v_offset
    )
    select
        coalesce(jsonb_agg(to_jsonb(paged) - 'total_count'), '[]'::jsonb),
        coalesce(max(paged.total_count), 0)
      into v_rows, v_total
      from paged;

    return jsonb_build_object('users', v_rows, 'total', v_total, 'limit', v_limit, 'offset', v_offset);
end;
$function$;

-- -----------------------------------------------------------------------------
-- 2. Daftar peran beserta permission dan jumlah pemegangnya.
--    Permission: user.read, user.manage, atau role.manage.
-- -----------------------------------------------------------------------------
create or replace function public.admin_list_roles()
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
    v_actor uuid := auth.uid();
    v_rows jsonb;
begin
    if v_actor is null then
        raise exception 'Authentication required';
    end if;

    if not (
        app_private.current_user_has_permission('user.read')
        or app_private.current_user_has_permission('user.manage')
        or app_private.current_user_has_permission('role.manage')
    ) then
        raise exception 'Role read permission required';
    end if;

    select coalesce(jsonb_agg(role_row order by role_row->>'code'), '[]'::jsonb) into v_rows
      from (
        select jsonb_build_object(
            'code', r.code,
            'name', r.name,
            'description', r.description,
            'permissions', coalesce((
                select jsonb_agg(p.code order by p.code)
                  from public.role_permissions rp
                  join public.permissions p on p.id = rp.permission_id
                 where rp.role_id = r.id
            ), '[]'::jsonb),
            'holder_count', (
                select count(distinct ur.user_id)
                  from public.user_roles ur
                 where ur.role_id = r.id
            )
        ) as role_row
          from public.roles r
      ) x;

    return jsonb_build_object('roles', v_rows);
end;
$function$;

-- -----------------------------------------------------------------------------
-- 3. Beri peran ke pengguna. Permission: role.manage.
--    Idempoten: memberi peran yang sudah dimiliki tidak menambah baris ganda.
-- -----------------------------------------------------------------------------
create or replace function public.admin_assign_user_role(p_user_id uuid, p_role_code text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
    v_actor uuid := auth.uid();
    v_role_id uuid;
    v_role_code text;
    v_inserted integer := 0;
begin
    if v_actor is null then
        raise exception 'Authentication required';
    end if;

    if not app_private.current_user_has_permission('role.manage') then
        raise exception 'Role manage permission required';
    end if;

    if p_user_id is null then
        raise exception 'User is required';
    end if;

    select id, code into v_role_id, v_role_code
      from public.roles where code = upper(trim(coalesce(p_role_code, '')));
    if v_role_id is null then
        raise exception 'Unknown role';
    end if;

    if not exists (select 1 from public.profiles where id = p_user_id) then
        raise exception 'User profile not found';
    end if;

    insert into public.user_roles (user_id, role_id)
    select p_user_id, v_role_id
     where not exists (
        select 1 from public.user_roles
         where user_id = p_user_id and role_id = v_role_id
           and scope_type is null and scope_id is null
     );
    get diagnostics v_inserted = row_count;

    return jsonb_build_object(
        'user_id', p_user_id,
        'role', v_role_code,
        'granted', v_inserted > 0,
        'already_held', v_inserted = 0
    );
end;
$function$;

-- -----------------------------------------------------------------------------
-- 4. Cabut peran dari pengguna. Permission: role.manage.
--    PENJAGA: tidak boleh mencabut peran sendiri, dan tidak boleh menghilangkan
--    SUPER_ADMIN terakhir.
-- -----------------------------------------------------------------------------
create or replace function public.admin_revoke_user_role(p_user_id uuid, p_role_code text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
    v_actor uuid := auth.uid();
    v_role_id uuid;
    v_role_code text;
    v_deleted integer := 0;
    v_remaining integer;
begin
    if v_actor is null then
        raise exception 'Authentication required';
    end if;

    if not app_private.current_user_has_permission('role.manage') then
        raise exception 'Role manage permission required';
    end if;

    select id, code into v_role_id, v_role_code
      from public.roles where code = upper(trim(coalesce(p_role_code, '')));
    if v_role_id is null then
        raise exception 'Unknown role';
    end if;

    -- Penjaga 1: jangan biarkan admin mengunci dirinya sendiri.
    if p_user_id = v_actor then
        raise exception 'Cannot revoke your own role';
    end if;

    -- Penjaga 2: SUPER_ADMIN terakhir tidak boleh hilang.
    if v_role_code = 'SUPER_ADMIN' then
        select count(distinct ur.user_id) into v_remaining
          from public.user_roles ur
         where ur.role_id = v_role_id
           and ur.user_id <> p_user_id;

        if v_remaining = 0 then
            raise exception 'Cannot remove the last SUPER_ADMIN';
        end if;
    end if;

    delete from public.user_roles
     where user_id = p_user_id and role_id = v_role_id
       and scope_type is null and scope_id is null;
    get diagnostics v_deleted = row_count;

    return jsonb_build_object(
        'user_id', p_user_id,
        'role', v_role_code,
        'revoked', v_deleted > 0
    );
end;
$function$;

-- -----------------------------------------------------------------------------
-- 5. Ubah status akun. Permission: user.manage.
--    PENJAGA: tidak boleh menonaktifkan akun sendiri, dan tidak boleh
--    menonaktifkan SUPER_ADMIN aktif terakhir.
-- -----------------------------------------------------------------------------
create or replace function public.admin_set_user_status(p_user_id uuid, p_status text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
    v_actor uuid := auth.uid();
    v_status text := lower(trim(coalesce(p_status, '')));
    v_previous text;
    v_active_supers integer;
begin
    if v_actor is null then
        raise exception 'Authentication required';
    end if;

    if not app_private.current_user_has_permission('user.manage') then
        raise exception 'User manage permission required';
    end if;

    if v_status not in ('active', 'inactive', 'suspended') then
        raise exception 'Invalid user status';
    end if;

    select status into v_previous from public.profiles where id = p_user_id;
    if v_previous is null then
        raise exception 'User profile not found';
    end if;

    if p_user_id = v_actor and v_status <> 'active' then
        raise exception 'Cannot deactivate your own account';
    end if;

    -- Penjaga ini HANYA berlaku bila target memang SUPER_ADMIN.
    --
    -- Versi pertama fungsi ini lupa memeriksa hal itu dan langsung menghitung
    -- "berapa SUPER_ADMIN aktif selain target". Di lingkungan yang tidak punya
    -- SUPER_ADMIN sama sekali (staging), hasilnya selalu 0 — sehingga
    -- menonaktifkan pengguna BIASA pun ditolak dengan alasan yang menyesatkan.
    -- Ketahuan hanya karena fungsinya benar-benar dipanggil, bukan sekadar
    -- dibuat.
    if v_status <> 'active'
       and v_previous = 'active'
       and exists (
           select 1
             from public.user_roles ur
             join public.roles r on r.id = ur.role_id
            where ur.user_id = p_user_id and r.code = 'SUPER_ADMIN'
       )
    then
        select count(distinct pr.id) into v_active_supers
          from public.profiles pr
          join public.user_roles ur on ur.user_id = pr.id
          join public.roles r on r.id = ur.role_id
         where r.code = 'SUPER_ADMIN'
           and pr.status = 'active'
           and pr.id <> p_user_id;

        if v_active_supers = 0 then
            raise exception 'Cannot deactivate the last active SUPER_ADMIN';
        end if;
    end if;

    update public.profiles
       set status = v_status,
           updated_at = now()
     where id = p_user_id;

    return jsonb_build_object(
        'user_id', p_user_id,
        'previous_status', v_previous,
        'status', v_status
    );
end;
$function$;

-- -----------------------------------------------------------------------------
-- 6. Ringkasan laporan lintas modul. Permission: report.read.
--    Angka dihitung dari tabel sumber, bukan tabel ringkasan yang bisa basi.
--
--    CATATAN NAMA TABEL/KOLOM: tabelnya `exam_attempts` (bukan `attempts`),
--    sertifikat memakai `issued_at` (bukan `created_at`), dan order memakai
--    `total_amount` (bukan `amount`). Ketiganya diverifikasi ke katalog
--    information_schema sebelum migration ini ditulis.
-- -----------------------------------------------------------------------------
create or replace function public.admin_report_overview(p_program_code text default 'CPNS', p_track_code text default 'SKD')
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
    v_actor uuid := auth.uid();
    v_program uuid;
    v_track uuid;
begin
    if v_actor is null then
        raise exception 'Authentication required';
    end if;

    if not app_private.current_user_has_permission('report.read') then
        raise exception 'Report read permission required';
    end if;

    select id into v_program from public.programs where code = upper(trim(coalesce(p_program_code, 'CPNS')));
    select id into v_track from public.tracks
     where code = upper(trim(coalesce(p_track_code, 'SKD')))
       and (v_program is null or program_id = v_program);

    return jsonb_build_object(
        'context', jsonb_build_object(
            'program', upper(trim(coalesce(p_program_code, 'CPNS'))),
            'track', upper(trim(coalesce(p_track_code, 'SKD'))),
            'resolved', (v_program is not null and v_track is not null)
        ),
        'users', jsonb_build_object(
            'total', (select count(*) from public.profiles),
            'active', (select count(*) from public.profiles where status = 'active'),
            'onboarded', (select count(*) from public.profiles where onboarding_completed),
            'new_last_30d', (select count(*) from public.profiles where created_at > now() - interval '30 days')
        ),
        'attempts', jsonb_build_object(
            'total', (select count(*) from public.exam_attempts),
            'last_30d', (select count(*) from public.exam_attempts where started_at > now() - interval '30 days'),
            'in_progress', (select count(*) from public.exam_attempts where status = 'in_progress'),
            'completed', (select count(*) from public.exam_attempts where status = 'completed')
        ),
        'certificates', jsonb_build_object(
            'total', (select count(*) from public.certificates),
            'last_30d', (select count(*) from public.certificates where issued_at > now() - interval '30 days')
        ),
        'events', jsonb_build_object(
            'total', (select count(*) from public.events),
            'active', (select count(*) from public.events where status in ('active','published','registration_open')),
            'registrations', (select count(*) from public.event_registrations)
        ),
        'orders', jsonb_build_object(
            'total', (select count(*) from public.orders),
            'paid', (select count(*) from public.orders where status = 'paid'),
            'pending', (select count(*) from public.orders where status = 'pending'),
            'revenue_paid', (select coalesce(sum(total_amount), 0) from public.orders where status = 'paid')
        ),
        'content', jsonb_build_object(
            'questions_total', (select count(*) from public.questions),
            'questions_published', (select count(*) from public.questions where status = 'published'),
            'questions_draft', (select count(*) from public.questions where status = 'draft'),
            'awaiting_review', (select count(*) from public.questions where status in ('submitted','editorial_review','academic_review','technical_qa')),
            'articles_published', (select count(*) from public.articles where status = 'published')
        )
    );
end;
$function$;

-- -----------------------------------------------------------------------------
-- 7. Jejak audit. Permission: audit.read.
--    `old_data`/`new_data` dapat memuat isi soal, jadi penyaringan dilakukan di
--    database dan jumlah baris dibatasi.
-- -----------------------------------------------------------------------------
create or replace function public.admin_list_audit_logs(
    p_action      text default null,
    p_entity_type text default null,
    p_actor_id    uuid default null,
    p_limit       integer default 50,
    p_offset      integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
    v_actor uuid := auth.uid();
    v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 200);
    v_offset integer := greatest(coalesce(p_offset, 0), 0);
    v_rows jsonb;
    v_total integer := 0;
begin
    if v_actor is null then
        raise exception 'Authentication required';
    end if;

    if not app_private.current_user_has_permission('audit.read') then
        raise exception 'Audit read permission required';
    end if;

    with filtered as (
        select
            al.id,
            al.action,
            al.entity_type,
            al.entity_id,
            al.actor_user_id,
            al.created_at,
            pr.full_name as actor_name,
            al.old_data,
            al.new_data
          from public.audit_logs al
          left join public.profiles pr on pr.id = al.actor_user_id
         where (p_action is null or p_action = '' or al.action = p_action)
           and (p_entity_type is null or p_entity_type = '' or al.entity_type = p_entity_type)
           and (p_actor_id is null or al.actor_user_id = p_actor_id)
    ), paged as (
        select f.*, count(*) over () as total_count
          from filtered f
         order by f.created_at desc, f.id desc
         limit v_limit offset v_offset
    )
    select
        coalesce(jsonb_agg(to_jsonb(paged) - 'total_count'), '[]'::jsonb),
        coalesce(max(paged.total_count), 0)
      into v_rows, v_total
      from paged;

    return jsonb_build_object('logs', v_rows, 'total', v_total, 'limit', v_limit, 'offset', v_offset);
end;
$function$;

-- -----------------------------------------------------------------------------
-- 8. Nilai filter untuk halaman audit, supaya UI tidak menebak-nebak dan tidak
--    perlu menarik seluruh tabel hanya untuk menyusun dropdown.
--    Permission: audit.read.
-- -----------------------------------------------------------------------------
create or replace function public.admin_audit_facets()
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
    v_actor uuid := auth.uid();
begin
    if v_actor is null then
        raise exception 'Authentication required';
    end if;

    if not app_private.current_user_has_permission('audit.read') then
        raise exception 'Audit read permission required';
    end if;

    return jsonb_build_object(
        'actions', coalesce((
            select jsonb_agg(x.action order by x.action)
              from (select distinct action from public.audit_logs) x
        ), '[]'::jsonb),
        'entity_types', coalesce((
            select jsonb_agg(x.entity_type order by x.entity_type)
              from (select distinct entity_type from public.audit_logs) x
        ), '[]'::jsonb)
    );
end;
$function$;

-- -----------------------------------------------------------------------------
-- ACL: `anon` tidak diberi akses sama sekali, dan setiap fungsi tetap memeriksa
-- permission-nya sendiri sehingga grant ke `authenticated` tidak cukup untuk
-- memakainya tanpa izin.
-- -----------------------------------------------------------------------------
revoke all on function public.admin_list_users(text, text, text, integer, integer) from public, anon;
revoke all on function public.admin_list_roles() from public, anon;
revoke all on function public.admin_assign_user_role(uuid, text) from public, anon;
revoke all on function public.admin_revoke_user_role(uuid, text) from public, anon;
revoke all on function public.admin_set_user_status(uuid, text) from public, anon;
revoke all on function public.admin_report_overview(text, text) from public, anon;
revoke all on function public.admin_list_audit_logs(text, text, uuid, integer, integer) from public, anon;
revoke all on function public.admin_audit_facets() from public, anon;

grant execute on function public.admin_list_users(text, text, text, integer, integer) to authenticated;
grant execute on function public.admin_list_roles() to authenticated;
grant execute on function public.admin_assign_user_role(uuid, text) to authenticated;
grant execute on function public.admin_revoke_user_role(uuid, text) to authenticated;
grant execute on function public.admin_set_user_status(uuid, text) to authenticated;
grant execute on function public.admin_report_overview(text, text) to authenticated;
grant execute on function public.admin_list_audit_logs(text, text, uuid, integer, integer) to authenticated;
grant execute on function public.admin_audit_facets() to authenticated;
