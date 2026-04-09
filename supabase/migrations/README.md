## Migration Notes

Folder ini menyimpan migration historis untuk database production. Jangan hapus file timestamped hanya karena terlihat duplikat; beberapa file memang saling menimpa objek yang sama karena merupakan evolusi skema.

### Sudah Diarsipkan

Skrip ad-hoc non-timestamped dipindahkan ke [./_archive/README.md](/b:/projects/siap-tempur/supabase/migrations/_archive/README.md):
- `add_bio_to_profiles.sql`
- `quota_rpc.sql`

### Superseded Tapi Tetap Disimpan

Berikut migration yang secara fungsional sudah digantikan migration yang lebih baru, tetapi tetap disimpan sebagai riwayat deploy.

#### Leaderboard

- `20240212_leaderboard_snapshot.sql`
  Membuat versi awal `leaderboard_snapshot` sebagai table biasa + function `refresh_leaderboard_snapshot()`.
- `20240212_leaderboard_mv_cron.sql`
  Mengganti implementasi leaderboard menjadi materialized view dan menambah cron `refresh_leaderboard` tiap 2 menit.
- `20240228_fix_leaderboard_view.sql`
  Menambah wrapper `get_leaderboard_snapshot()` untuk akses RPC.
- `20260304_update_leaderboard_cron.sql`
  Menimpa ulang materialized view dan wrapper leaderboard, serta mencoba mengubah jadwal cron.
- `20260409_fix_leaderboard_cron_jobs.sql`
  Canonical cleanup untuk job cron leaderboard. Migration ini membersihkan job lama/duplikat dan menyisakan satu job aktif.

Status saat ini:
- anggap `20260409_fix_leaderboard_cron_jobs.sql` sebagai sumber kebenaran cron leaderboard
- file leaderboard yang lebih lama bersifat historis, bukan referensi operasional

#### Question Code

- `20260409_add_question_code.sql`
  Versi awal `question_code` dengan format `Q-000001`.
- `20260409_update_question_code_format.sql`
  Mengganti format menjadi per tipe: `TWK-000001`, `TIU-000001`, `TKP-000001`, dan mengganti mekanisme assign ke trigger per tipe.
- `20260409_fix_function_search_paths.sql`
  Hardening security untuk fungsi question code dan `claim_voucher`.

Status saat ini:
- anggap `20260409_update_question_code_format.sql` sebagai bentuk operasional final
- `20260409_add_question_code.sql` tetap diperlukan sebagai bagian riwayat munculnya kolom `question_code`

#### Voucher

- `20240228_add_voucher_system.sql`
  Membuat tabel voucher dan RPC `claim_voucher(uuid, text)`.
- `20240317_fix_voucher_reuse.sql`
  Menimpa RPC voucher menjadi `claim_voucher(uuid, text, text)` dan memperbaiki anti-abuse berbasis email.
- `20260409_fix_function_search_paths.sql`
  Menormalkan `search_path` untuk kedua signature yang mungkin masih ada di database.

Status saat ini:
- anggap `20240317_fix_voucher_reuse.sql` sebagai logika voucher aktif

#### Tryout Configurations

- `20240225_tryout_configurations.sql`
  Membuat tabel, seed data, trigger updated_at, dan rework RPC tryout.
- `20240228_secure_tryout_configs.sql`
  Mengaktifkan RLS dan policy read.
- `20240228_admin_tryout_configs.sql`
  Menambah policy admin.
- `20240228_performance_fixes.sql`
  Menimpa sebagian policy agar lebih efisien.
- `20240228_security_fixes.sql`
  Menambah hardening `search_path` untuk function terkait.

Status saat ini:
- grup migration ini memang bertingkat; jangan dianggap duplikat yang bisa dihapus satu per satu

### Aturan Praktis

- Jika ada perubahan baru, tambahkan migration timestamped baru. Jangan edit migration lama yang sudah pernah dipakai deploy.
- Jika menemukan file ad-hoc tanpa prefix timestamp, pindahkan ke `_archive/`.
- Jika sebuah objek SQL ditimpa berkali-kali, catat canonical state-nya di README ini daripada menghapus jejak historisnya.
