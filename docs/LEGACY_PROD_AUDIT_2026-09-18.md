# Audit Data `legacy_prod` — Apakah Ada yang Tertinggal?

> Dibuat 2026-09-18, setelah ditemukan **tiga** kasus data yang tidak ikut cutover
> Schema V2: artikel, gambar event, dan sertifikat event.

## Ringkasan

`legacy_prod` berisi **73 tabel + 7 view**. Audit ini membandingkan setiap tabel
yang berisi data dengan padanannya di schema `public`.

**Kesimpulan: sebagian besar data SUDAH dimigrasikan dengan benar.** Dari tabel
besar yang diaudit, hanya **empat** yang benar-benar tidak punya padanan, dan
**tidak ada** kasus seperti artikel/sertifikat lagi (tabel baru kosong padahal
data lama ada).

| Kategori | Jumlah tabel berisi data | Status |
|---|---|---|
| Sudah dimigrasikan (jumlah baris sepadan) | 11 | ✅ aman |
| **Tidak punya padanan di Schema V2** | 4 | ⚠️ perlu keputusan |
| **Padanan ada tetapi berbeda konsep** | 2 | ℹ️ bukan kehilangan |
| Kosong di legacy (0 baris) | 12 | ✅ tidak relevan |

## A. Sudah dimigrasikan dengan benar

Perbandingan jumlah baris legacy → schema baru:

| Tabel legacy | Baris | Padanan baru | Baris baru | Catatan |
|---|---|---|---|---|
| `test_answers` | 16.889 | `public.attempt_answers` | 16.910 | ✅ |
| `answer_selection` | 9.739 | `public.attempt_answer_options` | 9.503 | ✅ selisih wajar |
| `options` | 3.109 | `public.question_options` | 4.441 | ✅ |
| `questions` | 652 | `public.questions` | 978 | ✅ |
| `question_stimuli` | 33 | `public.question_stimuli` | 63 | ✅ |
| `test_sessions` | 476 | `public.exam_attempts` | 478 | ✅ |
| `session_subject_scores` | 1.273 | `public.attempt_scores` | 1.276 | ✅ |
| `auth_users_identity` | 426 | `public.profiles` | 428 | ✅ |
| `transactions` | 258 | `public.orders` + `payments` | 328 | ✅ |
| `tryout_event_participants` | 104 | `public.event_registrations` | 104 | ✅ **cocok persis** |
| `leaderboard_entries` | 243 | `public.leaderboard_entries` | 244 | ✅ |
| `user_programs` | 430 | `public.user_tracks` | 431 | ✅ |
| `program_packages` | 7 | `public.products` | 26 | ✅ |
| `articles` | 1 | `public.articles` | 1 | ✅ **dipulihkan hari ini** |
| `event_certificates` | 51 | `public.certificates` | 51 | ✅ **dipulihkan hari ini** |

Kesimpulan: **jalur data inti (soal, jawaban, attempt, skor, profil, transaksi)
utuh.** Tidak ada kehilangan di area yang paling berisiko.

## B. Tidak punya padanan di Schema V2 — perlu keputusan

### B1. Voucher — 310 klaim, 6 voucher

`legacy_prod.vouchers` (6) dan `legacy_prod.voucher_claims` (310).

**Tidak ada tabel voucher sama sekali di `public`.** Fitur ini **memang sudah
dimatikan**, bukan lupa dimigrasikan:

- `app/actions/profile.ts` → `claimVoucherCode()` adalah **stub** yang selalu
  mengembalikan pesan: *"Voucher sedang dimigrasikan ke Promotions Schema V2 dan
  sementara belum dapat diklaim."*
- `/cpns/admin/voucher` sudah dialihkan ke `/admin/commerce/products`.

**Namun ada sisa UI mati:** `components/VoucherClaim.tsx` masih dirender di
`components/profile/ProfileTab.tsx:362`. Pengguna melihat form klaim voucher yang
**tidak akan pernah berhasil**.

**Rekomendasi:** sembunyikan form voucher dari profil sampai Promotions Schema V2
ada — saat ini ia menjanjikan sesuatu yang tidak bisa ditepati. Data 310 klaim
lama sebaiknya diarsipkan (biarkan di `legacy_prod`) karena tidak ada tujuannya.

### B2. Event bot — 130 nama, 100 entri

`legacy_prod.event_bot_names` (130) dan `tryout_event_bot_entries` (100).

`public.event_rankings` **kosong (0 baris)**. Namun ini **bukan** karena data
hilang: `recalculate_event_rankings()` (ada di produksi) menghitung ulang ranking
**dari `exam_attempts`**, bukan dari tabel bot. Jadi ranking event sekarang hanya
berisi peserta nyata.

**Ini kemungkinan perubahan desain yang disengaja** (bot tidak lagi dipakai untuk
mengisi papan peringkat). Perlu konfirmasi: apakah bot event memang dihentikan,
atau seharusnya masih tampil? Kalau masih diperlukan, fiturnya harus dibangun
ulang di Schema V2 — bukan sekadar memindahkan data.

### B3. Learning recommendations — 681 baris

`legacy_prod.learning_recommendations` (681).

`public.learning_recommendations` **ada** tetapi **bukan padanannya**:

| | Legacy | Schema V2 |
|---|---|---|
| Cakupan | `user_program_id`, `competency_id` | `user_id`, `track_id`, `knowledge_node_id` |
| Jenis | rekomendasi program lama | `diagnostic_baseline_v1` (TKA SMP) |

Tabel V2 dibuat 21 Agustus 2026 khusus untuk **TKA SMP** dan diisi otomatis oleh
trigger dari `user_knowledge_progress`. Aplikasi lama tidak punya konsep itu.

**Jadi 681 baris itu milik sistem rekomendasi lama yang tidak punya padanan.**
Halaman hasil diagnostik TKA membaca tabel V2 dan menghitung ulang
rekomendasinya — tidak bergantung pada data lama.

**Rekomendasi:** biarkan di `legacy_prod`. Memaksakan migrasi akan menghasilkan
rekomendasi yang tidak sesuai model kompetensi baru.

### B4. Sertifikat versi lama — sudah ditangani

51 baris `event_certificates` sudah dipulihkan hari ini ke `public.certificates`.

## C. Padanan ada tetapi berbeda konsep — bukan kehilangan

### C1. `user_subject_mastery` (257) vs `user_subject_progress` (7)

Skema berbeda: legacy menyimpan mastery per **kompetensi**, V2 menyimpan agregat
per **subjek**.

**Data lama tidak perlu dimigrasikan** karena `public.user_subject_progress`
dihitung ulang dari data attempt yang sudah ada lewat
`get_user_subject_progress()` — dan itu **lebih akurat** daripada angka lama
karena mencerminkan seluruh riwayat attempt di Schema V2.

Diverifikasi: agregat V2 cocok dengan perhitungan manual atas data attempt
(8/8 subjek, lihat `docs/STATUS.md`).

### C2. `user_knowledge_progress` (15) vs `user_subject_mastery` (257)

`user_knowledge_progress` adalah tabel **TKA SMP** (dibuat 21 Agt 2026) dan
**tidak dibaca langsung oleh kode aplikasi** — ia memicu
`learning_recommendations` lewat trigger. Model kompetensinya (`knowledge_node`)
baru dan tidak ada di aplikasi lama.

**Rekomendasi:** biarkan. Migrasi akan memetakan kompetensi lama ke node baru
secara spekulatif.

## D. Tabel legacy yang kosong (0 baris) — tidak relevan

`event_admin_assignments`, `event_custom_question_drafts`, `exam_blueprint_rules`,
`exam_questions`, `learning_contents`, `notification_campaigns`,
`notification_deliveries`, `notification_templates`, `organization_memberships`,
`organization_periods`, `product_access_rules`, `products`, `question_reviews`,
`question_tag_links`, `question_tags`, `question_versions`, `refund_requests`,
`subscriptions`, `user_program_token_ledger`.

Catatan: `user_program_token_ledger` kosong di legacy sementara
`public.wallet_transactions` berisi **87 baris** — jadi saldo token justru
**lebih lengkap** di schema baru.

## E. Yang TIDAK ditemukan

Tidak ada lagi kasus seperti artikel/gambar event/sertifikat, yaitu:
**tabel Schema V2 kosong sementara tabel legacy padanannya berisi data.**

Empat kandidat yang tersisa (voucher, event bot, learning recommendations,
mastery) semuanya **bukan** kasus itu — mereka tidak punya padanan langsung, dan
untuk voucher/bot/recommendations hal itu **disengaja oleh perubahan desain**.

## Rekomendasi

| Prioritas | Tindakan | Alasan |
|---|---|---|
| **P1** | Sembunyikan form klaim voucher dari halaman profil | Saat ini pengguna melihat form yang selalu gagal — menjanjikan sesuatu yang tidak bisa ditepati |
| **P2** | Konfirmasi apakah bot event masih diinginkan | Kalau ya, fiturnya harus dibangun ulang di Schema V2 (bukan migrasi data) |
| **P3** | Biarkan `learning_recommendations` & mastery lama di `legacy_prod` | Tidak ada padanan konseptual; V2 menghitung ulang dengan model baru |
| **P4** | Rencanakan penghapusan `legacy_prod` setelah semua selesai diverifikasi | Arsip bagus, tapi jangan selamanya — ia membingungkan (`tryout_events` vs `events`) |

## Cara mengulang audit ini

```sql
-- 1. Tabel legacy + jumlah kolom
select c.relname, c.relkind,
       (select count(*) from pg_attribute a
         where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped) as kolom
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='legacy_prod' and c.relkind in ('r','v','m','p')
order by c.relkind, c.relname;

-- 2. Jumlah baris semua tabel legacy sekaligus (query dibangun dinamis)
select string_agg(
  format('select %L as tabel, (select count(*) from legacy_prod.%I) as baris', c.relname, c.relname),
  ' union all ')
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='legacy_prod' and c.relkind='r';
```

Lalu bandingkan tabel berisi data dengan padanannya di `public`. Kuncinya:
**jangan berhenti pada nama tabel yang sama** — banyak yang berpindah nama
(`test_answers` → `attempt_answers`, `test_sessions` → `exam_attempts`,
`options` → `question_options`).
