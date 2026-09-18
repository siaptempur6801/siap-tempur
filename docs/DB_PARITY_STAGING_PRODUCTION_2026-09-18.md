# Paritas Database Staging ↔ Produksi — 2026-09-18

> Dokumen ini mencatat satu temuan integritas: **ledger migrasi produksi menyatakan
> beberapa migrasi sudah dijalankan, padahal objeknya tidak ada di database.**

## Ringkasan

Saat membandingkan staging (`lpgrivowdcepcxradavu`) dan produksi
(`llnttutwhtvxtdktiizo`) ditemukan bahwa produksi **kehilangan 7 fungsi dan 2
tabel** yang seharusnya ada, sementara ledger migrasinya menyatakan migrasi
pembuatnya sudah `applied`.

Akibat nyata yang sudah terkonfirmasi: halaman **`/tka/[level]/focus` gagal
dimuat di produksi**.

## Temuan

### 1. Objek hilang padahal migrasinya tercatat "applied"

Tujuh migrasi berikut tercatat di `supabase_migrations.schema_migrations`
**produksi**, tetapi objek yang mereka buat tidak ada:

| Migrasi | Objek yang seharusnya ada | Ada di produksi? |
|---|---|---|
| `20260823114955` | `app_private.cpns_legacy_mapping_reviews` (tabel) | ❌ |
| `20260823115204` | `app_private.cpns_legacy_import_stage` (tabel) | ❌ |
| `20260823121746` | `app_private.cpns_legacy_import_ready` (view) | ❌ |
| `20260823121746` | `app_private.cpns_legacy_mapping_review_summary` (view) | ❌ |
| `20260823121937` | `get_cpns_legacy_import_summary()` | ❌ |
| `20260823121937` | `import_reviewed_cpns_legacy_batch()` | ❌ |
| `20260823121937` | `import_reviewed_cpns_legacy_question()` | ❌ |
| `20260823121937` | `stage_cpns_legacy_question()` | ❌ |
| `20260823123041` | `upsert_cpns_legacy_mapping_review()` | ❌ |
| `20260902082133` | `get_tka_smp_learning_hierarchy()` | ❌ |

Tidak ada satu pun migrasi di repo yang menjatuhkan objek-objek tersebut. Jadi
**ledger produksi tidak akurat**, bukan kodenya yang salah.

### 2. Dampak yang benar-benar terlihat pengguna

`get_tka_smp_learning_hierarchy()` dipanggil
`TkaLearningHierarchyService.getHierarchy()`
(`src/services/tka-learning-hierarchy.service.ts`) **tanpa try/catch**, dan
service itu dirender `components/tka/TkaLearningHierarchy.tsx` di
`app/tka/[level]/focus/page.tsx`.

Karena RPC-nya tidak ada, halaman fokus TKA gagal dimuat di produksi.

Lima fungsi CPNS legacy lain hanya dipanggil
`scripts/migrate_cpns_legacy_reviewed_to_schema_v2.mjs` (alat impor konten),
bukan aplikasi berjalan — jadi tidak ada dampak pengguna, tetapi tetap
dipulihkan agar kedua environment setara.

### 3. Yang belum diketahui

**Penyebab pastinya tidak dapat dipastikan dari repo.** Yang dapat dipastikan:

- seluruh migration pembuat objek itu **ada** di repo dan lengkap;
- ledger produksi mencatatnya sebagai `applied`;
- objeknya tidak ada.

Dugaan yang paling masuk akal adalah sisa **cutover Schema V2**: migrasi
dijalankan/ditandai pada database sebelum cutover, lalu objeknya tidak ikut
terbawa ke `public` setelah cutover. Ini belum terbukti dan **tidak diklaim
sebagai fakta** — untuk memastikannya perlu membandingkan database sebelum
cutover, yang sudah tidak tersedia.

**Konsekuensi yang perlu diwaspadai:** karena ledger tidak akurat, `supabase db
push` **tidak dapat dipercaya sebagai jaminan** bahwa skema remote sesuai repo.
Perlu pemeriksaan objek langsung setelah setiap deploy migrasi.

## Perbaikan yang dilakukan

Migration `20260918170000_restore_missing_production_functions.sql`:

- Menjalankan ulang **7 migrasi asli** yang terdampak, dalam urutan aslinya,
  sehingga ketergantungan antar-objek (view → tabel, fungsi → view) terjaga.
- **Idempoten** — seluruh pernyataan memakai `if not exists` /
  `create or replace`. Diverifikasi dengan menjalankan dua kali di staging dan
  produksi tanpa perubahan hasil.
- Diterapkan ke **staging dan produksi**.

Satu objek staging **sengaja tidak** dipulihkan:
`app_private.cpns_skd_p1_import_stage`. Tabel itu tidak punya migrasi pembuat di
repo dan disebut di
`scripts/production_cutover_extract_staging_runtime_schema.sql` sebagai artefak
cutover — jadi ia memang milik staging saja.

## Hasil verifikasi

Perbandingan objek langsung (bukan dari ledger):

| Pemeriksaan | Staging | Produksi | Sama? |
|---|---|---|---|
| Tabel `public` | 100 | 100 | ✅ |
| Fungsi (`public` + `app_private`) | 95 | 95 | ✅ |
| View `app_private` | 2 | 2 | ✅ |
| Policy RLS | 96 | 96 | ✅ |
| Index | 386 | 386 | ✅ |
| Ledger migrasi | 167 | 167 | ✅ |
| **Selisih daftar fungsi** | — | — | ✅ **nol** |

Selisih yang tersisa **hanya data & platform**, bukan skema:

| Perbedaan | Keterangan |
|---|---|
| `app_private.cpns_skd_p1_import_stage` (staging 3 tabel, produksi 2) | Artefak cutover khusus staging — memang tidak boleh ikut |
| Papan `CPNS_NATIONAL_ALL_TIME` hanya di staging | Data uji staging, bukan bagian skema |
| `pg_cron` hanya ada di produksi | Ekstensi platform; migrasi yang menyentuhnya sudah dibuat aman (melewati blok bila ekstensi tidak ada) |
| Jumlah baris data | Wajar: produksi berisi data nyata (244 user di papan), staging berisi data uji |

## Yang TIDAK diverifikasi

Jalur terautentikasi `get_tka_smp_learning_hierarchy` **belum diuji dengan user
sungguhan** — pengujiannya memerlukan kredensial user produksi, yang tidak
tersedia di sesi ini.

Yang **sudah** terbukti:

- fungsi ada dan dapat dieksekusi (sebelumnya `function does not exist`,
  sekarang berjalan sampai ke guard-nya);
- guard `auth.uid()` bekerja: tanpa klaim JWT ia melempar
  `AUTHENTICATION_REQUIRED` — perilaku yang benar;
- definisinya **identik dengan staging** (dibandingkan lewat
  `pg_get_functiondef`);
- ACL benar: `authenticated` + `service_role`, `search_path = ''`.

**Rekomendasi:** buka `/tka/<jenjang>/focus` di produksi dengan akun peserta
nyata untuk menutup verifikasi ini.

## Rekomendasi lanjutan

1. **Verifikasi manual** halaman `/tka/<jenjang>/focus` di produksi dengan akun
   peserta.
2. **Jangan percaya ledger sendirian.** Setelah setiap `db push`, periksa objek
   yang seharusnya dibuat. Ledger di kedua environment sudah pernah terbukti
   tidak akurat.
3. **Pertimbangkan pemeriksaan paritas otomatis** sebagai bagian dari gate rilis:
   bandingkan daftar fungsi/tabel/policy antara staging dan produksi, dan
   gagalkan bila ada selisih di luar daftar putih.
4. **Bereskan referensi mati:** `advance_exam_section` dan `score_exam_attempt`
   disebut di komentar kode tetapi tidak ada di **kedua** environment dan tidak
   punya pemanggil. Komentar di `src/repositories/exam.repository.ts` dan
   `src/services/scoring.service.ts` sebaiknya diperbarui agar tidak menyesatkan.
