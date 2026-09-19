-- =============================================================================
-- MVP CPNS Instansi Managed Service — Fase 3: self-onboarding peserta
--
-- Sumber: PRD §6.3 (manajemen peserta), §7.2 (data peserta), §7.2.1 (self-onboarding),
--         §10.3 (flow self-onboarding), §14 langkah 4.
--
-- ALUR YANG DIDUKUNG
--   1. Admin membuat batch  -> sistem menghasilkan invite_token (§10.3 langkah 2)
--   2. Instansi membagikan tautan /cpns/join/<token>
--   3. Peserta login atau membuat akun
--   4. Peserta melengkapi data minimum, lalu terhubung ke batch
--
-- PENJAGA
--   1. Batch hanya bisa dimasuki bila statusnya draft/active DAN instansinya
--      aktif. Batch yang sudah ditutup atau diarsipkan tidak menerima peserta
--      baru.
--   2. Bergabung bersifat IDEMPOTEN. Membuka tautan dua kali tidak membuat dua
--      baris peserta — dan itu ditegakkan lewat unique index (batch_id, user_id)
--      plus penguncian baris batch, bukan lewat pengecekan di UI.
--   3. Peserta yang SUDAH diimpor admin (belum punya akun, cocok berdasarkan
--      email) akan DIKLAIM, bukan diduplikasi. Tanpa ini, bulk import lalu
--      self-onboarding menghasilkan dua baris untuk orang yang sama — persis
--      risiko yang §7.2.1 ingin dicegah dengan dedupe email.
--   4. Peserta hanya boleh masuk sebagai DIRINYA SENDIRI; `p_user_id` tidak
--      pernah datang dari klien.
--   5. `participant_code` dibuat otomatis dan unik di dalam batch, dihasilkan
--      dari baris batch yang terkunci sehingga dua peserta yang bergabung
--      bersamaan tidak memperoleh kode yang sama.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Pratinjau batch dari token undangan. Untuk halaman join SEBELUM bergabung.
--    Butuh login (PRD §10.3 langkah 4), jadi cukup `authenticated`.
-- -----------------------------------------------------------------------------
create or replace function public.get_batch_invite(p_token text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
    v_actor uuid := auth.uid();
    v_token text := btrim(coalesce(p_token, ''));
    v_batch public.organization_batches%rowtype;
    v_org   public.organizations%rowtype;
    v_already boolean := false;
    v_joinable boolean;
    v_reason text := null;
begin
    if v_actor is null then
        raise exception 'Authentication required';
    end if;

    if v_token = '' then
        raise exception 'Invite token is required';
    end if;

    select * into v_batch from public.organization_batches where invite_token = v_token;
    if not found then
        return jsonb_build_object('found', false);
    end if;

    select * into v_org from public.organizations where id = v_batch.organization_id;

    select exists(
        select 1 from public.organization_participants p
         where p.batch_id = v_batch.id and p.user_id = v_actor
    ) into v_already;

    -- Alasan tidak bisa bergabung dikembalikan apa adanya supaya halaman dapat
    -- menjelaskan, bukan sekadar menolak tanpa keterangan.
    if v_already then
        v_joinable := false;
        v_reason := 'already_joined';
    elsif v_batch.status not in ('draft', 'active') then
        v_joinable := false;
        v_reason := 'batch_closed';
    elsif v_org.status <> 'active' then
        v_joinable := false;
        v_reason := 'organization_inactive';
    else
        v_joinable := true;
    end if;

    return jsonb_build_object(
        'found', true,
        'joinable', v_joinable,
        'reason', v_reason,
        'already_joined', v_already,
        'batch', jsonb_build_object(
            'id', v_batch.id,
            'code', v_batch.code,
            'name', v_batch.name,
            'status', v_batch.status,
            'starts_at', v_batch.starts_at,
            'ends_at', v_batch.ends_at
        ),
        'organization', jsonb_build_object(
            'id', v_org.id,
            'name', v_org.name,
            'code', v_org.code,
            'city', v_org.city,
            'province', v_org.province,
            'status', v_org.status
        )
    );
end;
$function$;

-- -----------------------------------------------------------------------------
-- 2. Bergabung ke batch dengan token undangan.
--    Selalu bertindak atas nama `auth.uid()` — tidak menerima user_id dari klien.
-- -----------------------------------------------------------------------------
create or replace function public.join_batch_with_invite(
    p_token     text,
    p_full_name text default null,
    p_phone     text default null,
    p_unit      text default null,
    p_jabatan   text default null
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
    v_actor   uuid := auth.uid();
    v_token   text := btrim(coalesce(p_token, ''));
    v_batch   public.organization_batches%rowtype;
    v_org     public.organizations%rowtype;
    v_existing public.organization_participants%rowtype;
    v_profile public.profiles%rowtype;
    v_email   text;
    v_name    text;
    v_code    text;
    v_seq     integer;
    v_pid     uuid;
begin
    if v_actor is null then
        raise exception 'Authentication required';
    end if;

    if v_token = '' then
        raise exception 'Invite token is required';
    end if;

    -- Kunci baris batch: menyerialkan pembuatan kode peserta sekaligus
    -- mencegah dua permintaan bersamaan membuat dua baris untuk user yang sama.
    select * into v_batch
      from public.organization_batches
     where invite_token = v_token
     for update;

    if not found then
        raise exception 'Invite link is not valid';
    end if;

    select * into v_org from public.organizations where id = v_batch.organization_id;

    if v_batch.status not in ('draft', 'active') then
        raise exception 'This batch is no longer open';
    end if;

    if v_org.status <> 'active' then
        raise exception 'This organization is inactive';
    end if;

    -- Sudah pernah bergabung -> idempoten, kembalikan baris yang ada.
    select * into v_existing
      from public.organization_participants
     where batch_id = v_batch.id and user_id = v_actor;

    if found then
        return jsonb_build_object(
            'joined', true,
            'already_joined', true,
            'participant_id', v_existing.id,
            'participant_code', v_existing.participant_code,
            'batch_id', v_batch.id,
            'organization_id', v_org.id
        );
    end if;

    select * into v_profile from public.profiles where id = v_actor;
    select au.email::text into v_email from auth.users au where au.id = v_actor;

    v_name := nullif(btrim(coalesce(p_full_name, '')), '');
    if v_name is null then
        v_name := nullif(btrim(coalesce(v_profile.full_name, '')), '');
    end if;
    if v_name is null then
        v_name := nullif(btrim(coalesce(v_profile.display_name, '')), '');
    end if;
    if v_name is null then
        v_name := split_part(coalesce(v_email, 'Peserta'), '@', 1);
    end if;

    -- Penjaga 3: klaim baris hasil import yang cocok berdasarkan email, jangan
    -- buat baris kedua untuk orang yang sama.
    if v_email is not null then
        select * into v_existing
          from public.organization_participants
         where batch_id = v_batch.id
           and user_id is null
           and lower(email_snapshot) = lower(v_email)
         for update;

        if found then
            update public.organization_participants
               set user_id = v_actor,
                   full_name_snapshot = case
                       when btrim(coalesce(full_name_snapshot, '')) = '' then v_name
                       else full_name_snapshot
                   end,
                   phone_snapshot = coalesce(phone_snapshot, nullif(btrim(coalesce(p_phone, '')), '')),
                   unit = coalesce(unit, nullif(btrim(coalesce(p_unit, '')), '')),
                   jabatan = coalesce(jabatan, nullif(btrim(coalesce(p_jabatan, '')), '')),
                   status = case when status = 'registered' then 'active' else status end,
                   updated_at = now()
             where id = v_existing.id;

            return jsonb_build_object(
                'joined', true,
                'claimed', true,
                'already_joined', false,
                'participant_id', v_existing.id,
                'participant_code', v_existing.participant_code,
                'batch_id', v_batch.id,
                'organization_id', v_org.id
            );
        end if;
    end if;

    -- Kode peserta otomatis: <KODE-BATCH>-NNN, unik di dalam batch.
    select count(*) + 1 into v_seq
      from public.organization_participants where batch_id = v_batch.id;

    loop
        v_code := v_batch.code || '-' || lpad(v_seq::text, 3, '0');
        exit when not exists (
            select 1 from public.organization_participants
             where batch_id = v_batch.id and upper(participant_code) = upper(v_code)
        );
        v_seq := v_seq + 1;
    end loop;

    insert into public.organization_participants (
        organization_id, batch_id, user_id, participant_code,
        full_name_snapshot, email_snapshot, phone_snapshot, unit, jabatan, status
    ) values (
        v_org.id, v_batch.id, v_actor, v_code,
        v_name, v_email, nullif(btrim(coalesce(p_phone, '')), ''),
        nullif(btrim(coalesce(p_unit, '')), ''), nullif(btrim(coalesce(p_jabatan, '')), ''),
        'active'
    ) returning id into v_pid;

    return jsonb_build_object(
        'joined', true,
        'claimed', false,
        'already_joined', false,
        'participant_id', v_pid,
        'participant_code', v_code,
        'batch_id', v_batch.id,
        'organization_id', v_org.id
    );
end;
$function$;

-- -----------------------------------------------------------------------------
-- 3. Keanggotaan instansi milik pemanggil, untuk dashboard peserta (PRD §10A.3).
--    Hanya membaca; tidak butuh organization.manage karena ini data sendiri.
-- -----------------------------------------------------------------------------
create or replace function public.get_my_organization_memberships()
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

    return jsonb_build_object(
        'memberships', coalesce((
            select jsonb_agg(jsonb_build_object(
                'participant_id', p.id,
                'participant_code', p.participant_code,
                'status', p.status,
                'batch_id', b.id,
                'batch_code', b.code,
                'batch_name', b.name,
                'batch_status', b.status,
                'starts_at', b.starts_at,
                'ends_at', b.ends_at,
                'organization_id', o.id,
                'organization_name', o.name,
                'organization_code', o.code
            ) order by b.created_at desc)
              from public.organization_participants p
              join public.organization_batches b on b.id = p.batch_id
              join public.organizations o on o.id = p.organization_id
             where p.user_id = v_actor
               and p.status <> 'withdrawn'
        ), '[]'::jsonb)
    );
end;
$function$;

-- -----------------------------------------------------------------------------
-- ACL.
-- -----------------------------------------------------------------------------
revoke all on function public.get_batch_invite(text) from public, anon;
revoke all on function public.join_batch_with_invite(text, text, text, text, text) from public, anon;
revoke all on function public.get_my_organization_memberships() from public, anon;

grant execute on function public.get_batch_invite(text) to authenticated;
grant execute on function public.join_batch_with_invite(text, text, text, text, text) to authenticated;
grant execute on function public.get_my_organization_memberships() to authenticated;
