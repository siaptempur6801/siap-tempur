# MVP CPNS Instansi Managed Service — Progres Implementasi

Sumber kebenaran fitur: [`docs/notes/prd-cpns-instansi-managed-service.md`](notes/prd-cpns-instansi-managed-service.md).
Dokumen ini mencatat **apa yang sudah dibangun** dan **apa yang belum**, mengikuti
urutan implementasi §14 PRD.

Terakhir diperbarui: 2026-09-19

---

## Status per fase (§14)

| # | Langkah §14 | Status |
|---|---|---|
| 1 | Schema instansi, batch, peserta | ✅ **selesai** |
| 2 | Metadata session untuk source instansi | ✅ **selesai** |
| 3 | UI internal pengelolaan instansi & batch | ✅ **selesai** |
| 4 | Flow join peserta via token/kode batch | ✅ **selesai** |
| 5 | Import peserta | ⏳ belum |
| 6 | Template ujian & assignment | ⏳ belum |
| 7 | Dashboard monitoring | ⏳ belum |
| 8 | Export XLSX per instansi/batch | ⏳ belum |

Notifikasi (`notification.manage`) **tidak termasuk** goal ini: repo tidak punya
pengirim email/push apa pun, jadi ditunda sampai provider dipilih.

---

## Fase 1 — Schema

Migration:
`supabase/migrations/20260919160000_organization_instansi_foundation.sql`

### Yang ditambahkan

- **`organizations`** dilengkapi kolom yang PRD §6.1 minta tetapi belum ada sama
  sekali: `contact_name`, `contact_email`, `contact_phone`, `notes`, `created_by`,
  `updated_at`.
- **`organization_batches`** (baru) — §6.2. `invite_token` untuk self-onboarding
  (§10.3), sengaja TERPISAH dari `code` supaya kode batch yang mudah dibaca tidak
  sekaligus menjadi rahasia yang bisa ditebak.
- **`organization_participants`** (baru) — §7.2. Satu baris = satu partisipasi
  pada SATU batch.
- **`organization_exam_templates`** (baru) — §7.3.
- **`organization_exam_assignments`** ditambah `batch_id`, `template_id`,
  `is_active`, `notes` — §7.4.
- **`exam_attempts`** ditambah `source`, `organization_id`, `batch_id`,
  `assignment_id`, `participant_id` — §7.5.

### Keputusan desain yang perlu diketahui

1. **`organization_exam_assignments.exam_id` tetap NOT NULL.** PRD §7.4 ingin
   assignment dibuat dari batch + template. Alih-alih membangun mesin ujian
   paralel untuk instansi, assignment menunjuk ke `exams` hasil komposisi
   template — mesin ujian, penilaian, dan pembahasan yang sudah ada dipakai
   ulang. Yang dipisahkan hanya DATANYA, sesuai §7.6 (ranking instansi tidak
   bercampur leaderboard nasional) — bukan mesinnya.
2. **Satu peserta yang ikut dua batch = dua baris.** Ini menjawab open question
   §13 "boleh ikut lebih dari satu batch?" tanpa memaksakan pilihan.
3. **Kolom eksplisit, bukan `metadata` jsonb**, untuk konteks instansi pada
   `exam_attempts`: §8 menuntut export dapat difilter CEPAT berdasarkan
   `organization_id` dan `batch_id`, dan itu butuh index (dibuat sebagai partial
   index `where source = 'organization'`).
4. **`user_id` peserta boleh NULL** (§7.2, §13): peserta boleh dibuat sebagai
   data lebih dulu, akunnya menyusul lewat self-onboarding.

### PRD sudah tertinggal dari Schema V2

§9 PRD berbunyi *"`test_sessions` ditambah metadata konteks instansi"*. Tabel itu
sekarang ada di `legacy_prod`, bukan `public`; padanan V2-nya `exam_attempts`, dan
itulah yang ditambahi metadata di sini. PRD juga menyarankan rute
`/cpns/dashboard/admin/instansi`, padahal pohon itu sudah dihapus 2026-09-18 —
rute kanoniknya `/admin/organizations` sesuai `docs/ADMIN_UI_UX_STANDARD.md` §4.

### Penjaga yang diuji (semuanya menolak dengan benar)

Dijalankan lewat `scripts/db-verify/organization-flow.sql` di dalam transaksi yang
di-`rollback`, sebagai pengguna `authenticated` sungguhan:

- INSERT/UPDATE/DELETE langsung oleh `authenticated` → `permission denied`
  (level GRANT, lebih kuat dari RLS)
- status batch/instansi/peserta di luar daftar → check constraint
- `ends_at` sebelum `starts_at` → check constraint
- jumlah soal template 0 semua → check constraint
- `show_explanation` di luar daftar → check constraint
- `source` attempt di luar `b2c`/`organization` → check constraint
- kode instansi duplikat → ditolak RPC
- kode batch duplikat dalam satu instansi → ditolak RPC
- kode tidak valid (bukan A–Z/0–9/-) → ditolak RPC
- mengaktifkan batch pada instansi nonaktif → ditolak RPC
- menonaktifkan instansi yang masih punya batch aktif → ditolak RPC

### Bug yang ketahuan saat pengujian

`gen_random_bytes` TIDAK ada di `pg_catalog` melainkan di schema `extensions`,
sehingga gagal diresolusi ketika fungsi berjalan dengan `search_path = ''` —
konvensi wajib repo ini untuk `SECURITY DEFINER`. Default kolom
`organization_batches.invite_token` memakai bentuk tak terkualifikasi yang sama,
jadi `admin_upsert_batch` akan gagal dengan cara yang identik. Keduanya kini
memakai `extensions.gen_random_bytes`, dan ada `ALTER TABLE ... SET DEFAULT`
untuk database yang tabelnya sudah terlanjur dibuat.

## Fase 1b — RPC pengelolaan

Migration:
`supabase/migrations/20260919170000_organization_admin_rpcs.sql`

`admin_list_organizations`, `admin_upsert_organization`,
`admin_get_organization`, `admin_upsert_batch`, `admin_rotate_batch_invite`,
`admin_list_participants` — semuanya `SECURITY DEFINER` + `search_path = ''`,
memeriksa `organization.manage` di dalam database.

`admin_get_organization` mengembalikan `invite_token` (daftar tidak), karena token
itu kunci masuk peserta. `admin_rotate_batch_invite` membuat token lama langsung
tidak berlaku — tindakan yang disengaja, bukan efek samping.

## Fase 2 — UI admin

`/admin/organizations` — daftar instansi, form instansi (semua kolom §6.1),
daftar batch per instansi, form batch (§6.2), tautan undangan yang bisa disalin,
rotasi tautan, dan pratinjau peserta per batch.

Grup nav baru **Instansi** di `lib/admin-nav.ts`. `SCHOOL_ADMIN`
(`organization.manage` + `report.read`) kini **mendarat di Instansi & Batch**,
bukan di Reports — pekerjaan utamanya didahulukan.

## Fase 3 — Self-onboarding peserta

Migration:
`supabase/migrations/20260919180000_organization_self_onboarding.sql`

RPC: `get_batch_invite` (pratinjau), `join_batch_with_invite` (bergabung),
`get_my_organization_memberships` (dashboard peserta §10A.3).
Halaman: `/cpns/join/[token]`.

Halaman join sengaja berdiri DI LUAR `/admin` — pesertanya bukan admin, dan
shell admin akan menolaknya. Rute `/cpns/join` juga tidak ada di
`PROTECTED_ROUTES` middleware, jadi tidak ada pengalihan yang mengganggu.

**Penjaga yang diuji** (11 langkah, `scripts/db-verify/organization-join-flow.sql`):

- token palsu ditolak; batch tertutup menolak peserta baru;
- bergabung bersifat IDEMPOTEN — dibuka dua kali tetap satu baris dengan kode
  yang sama, ditegakkan lewat unique index `(batch_id, user_id)` plus penguncian
  baris batch, bukan pengecekan di UI;
- kode peserta dibuat otomatis (`<KODE-BATCH>-NNN`) di dalam baris batch yang
  terkunci, sehingga dua peserta yang bergabung bersamaan tidak bentrok;
- **baris peserta hasil IMPORT diklaim berdasarkan email**, bukan diduplikasi:
  kode import dipakai ulang, nama import dipertahankan, status naik
  `registered` → `active`, dan tetap hanya ada SATU baris.

### Dua celah yang ketahuan saat E2E dijalankan

1. **Instansi salah ketik tidak pernah bisa dihapus.** Satu-satunya jalan adalah
   menonaktifkannya, dan daftar instansi jadi penuh sampah — terbukti: 12
   instansi sampah menumpuk di staging dari run E2E yang gagal. Ditambahkan
   `admin_delete_organization` dengan penjaga: instansi yang masih punya peserta
   TIDAK boleh dihapus.
2. **Peserta yang salah gabung tidak bisa dikeluarkan.** Menghapus instansinya
   justru ditolak karena sudah ada peserta. Ditambahkan
   `admin_remove_participant` (menolak bila peserta sudah mengerjakan ujian —
   attempt instansi adalah dasar export §7.7) dan `admin_set_participant_status`
   sebagai jalur untuk kasus itu.

Keduanya ditemukan karena E2E-nya membersihkan dirinya sendiri: tanpa cleanup,
sampahnya tidak terlihat.

## Verifikasi

| Pemeriksaan | Hasil |
|---|---|
| `tsc --noEmit` | lolos |
| `eslint` | lolos |
| Unit test | **458 / 458** (70 file) |
| `npm run build` | lolos |
| Gate admin | **24 / 24** |
| Gate TKA | lolos |
| Gate paritas DB | hijau — 174 = 174 migrasi, tanpa selisih tak terduga |
| Alur CRUD instansi/batch | **11 / 11** sesuai harapan |
| Alur join & klaim peserta | **11 / 11** sesuai harapan |
| E2E alur penuh | admin buat instansi → batch → peserta bergabung → admin melihat peserta "Tertaut" → cleanup |

## Yang BELUM

- Fase 4–7 (import peserta, template & assignment, monitoring, export XLSX).
- Peran klien instansi (`organization_members` dengan `owner`/`manager`/`staff`)
  belum punya UI — §15 menetapkan klien belum menjadi admin sistem pada MVP.
- `organization_members` belum punya UI. PRD §9 menyebutnya untuk role klien
  (`owner`/`manager`/`staff`), dan §15 menetapkan klien belum menjadi admin
  sistem pada MVP — jadi belum dipakai.
- Open question §13 yang belum diputuskan: apakah hasil yang dibagikan ke klien
  perlu detail jawaban per soal, dan apakah passing grade boleh memakai target
  internal instansi (bukan hanya standar nasional).
