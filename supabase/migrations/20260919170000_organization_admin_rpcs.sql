-- =============================================================================
-- MVP CPNS Instansi Managed Service — Fase 1b: RPC pengelolaan instansi & batch
--
-- Sumber: PRD §6.1 (manajemen instansi), §6.2 (manajemen batch), §14 langkah 1&3.
--
-- KENAPA RPC
--   `authenticated` hanya memegang SELECT pada tabel instansi (lihat migration
--   fondasi). Seluruh penulisan lewat fungsi SECURITY DEFINER yang memeriksa
--   `organization.manage` di dalamnya — bukan di UI, bukan di server action.
--
-- PENJAGA
--   1. Kode instansi/batch divalidasi bentuknya dan dijaga unik tanpa peduli
--      besar-kecil huruf, karena kode itu dibagikan ke manusia.
--   2. Batch tidak boleh diaktifkan bila instansinya nonaktif — peserta akan
--      memakai kode batch yang organisasinya sudah tidak berjalan.
--   3. `invite_token` TIDAK PERNAH ditampilkan pada daftar, hanya pada detail
--      batch, dan bisa dirotasi. Token itu kunci masuk peserta.
--   4. Menutup batch tidak menghapus apa pun; `archived` hanya menyembunyikan.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Daftar instansi + jumlah batch/peserta. Permission: organization.manage.
-- -----------------------------------------------------------------------------
create or replace function public.admin_list_organizations(
    p_search text default null,
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

    if not app_private.current_user_has_permission('organization.manage') then
        raise exception 'Organization manage permission required';
    end if;

    with filtered as (
        select
            o.id, o.type, o.name, o.code, o.address, o.city, o.province,
            o.contact_name, o.contact_email, o.contact_phone, o.status, o.notes,
            o.created_at, o.updated_at,
            (select count(*) from public.organization_batches b where b.organization_id = o.id) as batch_count,
            (select count(*) from public.organization_batches b where b.organization_id = o.id and b.status = 'active') as active_batch_count,
            (select count(*) from public.organization_participants p where p.organization_id = o.id) as participant_count,
            (select count(*) from public.organization_members m where m.organization_id = o.id) as member_count
          from public.organizations o
         where (p_status is null or p_status = '' or o.status = p_status)
           and (p_search is null or p_search = ''
                or o.name ilike '%' || p_search || '%'
                or o.code ilike '%' || p_search || '%'
                or o.city ilike '%' || p_search || '%'
                or o.contact_name ilike '%' || p_search || '%')
    ), paged as (
        select f.*, count(*) over () as total_count
          from filtered f
         order by f.name
         limit v_limit offset v_offset
    )
    select
        coalesce(jsonb_agg(to_jsonb(paged) - 'total_count'), '[]'::jsonb),
        coalesce(max(paged.total_count), 0)
      into v_rows, v_total
      from paged;

    return jsonb_build_object('organizations', v_rows, 'total', v_total);
end;
$function$;

-- -----------------------------------------------------------------------------
-- 2. Buat / ubah instansi. Permission: organization.manage.
-- -----------------------------------------------------------------------------
create or replace function public.admin_upsert_organization(
    p_id            uuid,
    p_name          text,
    p_code          text,
    p_type          text default 'instansi',
    p_city          text default null,
    p_province      text default null,
    p_address       text default null,
    p_contact_name  text default null,
    p_contact_email text default null,
    p_contact_phone text default null,
    p_status        text default 'active',
    p_notes         text default null
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
    v_actor  uuid := auth.uid();
    v_name   text := btrim(coalesce(p_name, ''));
    v_code   text := upper(btrim(coalesce(p_code, '')));
    v_type   text := lower(btrim(coalesce(p_type, 'instansi')));
    v_status text := lower(btrim(coalesce(p_status, 'active')));
    v_id     uuid := p_id;
begin
    if v_actor is null then
        raise exception 'Authentication required';
    end if;

    if not app_private.current_user_has_permission('organization.manage') then
        raise exception 'Organization manage permission required';
    end if;

    if length(v_name) < 2 then
        raise exception 'Organization name is required';
    end if;

    -- Kode dibagikan ke manusia dan dipakai pada export, jadi bentuknya dijaga.
    if v_code !~ '^[A-Z0-9][A-Z0-9-]{1,23}$' then
        raise exception 'Organization code must be 2-24 characters of A-Z, 0-9 or -';
    end if;

    if v_type not in ('instansi', 'sekolah', 'komunitas', 'lainnya') then
        raise exception 'Unknown organization type';
    end if;

    if v_status not in ('active', 'inactive') then
        raise exception 'Unknown organization status';
    end if;

    if exists (
        select 1 from public.organizations o
         where upper(o.code) = v_code and o.id is distinct from v_id
    ) then
        raise exception 'Organization code % is already used', v_code;
    end if;

    if v_id is null then
        insert into public.organizations (
            name, code, type, city, province, address,
            contact_name, contact_email, contact_phone, status, notes, created_by
        ) values (
            v_name, v_code, v_type, nullif(btrim(coalesce(p_city, '')), ''),
            nullif(btrim(coalesce(p_province, '')), ''), nullif(btrim(coalesce(p_address, '')), ''),
            nullif(btrim(coalesce(p_contact_name, '')), ''), nullif(btrim(coalesce(p_contact_email, '')), ''),
            nullif(btrim(coalesce(p_contact_phone, '')), ''), v_status,
            nullif(btrim(coalesce(p_notes, '')), ''), v_actor
        ) returning id into v_id;
    else
        if not exists (select 1 from public.organizations where id = v_id) then
            raise exception 'Organization not found';
        end if;

        -- Menonaktifkan instansi sementara masih ada batch aktif akan membuat
        -- peserta memakai kode batch yang organisasinya sudah tidak berjalan.
        if v_status = 'inactive' and exists (
            select 1 from public.organization_batches b
             where b.organization_id = v_id and b.status = 'active'
        ) then
            raise exception 'Cannot deactivate an organization that still has active batches';
        end if;

        update public.organizations
           set name = v_name,
               code = v_code,
               type = v_type,
               city = nullif(btrim(coalesce(p_city, '')), ''),
               province = nullif(btrim(coalesce(p_province, '')), ''),
               address = nullif(btrim(coalesce(p_address, '')), ''),
               contact_name = nullif(btrim(coalesce(p_contact_name, '')), ''),
               contact_email = nullif(btrim(coalesce(p_contact_email, '')), ''),
               contact_phone = nullif(btrim(coalesce(p_contact_phone, '')), ''),
               status = v_status,
               notes = nullif(btrim(coalesce(p_notes, '')), ''),
               updated_at = now()
         where id = v_id;
    end if;

    return jsonb_build_object('id', v_id, 'name', v_name, 'code', v_code, 'status', v_status);
end;
$function$;

-- -----------------------------------------------------------------------------
-- 3. Detail instansi + batch + hitungan peserta. Permission: organization.manage.
-- -----------------------------------------------------------------------------
create or replace function public.admin_get_organization(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
    v_actor uuid := auth.uid();
    v_org   jsonb;
begin
    if v_actor is null then
        raise exception 'Authentication required';
    end if;

    if not app_private.current_user_has_permission('organization.manage') then
        raise exception 'Organization manage permission required';
    end if;

    select to_jsonb(o) into v_org from public.organizations o where o.id = p_id;
    if v_org is null then
        raise exception 'Organization not found';
    end if;

    return jsonb_build_object(
        'organization', v_org - 'created_by',
        'batches', coalesce((
            select jsonb_agg(jsonb_build_object(
                'id', b.id,
                'code', b.code,
                'name', b.name,
                'invite_token', b.invite_token,
                'starts_at', b.starts_at,
                'ends_at', b.ends_at,
                'status', b.status,
                'notes', b.notes,
                'created_at', b.created_at,
                'participant_count', (
                    select count(*) from public.organization_participants p where p.batch_id = b.id
                ),
                'linked_count', (
                    select count(*) from public.organization_participants p
                     where p.batch_id = b.id and p.user_id is not null
                )
            ) order by b.created_at desc)
              from public.organization_batches b
             where b.organization_id = p_id
        ), '[]'::jsonb)
    );
end;
$function$;

-- -----------------------------------------------------------------------------
-- 4. Buat / ubah batch. Permission: organization.manage.
-- -----------------------------------------------------------------------------
create or replace function public.admin_upsert_batch(
    p_id              uuid,
    p_organization_id uuid,
    p_code            text,
    p_name            text,
    p_starts_at       timestamptz default null,
    p_ends_at         timestamptz default null,
    p_status          text default 'draft',
    p_notes           text default null
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
    v_actor  uuid := auth.uid();
    v_code   text := upper(btrim(coalesce(p_code, '')));
    v_name   text := btrim(coalesce(p_name, ''));
    v_status text := lower(btrim(coalesce(p_status, 'draft')));
    v_org_status text;
    v_id     uuid := p_id;
begin
    if v_actor is null then
        raise exception 'Authentication required';
    end if;

    if not app_private.current_user_has_permission('organization.manage') then
        raise exception 'Organization manage permission required';
    end if;

    if p_organization_id is null then
        raise exception 'Organization is required';
    end if;

    select status into v_org_status from public.organizations where id = p_organization_id;
    if v_org_status is null then
        raise exception 'Organization not found';
    end if;

    if length(v_name) < 2 then
        raise exception 'Batch name is required';
    end if;

    if v_code !~ '^[A-Z0-9][A-Z0-9-]{1,23}$' then
        raise exception 'Batch code must be 2-24 characters of A-Z, 0-9 or -';
    end if;

    if v_status not in ('draft', 'active', 'closed', 'archived') then
        raise exception 'Unknown batch status';
    end if;

    if p_starts_at is not null and p_ends_at is not null and p_ends_at < p_starts_at then
        raise exception 'Batch end must not be before its start';
    end if;

    -- Batch aktif hanya masuk akal bila instansinya aktif.
    if v_status = 'active' and v_org_status <> 'active' then
        raise exception 'Cannot activate a batch whose organization is inactive';
    end if;

    if exists (
        select 1 from public.organization_batches b
         where b.organization_id = p_organization_id
           and upper(b.code) = v_code
           and b.id is distinct from v_id
    ) then
        raise exception 'Batch code % is already used in this organization', v_code;
    end if;

    if v_id is null then
        insert into public.organization_batches (
            organization_id, code, name, starts_at, ends_at, status, notes, created_by
        ) values (
            p_organization_id, v_code, v_name, p_starts_at, p_ends_at, v_status,
            nullif(btrim(coalesce(p_notes, '')), ''), v_actor
        ) returning id into v_id;
    else
        if not exists (
            select 1 from public.organization_batches
             where id = v_id and organization_id = p_organization_id
        ) then
            raise exception 'Batch not found in this organization';
        end if;

        update public.organization_batches
           set code = v_code,
               name = v_name,
               starts_at = p_starts_at,
               ends_at = p_ends_at,
               status = v_status,
               notes = nullif(btrim(coalesce(p_notes, '')), ''),
               updated_at = now()
         where id = v_id;
    end if;

    return jsonb_build_object('id', v_id, 'code', v_code, 'name', v_name, 'status', v_status);
end;
$function$;

-- -----------------------------------------------------------------------------
-- 5. Rotasi token undangan batch. Permission: organization.manage.
--
--    Dipakai bila tautan undangan terlanjur tersebar. Token lama langsung tidak
--    berlaku, dan itu tindakan yang disengaja — bukan efek samping.
-- -----------------------------------------------------------------------------
create or replace function public.admin_rotate_batch_invite(p_batch_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
    v_actor uuid := auth.uid();
    v_token text;
begin
    if v_actor is null then
        raise exception 'Authentication required';
    end if;

    if not app_private.current_user_has_permission('organization.manage') then
        raise exception 'Organization manage permission required';
    end if;

    update public.organization_batches
       set invite_token = encode(extensions.gen_random_bytes(16), 'hex'),
           updated_at = now()
     where id = p_batch_id
    returning invite_token into v_token;

    if v_token is null then
        raise exception 'Batch not found';
    end if;

    return jsonb_build_object('id', p_batch_id, 'invite_token', v_token);
end;
$function$;

-- -----------------------------------------------------------------------------
-- 6. Daftar peserta sebuah batch. Permission: organization.manage.
--    Dipakai halaman detail batch, monitoring (§6.5), dan export (§6.6).
-- -----------------------------------------------------------------------------
create or replace function public.admin_list_participants(
    p_organization_id uuid default null,
    p_batch_id        uuid default null,
    p_search          text default null,
    p_status          text default null,
    p_limit           integer default 100,
    p_offset          integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
    v_actor uuid := auth.uid();
    v_limit integer := least(greatest(coalesce(p_limit, 100), 1), 500);
    v_offset integer := greatest(coalesce(p_offset, 0), 0);
    v_rows jsonb;
    v_total integer := 0;
begin
    if v_actor is null then
        raise exception 'Authentication required';
    end if;

    if not app_private.current_user_has_permission('organization.manage') then
        raise exception 'Organization manage permission required';
    end if;

    with filtered as (
        select
            p.id, p.organization_id, p.batch_id, p.user_id, p.participant_code,
            p.full_name_snapshot, p.email_snapshot, p.phone_snapshot,
            p.nik, p.unit, p.jabatan, p.status, p.registered_at, p.notes,
            b.code as batch_code, b.name as batch_name,
            o.code as organization_code, o.name as organization_name
          from public.organization_participants p
          join public.organization_batches b on b.id = p.batch_id
          join public.organizations o on o.id = p.organization_id
         where (p_organization_id is null or p.organization_id = p_organization_id)
           and (p_batch_id is null or p.batch_id = p_batch_id)
           and (p_status is null or p_status = '' or p.status = p_status)
           and (p_search is null or p_search = ''
                or p.participant_code ilike '%' || p_search || '%'
                or p.full_name_snapshot ilike '%' || p_search || '%'
                or p.email_snapshot ilike '%' || p_search || '%'
                or p.phone_snapshot ilike '%' || p_search || '%')
    ), paged as (
        select f.*, count(*) over () as total_count
          from filtered f
         order by f.full_name_snapshot
         limit v_limit offset v_offset
    )
    select
        coalesce(jsonb_agg(to_jsonb(paged) - 'total_count'), '[]'::jsonb),
        coalesce(max(paged.total_count), 0)
      into v_rows, v_total
      from paged;

    return jsonb_build_object('participants', v_rows, 'total', v_total);
end;
$function$;

-- -----------------------------------------------------------------------------
-- ACL.
-- -----------------------------------------------------------------------------
revoke all on function public.admin_list_organizations(text, text, integer, integer) from public, anon;
revoke all on function public.admin_upsert_organization(uuid, text, text, text, text, text, text, text, text, text, text, text) from public, anon;
revoke all on function public.admin_get_organization(uuid) from public, anon;
revoke all on function public.admin_upsert_batch(uuid, uuid, text, text, timestamptz, timestamptz, text, text) from public, anon;
revoke all on function public.admin_rotate_batch_invite(uuid) from public, anon;
revoke all on function public.admin_list_participants(uuid, uuid, text, text, integer, integer) from public, anon;

grant execute on function public.admin_list_organizations(text, text, integer, integer) to authenticated;
grant execute on function public.admin_upsert_organization(uuid, text, text, text, text, text, text, text, text, text, text, text) to authenticated;
grant execute on function public.admin_get_organization(uuid) to authenticated;
grant execute on function public.admin_upsert_batch(uuid, uuid, text, text, timestamptz, timestamptz, text, text) to authenticated;
grant execute on function public.admin_rotate_batch_invite(uuid) to authenticated;
grant execute on function public.admin_list_participants(uuid, uuid, text, text, integer, integer) to authenticated;
