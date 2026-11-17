-- Pengerasan integritas `public.user_roles` (2026-09-17).
--
-- Tabel ini hanya punya primary key `(id)` dan foreign key, tanpa keunikan pada kombinasi
-- peran + cakupan. Akibatnya baris ganda untuk (user, role, scope) yang sama bisa masuk dan
-- membuat hasil otorisasi ambigu (mis. peran yang sama tercatat dua kali).
--
-- Karena `scope_type`/`scope_id` bisa NULL (peran tanpa cakupan), keunikan dipisah menjadi dua
-- indeks parsial: satu untuk peran tanpa cakupan, satu untuk peran dengan cakupan.

-- Peran tanpa cakupan (mis. ADMIN global): satu baris per (user, role).
create unique index if not exists user_roles_unique_unscoped_idx
    on public.user_roles (user_id, role_id)
 where scope_type is null and scope_id is null;

-- Peran dengan cakupan (mis. peran pada track tertentu): satu baris per (user, role, scope).
create unique index if not exists user_roles_unique_scoped_idx
    on public.user_roles (user_id, role_id, scope_type, scope_id)
 where scope_type is not null and scope_id is not null;
