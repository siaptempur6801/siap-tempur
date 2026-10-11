-- Pengerasan integritas `public.user_roles` (2026-09-17).
--
-- Tabel ini hanya punya primary key `(id)` dan foreign key, tanpa keunikan pada kombinasi
-- peran + cakupan. Akibatnya baris ganda untuk (user, role, scope) yang sama bisa masuk dan
-- membuat hasil otorisasi ambigu (mis. peran yang sama tercatat dua kali).
--
-- Karena `scope_type`/`scope_id` bisa NULL (peran tanpa cakupan), keunikan dipisah menjadi dua
-- indeks parsial: satu untuk peran tanpa cakupan, satu untuk peran dengan cakupan.
-- Peran tanpa cakupan (mis. ADMIN global): satu baris per (user, role).
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_unique_unscoped_idx ON public.user_roles (user_id, role_id)
WHERE
  scope_type IS NULL AND scope_id IS NULL;

-- Peran dengan cakupan (mis. peran pada track tertentu): satu baris per (user, role, scope).
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_unique_scoped_idx ON public.user_roles (user_id, role_id, scope_type, scope_id)
WHERE
  scope_type IS NOT NULL AND scope_id IS NOT NULL;
