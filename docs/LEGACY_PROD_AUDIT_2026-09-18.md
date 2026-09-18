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

## Status tindak lanjut (2026-09-18)

| Prioritas | Keputusan pemilik produk | Status |
|---|---|---|
| **P1** — voucher | **Dihidupkan kembali**, bukan disembunyikan | ✅ selesai — `20260918180000_voucher_claim_schema_v2.sql` |
| **P2** — bot event | **Ditunda** ("tidak perlu dulu") | ⏸ ditunda — lihat catatan blocker di bawah |
| **P3** — data rekomendasi & mastery | Tahan dulu, minta detail | 📋 detail di bawah |
| **P4** — penghapusan `legacy_prod` | Minta detail | 📋 detail di bawah |

### P2 — catatan penundaan

Bot event ditunda. **Alasan teknis yang perlu diingat saat fitur ini dibuka lagi:**
event di Schema V2 **belum dapat dikerjakan sama sekali** — 104 orang terdaftar
di 4 event, tetapi **0 attempt** dan **0 soal**, karena exam yang dipakai event
tidak punya satu pun `exam_sections` (42 dari 48 exam lain punya).

Artinya bot tidak ada gunanya dihidupkan lebih dulu: menghidupkan bot berarti
memoles papan peringkat yang tidak akan pernah diisi peserta nyata. Urutan yang
benar: **perbaiki eksekusi event dulu, baru bot.**

Rincian bagian bot yang harus dipulihkan bila saatnya tiba:

| Bagian | Kondisi sekarang |
|---|---|
| Tabel `event_bot_names`, `tryout_event_bot_entries` | hilang di `public` (migration `202607050001` bergantung pada `tryout_events` nama lama) |
| `lib/event-leaderboard-bots.ts` (588 baris, ber-test) | dihapus di `dbd0096` saat bersih-bersih admin legacy — masih dapat dipulihkan dari git |
| `bot_count` di `public.events` | kolomnya tidak ada |
| `LiveLeaderboardEntry.is_bot` | masih ada di tipe, tetapi tidak pernah di-set |
| Panel admin pengatur jumlah bot | ikut terhapus bersama pohon admin legacy |

## P3 — Detail: data rekomendasi & mastery lama

### Isi data

| Tabel legacy | Baris | Padanan V2 | Baris V2 |
|---|---|---|---|
| `learning_recommendations` | 681 | `public.learning_recommendations` | 6 |
| `user_subject_mastery` | 257 | `public.user_knowledge_progress` | 15 |
| `competencies` + `subcompetencies` + `curriculum_domains` | 70 | `public.knowledge_nodes` | 469 |

### Mengapa migrasi TIDAK disarankan

**Model kompetensinya berbeda, bukan sekadar berbeda nama.** Legacy memakai
`competency_id` (70 baris kompetensi); V2 memakai `knowledge_node_id`
(469 node). Tidak ada pemetaan yang tersimpan antara keduanya — memetakan
681 rekomendasi ke node baru berarti **menebak** kemiripan semantik antar
kompetensi, dan hasilnya adalah rekomendasi belajar yang salah sasaran.

Yang lebih penting: **V2 sudah menghitung ulang.** Halaman hasil diagnostik
(`app/tka/[level]/diagnostic/[attemptId]/result/page.tsx`) membaca
`public.learning_recommendations` dengan tipe `diagnostic_baseline_v1`, yang
diisi otomatis oleh trigger dari `user_knowledge_progress` — turunan dari
attempt nyata peserta. Jadi peserta TKA tetap mendapat rekomendasi, dihitung
dari data mereka sendiri.

### Risiko masing-masing opsi

| Opsi | Risiko | Manfaat |
|---|---|---|
| **Biarkan (rekomendasi)** | Tidak ada | Tidak ada — data beku, tidak dibaca kode |
| Pindahkan apa adanya | **Tinggi** — 681 baris masuk ke tabel V2 tanpa `knowledge_node_id` yang sah, bisa merusak query diagnostik yang sudah jalan | Rekomendasi lama muncul lagi |
| Petakan kompetensi → node | **Tinggi** — pemetaan hasil tebakan; salah petakan = saran belajar salah | Rekomendasi lama relevan |
| Hapus | Sedang — kehilangan jejak historis, padahal ini satu-satunya salinan | Membersihkan |

**Rekomendasi: biarkan.** Ia beku, tidak dibaca kode, dan tidak mengganggu V2.
Nilainya sebagai arsip historis lebih besar daripada risikonya.

**Satu tindakan yang layak dipertimbangkan:** 257 baris `user_subject_mastery`
memuat mastery historis per user yang **tidak lagi terlihat peserta mana pun**
(halaman progres sekarang membaca `user_subject_progress` V2). Bila pemilik
produk ingin peserta melihat kembali capaian lamanya, itu butuh **fitur baru**
(membaca arsip), bukan migrasi data. Ini keputusan produk.

## P4 — Detail: penghapusan `legacy_prod`

### Ukuran sebenarnya — argumen "boros" ternyata lemah

| Objek | Ukuran |
|---|---|
| `legacy_prod` (74 objek) | **27 MB** |
| `public` | 55 MB |
| **Total database** | **107 MB** |

`legacy_prod` hanya **25% dari database**. Tabel terbesarnya `test_answers`
(13 MB) — sudah dimigrasikan ke `public.attempt_answers`, jadi salinan ini murni
cadangan.

### Yang bergantung padanya (titik kritis)

**1. Schema `archive` — dependensi struktural yang nyata.**

Produksi punya schema **ketiga** yang tidak terdokumentasi: `archive`, berisi 4
tabel (12 baris total) yang tampaknya sisa fitur "exam group" / B2B sekolah dan
**tidak ada migration pembuatnya di repo**:

| Tabel `archive` | Baris |
|---|---|
| `exam_groups` | 1 |
| `exam_group_memberships` | 1 |
| `exam_group_capabilities` | 2 |
| `exam_group_role_capabilities` | 8 |

Keempatnya punya **5 foreign key yang menunjuk ke `legacy_prod`**:

```
archive.exam_group_memberships → legacy_prod.profiles
archive.exam_groups            → legacy_prod.programs
archive.exam_groups            → legacy_prod.profiles
archive.exam_groups            → legacy_prod.organizations
archive.exam_groups            → legacy_prod.organization_periods
```

Konsekuensinya: `drop schema legacy_prod cascade` **akan ikut menghapus schema
`archive`** (atau gagal karena FK). Jadi penghapusan bukan satu perintah, dan
urutan ketergantungannya harus diselesaikan lebih dulu.

**2. Satu migration membaca `legacy_prod`** — yang baru dibuat untuk voucher:

```
20260918180000_voucher_claim_schema_v2.sql  →  legacy_prod.vouchers, legacy_prod.voucher_claims
```

Migration itu **sudah dijalankan di staging dan produksi**, dan blok pemindahan
datanya sudah dibungkus pengecekan `if not exists (select 1 from pg_namespace
where nspname='legacy_prod')`. Jadi menghapus `legacy_prod` **tidak** membuat
migration gagal — blok itu dilewati dengan `raise notice`.

Di luar itu, hanya skrip rehearsal cutover (`scripts/production_rehearsal_*`)
yang menyebutnya — alat sekali pakai, bukan jalur produksi.

**Yang TIDAK ditemukan (terverifikasi):** tidak ada fungsi di schema manapun
selain `legacy_prod` yang memanggilnya, dan tidak ada view produksi yang
bergantung padanya.

### Risiko penghapusan

| Risiko | Tingkat | Catatan |
|---|---|---|
| Migration voucher gagal setelahnya | **Rendah** | sudah ada guard; akan dilewati |
| Kehilangan satu-satunya rollback path ke data pra-cutover | **Tinggi** | setelah dihapus, TIDAK ADA cara memulihkan angka pra-cutover |
| Kehilangan sumber pemulihan bila ditemukan data tertinggal lain | **Sedang** | audit ini menemukan 3 kasus; audit berikutnya mungkin menemukan lagi |
| Kebingungan developer (`tryout_events` vs `events`) | **Rendah-sedang** | dapat diatasi dengan dokumentasi, bukan penghapusan |

### Rekomendasi: JANGAN hapus sekarang

Alasannya bukan teknis, melainkan nilai opsi:

1. **Biayanya nyata tapi kecil** — 27 MB. Backup database 107 MB tidak mahal.
2. **Nilainya besar** — ini satu-satunya jalan kembali ke keadaan pra-cutover.
   Tiga kasus data tertinggal sudah ditemukan dari arsip ini (artikel, gambar
   event, sertifikat), dan ketiganya **dipulihkan** karena arsipnya masih ada.
   Kalau arsip itu sudah dihapus, ketiganya hilang permanen.
3. **Waktu yang tepat untuk menghapus belum tiba** — domain publik masih
   ditahan, dan setiap audit baru masih mungkin menemukan data lain.

### Kapan sebaiknya dihapus

Setelah **semua** ini terpenuhi:

- domain publik sudah dibuka dan berjalan tanpa keluhan data hilang selama
  minimal satu siklus ujian penuh;
- audit `legacy_prod` diulang dan tidak lagi menemukan data tertinggal;
- ada backup database penuh di luar Supabase yang memuat `legacy_prod`.

### Bila nanti diputuskan dihapus — urutannya

```sql
-- 1. Selesaikan dulu schema `archive` (5 FK ke legacy_prod).
--    Putuskan: pindahkan ke public, atau ikut diarsipkan, atau dihapus.
--    JANGAN pakai `cascade` sebelum ini beres — cascade akan menghapusnya
--    tanpa Anda memutuskannya.

-- 2. Pastikan tidak ada objek produksi lain yang bergantung padanya.
select conrelid::regclass::text as dari_tabel, confrelid::regclass::text as ke_tabel
from pg_constraint
where contype='f'
  and confrelid in (select c.oid from pg_class c join pg_namespace n on n.oid=c.relnamespace
                     where n.nspname='legacy_prod')
  and conrelid not in (select c.oid from pg_class c join pg_namespace n on n.oid=c.relnamespace
                        where n.nspname='legacy_prod');

-- 3. Ekspor dulu (WAJIB, bukan opsional).
--    supabase db dump --linked --schema legacy_prod > legacy_prod-backup.sql
--    supabase db dump --linked --schema archive     > archive-backup.sql

-- 4. Baru hapus — satu per satu, bukan cascade.
--    drop schema archive cascade;
--    drop schema legacy_prod restrict;
```

**Jangan pernah menjalankan langkah 4 tanpa langkah 3.** Gunakan `restrict`
(bukan `cascade`) pada langkah terakhir supaya PostgreSQL **menolak** bila masih
ada yang bergantung — itu jaring pengaman terakhir.

### Opsi tengah: bekukan, jangan hapus

Bila kebingungan developer yang jadi kekhawatiran (bukan penyimpanan), cara yang
lebih murah daripada menghapus:

```sql
revoke all on all tables in schema legacy_prod from anon, authenticated;
comment on schema legacy_prod is
  'ARSIP BEKU pra-cutover Schema V2. Hanya-baca. JANGAN dipakai kode produksi. '
  'Lihat docs/LEGACY_PROD_AUDIT_2026-09-18.md sebelum menyentuh schema ini.';
```

Ini menghilangkan risiko "ada yang tidak sengaja memakainya" tanpa kehilangan
jalan pemulihan.

## Lampiran: perbedaan schema antar environment

Ditemukan saat memverifikasi dependensi P4. Perbedaan ini **disengaja** dan
tidak dianggap drift (gate paritas hanya membandingkan `public` + `app_private`).

| Schema | Staging | Produksi | Keterangan |
|---|---|---|---|
| `public` | 102 tabel | 102 tabel | ✅ setara |
| `app_private` | 3 tabel | 2 tabel | selisih 1 tabel artefak cutover (daftar putih gate) |
| `legacy_prod` | — | **73 tabel** | arsip pra-cutover, hanya di produksi |
| `archive` | — | **4 tabel** | sisa fitur exam group, **hanya di produksi**, tanpa migration di repo |
| `cron` | — | ada | `pg_cron` hanya tersedia di produksi |
| `realtime` | ada | — | Supabase Realtime aktif di staging |

Dua schema (`legacy_prod`, `archive`) tidak punya migration pembuat di repo.
Keduanya **artefak**, bukan bagian dari skema yang dikelola. Ini memperkuat
rekomendasi P4: perlakukan keduanya sebagai satu paket arsip dengan aturan yang
jelas, jangan dibiarkan tanpa dokumentasi seperti sekarang.

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
