# STATUS — Siap Tempur

> **Ini satu-satunya sumber kebenaran status project.**
> Terakhir diperbarui: **2026-09-21**
> Dokumen roadmap/checklist lama bersifat **historis** dan tidak boleh dijadikan acuan status — lihat [Peta dokumen](#peta-dokumen).

---

## 1. Produk

Platform tryout/latihan ujian berbasis web (B2C): **CPNS/SKD** dan **TKA** (jenjang sekolah).

Loop produk: **Latihan → ukur kemampuan → temukan kelemahan → perbaiki → ulangi.**

Stack: Next.js 16 (App Router) · TypeScript · Supabase (Auth + Postgres + RLS/RPC + Storage) · Midtrans · Vercel · Playwright + Vitest.

---

## 2. Environment

| Environment | Supabase project ref | Aplikasi | Catatan |
|---|---|---|---|
| Local | staging | `npm run dev` | `.env.local` menunjuk staging |
| Staging | `lpgrivowdcepcxradavu` | Vercel Preview | Sumber rehearse & E2E |
| Production | `llnttutwhtvxtdktiizo` | **domain publik SENGAJA TIDAK DIAKTIFKAN** | dark launch |

**Domain publik `siaptempur.id` sengaja tidak dibuka** karena project belum dinilai siap. DNS tetap mengarah ke Vercel, tetapi belum di-assign ke deployment yang hidup (saat ini 404).

> Status DB produksi (apakah Schema V2 sudah aktif) **belum diverifikasi** dari repo. Perlu pengecekan read-only di dashboard produksi — lihat [Bagian 7](#7-cara-verifikasi-cepat).

---

## 3. Status rilis

**Schema V2 Production Cutover: SELESAI 2026-09-01** (tag `production-v1-schema-v2-2026-09-01`).

- Runtime kanonik Schema V2 (98 tabel, RLS aktif di semua tabel) sudah menjadi `public` di produksi; skema lama diarsipkan ke `legacy_prod`.
- **Yang belum: eksposur publik.** Domain sengaja ditahan.
- Riwayat: `docs/PRODUCTION_CUTOVER_COMPLETION.md`, `docs/RELEASE_NOTES_2026-09-01_SCHEMA_V2.md`.

Cakupan Production V1: **CPNS/SKD + TKA SMP + Unified Admin + Commerce/Event**.
Di luar cakupan (ditunda): TKA SD, TKA SMA/SMK, B2B sekolah.

---

## 4. Milestone

| Milestone | Status |
|---|---|
| 1. Reviewer/Content Workspace + Unified Admin | ✅ selesai |
| 1.5 Admin UI/UX Hardening | ✅ selesai |
| 2. TKA SMP Mini + Core Product | ✅ selesai |
| 3. TKA SMP Learning Loop V1 | ✅ selesai |
| 4. TKA SMP Monetization | ✅ selesai (staging verified) — `docs/TKA_SMP_MONETIZATION_AUDIT.md` |
| 5. Schema V2 Production Cutover | ✅ cutover DB selesai; eksposur publik ditahan |
| 6. TKA SD hardening | ⏸ ditunda |
| 7. TKA SMA | ⏸ ditunda |
| 8. Platform expansion (B2B, notifikasi, analytics) | ⏸ ditunda |

---

## Question Bank hardening — 2026-09-21

**Kode, staging, dan produksi: migration terverifikasi ter-apply. Kode dirilis lewat commit ini;
domain publik tetap ditahan (dark launch).**
Migration: `supabase/migrations/20260921062621_question_bank_atomic_editor.sql`, tercatat di ledger
**staging `lpgrivowdcepcxradavu` dan produksi `llnttutwhtvxtdktiizo`**. Verifikasi read-only ke
produksi (2026-09-21): ledger 179 = 179 file repo tanpa selisih; kelima fungsi Question Bank ada
dengan signature dan mode keamanan sama; **md5 `pg_get_functiondef` identik dengan staging**; ACL
produksi: `anon` tidak dapat execute, `authenticated` dapat execute wrapper. Tidak ada fallback ke
penyimpanan non-atomik.

Perbaikan:
- Transport opsi JSON tanpa mengubah `|`, rumus, baris baru, Unicode, gambar, nilai null, atau skor 0.
  Review Workspace memakai parser/serializer yang sama; payload pipe lama tetap dapat dibaca.
- Detail editor dibaca melalui satu RPC terotorisasi, terlepas dari pagination/filter daftar.
  ID tidak ditemukan menampilkan pesan; opsi tersimpan tidak diganti opsi contoh.
  Filter kode mapel tidak dikenal memakai UUID kosong yang valid agar tidak memicu error database.
- Mutasi soal, opsi, pembahasan, materi, versi, dan audit berada dalam satu transaksi.
  Row lock + versi + `updated_at` menolak konflik; ID opsi yang masih ada dipertahankan.
- Actor berasal dari sesi, permission global dan status akun dicek di DB. Publikasi memerlukan
  `content.publish` dan status approved melalui workflow resmi. Konten review/approved/published
  terkunci; revisi memerlukan kembali ke draf. Arsip/revisi memeriksa konteks dan concurrency token.
- Form mencakup pembahasan, stimulus, materi, level kognitif, estimasi waktu, sumber, alasan perubahan,
  pratinjau rumus/gambar dan riwayat versi. Error mempertahankan input; snapshot editor tidak berubah
  diam-diam ketika Server Action merender ulang RSC setelah konflik. Pending/konfirmasi tutup form
  dan pemeliharaan filter, mapel, kata kunci, serta halaman telah diuji.
- Penyederhanaan UI (2026-09-22): editor dibagi menjadi tiga bagian yang mudah dipindai — Konteks,
  Isi & jawaban, dan Kelengkapan — dengan indikator kesiapan serta action bar pratinjau/simpan yang
  tetap terlihat. Tombol simpan memakai validasi native form secara eksplisit agar penyimpanan kedua
  setelah validasi gagal tetap konsisten. Desktop, tablet, dan mobile 390 px terverifikasi tanpa
  overflow.
- Error validasi server kini tampil di **setiap field yang terlihat** (tipe, tingkat kesulitan, materi,
  stimulus, sumber, level kognitif, estimasi waktu) dan terhubung `aria-describedby`; isu pada token
  identitas tersembunyi (`id`/`program`/`track`/`expectedVersion`/`expectedUpdatedAt`) dinaikkan menjadi
  pesan tingkat atas agar tidak ada "isian ditandai" tanpa tanda di layar. Dikunci 1 unit test.
- Tipe `category`: field `responseGroup` tampil langsung di luar "Pengaturan lanjutan" dan `required`;
  petunjuk aturan (minimal dua kelompok, tiap kelompok ≥2 opsi dan tepat satu jawaban benar) muncul
  saat tipe dipilih. Dikunci 2 unit test render.
- URL gambar opsi memakai satu kontrak `isHttpsImageUrl` (`lib/question-options.ts`) yang mencerminkan
  regex RPC; sisi aplikasi sengaja **lebih ketat** — URL berkredensial ditolak. **Utang:** regex SQL
  bisa *backtracking* (`user` + `:pass@host`) sehingga RPC masih menerima kredensial; memperketatnya
  menuntut migration baru (belum dilakukan).
- `window.confirm` dihapus dari seluruh permukaan admin: `AdminConfirmDialog` + `useAdminConfirm`
  (overlay, focus trap, Escape, pemulihan fokus); `ConfirmSubmit` memakai shell yang sama tanpa
  mengubah kontrak submit-nya. Uji regresi kini memindai `components/admin/**` + `app/admin/**`,
  bukan daftar berkas manual — dua berkas yang sebelumnya lolos (`QuestionBankForm`, `AdminModal`)
  kini tertutup.
- **Katalog editor dimuat malas (P3).** `get_question_bank_editor` mengembalikan seluruh stimulus
  satu track dan sebelumnya dipanggil di setiap pemuatan halaman daftar. Kini
  `QuestionBankEditorModal` memuatnya saat modal dibuka (trigger "Tambah soal" atau `defaultOpen`
  dari `?edit=`), memakai sesi pengguna langsung ke RPC; halaman daftar tidak lagi membayar payload
  itu. `AdminModal` mendapat `onOpen` (sekali, termasuk saat `defaultOpen`). Dikunci 2 unit test.
  **Koreksi angka:** pengukuran awal menyebut ~1 MB per track — itu artefak join (konten terkalikan
  jumlah knowledge node). Angka benar: **24 kB (SD) · 18 kB (SMP)**, jadi ini efisiensi arsitektur,
  bukan penyelamat payload besar.
- Dead code dibuang: `listQuestionOptions` (service) dan `serializeQuestionOption` (hanya dipakai
  test) beserta union tipe `question_options` di `listRowsForIds`.

Ditunda dengan bukti (bukan kelalaian):
- `v_snapshot` di `mutate_question_bank` di-assign tanpa dipakai. Migration bersifat immutable;
  menghapusnya menuntut migration baru tanpa manfaat fungsional → dibiarkan.
- Retry kode soal `QB-<16 hex>`: `questions_question_code_key` unik dan ruang nama 64-bit; tabrakan
  praktis nol → tidak ada retry.
- Index `pg_trgm` untuk `stem ilike '%…%'`: `EXPLAIN ANALYZE` di staging (1.086 soal) = Seq Scan,
  cost 137 — sub-milidetik. Ditunda sampai jumlah soal tumbuh.

Verifikasi selesai:
- Lint tanpa error/warning, typecheck, **608 unit test / 81 file**, build lolos.
- Build tetap memiliki warning lama di `lib/event-certificate-pdf.ts` tentang tracing filesystem;
  warning konfigurasi Vitest lama juga masih ada. Keduanya di luar perubahan Question Bank.
- Hardening lanjutan (2026-09-21): token concurrency `expectedUpdatedAt` kini hanya menerima ISO 8601
  yang benar-benar dikirim Postgres (`isIsoTimestamp` di `lib/question-bank.ts`); format longgar
  seperti `21 Sep 2026` ditolak sebelum menyentuh RPC. Schema tindakan workflow dipindah ke
  `questionBankWorkflowSchema` agar dapat diuji — 2 unit test baru.
- `npm run test:question-bank`: seluruh gate DB + browser lulus pada aplikasi lokal port 3105
  yang terhubung staging. CPNS serta TKA SD/SMP/SMA; single/multiple/category; akses anonim/FINANCE;
  konteks silang; dua penyimpanan bersamaan; audit/versi/ID opsi; edit di luar hasil daftar;
  validasi gagal lalu simpan ulang; konflik dua tab tetap mempertahankan input;
  buat soal melalui browser; konfirmasi unsaved; invalid ID; filter mapel tidak dikenal; workflow review tiga tahap sampai
  publikasi dan revisi kembali ke draf. Fixture milik run dibersihkan di `finally`.
- Chromium desktop 1440 px, tablet 1024 px, mobile 390 px: tidak ada overflow halaman/modal;
  tidak ada page error / console error pada alur yang diuji, pratinjau dirender.
- Gate admin lokal (`node scripts/local-gates/run-gate.mjs admin`): **60 passed, exit 0** (dua kali,
  termasuk setelah lazy-load editor). Dua spec instansi diperbaiki karena commit Fase 2 menambahkan
  dialog konfirmasi pada "Hapus exam" dan `role="status"` ringkasan filter: spec kini menekan tombol
  konfirmasi, mempersempit locator status, dan helper `removeFirstParticipant` menunggu baris
  benar-benar berkurang — timeout tetap 1,5 detik terbukti salah (trace menunjukkan POST konfirmasi
  masih in-flight). 11 instansi uji tertinggal dari run gagal dibersihkan; staging kembali 0 instansi uji.
- Uji SQL dalam transaksi **ROLLBACK**: kegagalan audit di langkah akhir membatalkan soal, opsi,
  dan version history; pengeditan saat attempt aktif ditolak; manager tanpa `content.publish`
  tidak dapat menerbitkan; akun suspended ditolak; pergantian mapel melepas pemetaan materi
  dari mapel sebelumnya dan menyimpan materi utama baru dalam satu transaksi.
- ACL diverifikasi: wrapper public SECURITY INVOKER, fungsi privileged di app_private,
  search_path kosong, anon tidak dapat execute. Security advisor tidak melaporkan objek Question Bank
  baru; **64 temuan lain di staging masih ada** dan bukan scope hardening ini.

**Gate CI (2026-09-21):** `.github/workflows/question-bank-staging-e2e.yml` menjalankan
`npm run test:question-bank` pada PR/dispatch yang menyentuh berkas Question Bank, di runner
GitHub-hosted dengan secret staging yang sudah ada; aplikasi dibangun lalu dijalankan di
`127.0.0.1:3105`. **Belum pernah dieksekusi** karena GitHub Actions masih terblokir billing
(lihat Blocker eksternal); jalankan `workflow_dispatch` setelah billing pulih.

Cakupan ini bukan klaim bebas bug untuk seluruh platform atau seluruh browser. Yang belum
diverifikasi: CI remote untuk perubahan ini dan browser selain Chromium. Database produksi sudah
diverifikasi untuk migration (lihat di atas).

File dalam perubahan Question Bank ini (perubahan admin lokal lain yang sudah ada dipertahankan):
- `app/actions/question-bank.ts`, `app/actions/admin-v2.ts`, `app/actions/content-review.ts`
- `app/admin/AdminOperationsWorkspace.tsx`, `app/admin/content/questions/page.tsx`,
  `app/admin/content/review/page.tsx`
- `components/admin/QuestionBankForm.tsx`, `components/admin/QuestionOptionsEditor.tsx`,
  `components/admin/AdminModal.tsx`, `components/admin/AdminConfirmDialog.tsx` (baru),
  `components/admin/useAdminConfirm.tsx` (baru), `components/admin/QuestionBankEditorModal.tsx` (baru),
  `components/admin/ConfirmSubmit.tsx`
- `lib/question-bank.ts`, `lib/question-options.ts`
- `src/services/question-bank.service.ts`, `src/services/admin-v2.service.ts`
- `types/database.types.ts`, migration di atas
- `tests/unit/question-bank.test.ts`, `tests/unit/question-bank-category-editor.test.tsx` (baru),
  `tests/unit/question-bank-editor-lazy.test.tsx` (baru),
  `tests/unit/admin-question-options.test.ts`, `tests/unit/admin-confirm-submit.test.ts`
- `tests/e2e/specs/20-instansi-join.spec.ts`, `tests/e2e/specs/21-instansi-exam.spec.ts`,
  `tests/e2e/admin-roles.ts`
- `scripts/test-question-bank.mjs`, `.github/workflows/question-bank-staging-e2e.yml`, `package.json`, `docs/STATUS.md`

---

## Review Queue hardening — 2026-09-21

**Kode, staging, dan produksi: migration terverifikasi ter-apply.**

Penyederhanaan UI (2026-09-22): halaman memperlihatkan alur `Pilih soal → Periksa isi → Ambil
tindakan`, progres Editorial/Academic/Technical QA/Terbit, dan tugas berikutnya pada setiap baris.
Detail soal ditempatkan sebelum kartu tindakan. Pada mobile, memilih soal langsung memusatkan layar
ke detail dan menyediakan tombol kembali ke antrean; filter/ringkasan disembunyikan selama detail
aktif. Gate Review lulus 5/5 pada build production lokal, termasuk deep-link mobile 390 px dan
assertion tanpa overflow horizontal.

Perbaikan review massal (2026-09-22): fitur kini dibuka sebagai mode fokus lewat tombol `Buka
review massal`, otomatis berpindah ke konteks CPNS/SKD, dan mempertahankan mode tersebut setelah
setiap Server Action. Panel tidak lagi menghilang diam-diam saat query gagal/kosong; jumlah soal
yang akan diproses tampil pada setiap tombol, sedangkan langkah yang sudah selesai dinonaktifkan.
Alur produksi 80 soal diverifikasi penuh dalam transaksi rollback: submit 80, klaim dan approve
Editorial/Academic/QA masing-masing 80, publish 80, lalu kembali utuh menjadi 80 draft.

### P1-b — pencarian aman + pengukuran payload
- `escapePostgrestValue` dipindah ke satu modul bersama `lib/postgrest-filter.ts` dan dipakai
  `admin-v2.service` (produk/exam/soal) serta `content-review.service`. Sebelumnya pencarian review
  hanya membuang `%_`, sehingga `,()` dari kata kunci bisa mengubah bentuk ekspresi `or=(...)`
  PostgREST. Dikunci unit test, termasuk kontrak "kedua service memakai helper bersama".
- **Payload detail TIDAK dibatasi — dan memang tidak perlu (dengan bukti).**
  `get_content_question_detail` mengembalikan `versions` tanpa batas dan `stimulus_candidates`
  sampai 100. Pengukuran staging: `question_versions` 662 baris dengan **maksimum 1 versi per soal
  (~2 kB/soal)**; stimulus per subject maksimum **18 kB**. Batas buatan tidak ditambahkan karena
  tidak ada masalah yang bisa dibuktikan; dicatat sebagai kandidat bila data tumbuh.

### P1-a — optimistic concurrency + ID opsi (migration)
- `save_question_draft` kini menerima `p_expected_version` + `p_expected_updated_at`, membandingkannya
  di bawah row lock, dan menolak token basi dengan `QUESTION_VERSION_CONFLICT`. Sebelumnya dua editor
  dapat saling menimpa tanpa peringatan (last-write-wins).
- Opsi di-upsert `on conflict (question_id, option_key)`; ID opsi yang masih ada dipertahankan
  (sebelumnya seluruh opsi dihapus lalu disisipkan ulang).
- Migration `20260921120000_review_queue_draft_concurrency_v1.sql` **ter-apply di staging DAN produksi**
  (2026-09-21, GO eksplisit; ledger via `migration repair`). Diverifikasi langsung di produksi:
  `scripts/db-verify/review-draft-concurrency.sql` lulus 5/5 (draft v1 → v2, ID opsi dipertahankan,
  token basi ditolak, token untuk soal baru ditolak).
- Verifikasi SQL rollback `scripts/db-verify/review-draft-concurrency.sql` — 5 pemeriksaan:
  `draft v1` → simpan kedua `v2`; ID opsi dipertahankan `true`; token basi `QUESTION_VERSION_CONFLICT`;
  token untuk soal baru `QUESTION_VERSION_INVALID`.
- **Sisa risiko:** saat konflik, halaman review memuat ulang dan input form hilang (form di-render
  server), berbeda dari Question Bank yang membekukan snapshot di klien. Pesan galat menyuruh
  menerapkan ulang pada versi terbaru.

### P2-a — paginasi antrean + filter di database
- Antrean review kini **25 baris/halaman** dengan `total` exact (sebelumnya jendela
  250 baris tanpa jalan menuju sisanya; staging CPNS/SKD 573 soal, TKA/SMP 300).
- Filter `stage` diterjemahkan ke status (`editorial` = submitted + editorial_review)
  dan filter `reviewer`/`unassigned` memakai `questions.reviewer_id` — semuanya
  berjalan di database, bukan atas jendela. Kode mapel tak dikenal memakai UUID
  kosong yang valid.
- `unassigned`, `assignedToMe`, dan angka per tahap kini **exact agregat**, bukan
  hasil menghitung baris yang tampil; dashboard memakai angka yang sama dan hanya
  menarik 6 baris antrean.
- Deep link `?question=` ke soal di luar halaman tetap memuat soal itu (dipakai
  "Buka alur review" dari Question Bank); id non-UUID tidak menyentuh query.
- Verifikasi: **623 unit test / 83 file**; gate Review 5 passed exit 0.

### P2-b — aksi massal tanpa N+1
- `submit_questions_for_review` dan `publish_questions` (migration
  `20260921140000_review_batch_submit_publish_v1.sql`) memanggil fungsi workflow yang SAMA di dalam
  satu transaksi — aturan tidak digandakan. Action massal kini satu panggilan, bukan satu RPC per
  soal (batch 500 soal = 500 round-trip berurutan). Batas 1.000 id per panggilan (`BATCH_TOO_LARGE`).
- **Ter-apply di staging DAN produksi** (2026-09-21, GO eksplisit; ledger via `migration repair`).
- Verifikasi SQL rollback `scripts/db-verify/review-batch-flow.sql` — 7 pemeriksaan: 3 draft →
  submit batch `3` + 3 pending editorial; publish non-approved ditolak tanpa mengubah status; array
  kosong `0`; >1.000 → `BATCH_TOO_LARGE`. Lulus di staging **dan produksi** (tanpa sisa data;
  jumlah soal produksi tidak berubah).

### P2-c — tipe soal terhubung ke editor
- `ReviewQuestionFields` (client) membagi satu state tipe soal dengan `QuestionOptionsEditor` dan
  mengembalikan fragment, sehingga field-field di antaranya tetap menjadi grid item form induk.
  Memilih "Category" kini langsung memunculkan field `responseGroup` yang wajib.

### P2-d — penjaga perubahan belum tersimpan
- `ReviewDraftForm` (client) menandai `data-dirty` dan memasang `beforeunload` selama ada perubahan;
  form create & edit memakainya. Sebelumnya menutup tab membuang pekerjaan tanpa peringatan.

### P3 — label audit, satu sumber kode batch, paritas validasi opsi
- **Label audit manusiawi.** `adminAuditLabel` (`lib/admin-format.ts`) dipakai di Audit Trail
  Review Queue dan tabel `/admin/audit` (opsi filter ikut dilabeli; kode mentah tetap di `title`).
  Aksi tak dikenal tetap terbaca (pemisah jadi spasi). Dikunci 3 unit test.
- **Satu sumber kode batch.** `REVIEW_BATCH_CODES`/`isReviewBatchCode` pindah ke `lib/review-batch.ts`;
  panel dan action mengimpornya. Sebelumnya daftar ditulis terpisah (`BATCH_CODE` di komponen,
  `BATCH_CODES` di action) sehingga menambah batch bisa membuat panel menawarkan kode yang ditolak.
- **Paritas validasi opsi (ditemukan drift nyata).** `scripts/db-verify/question-option-parity.sql`
  menjalankan matriks 12 payload melalui `mutate_question_bank` (QB) dan `save_question_draft`
  (Review) dan membandingkan hasilnya. Awalnya **3/12 berbeda**: Review menerima kode opsi berformat
  bebas, skor 3 desimal, dan URL gambar non-https; batas panjang/urutan kategori juga tidak diperiksa.
  Migration `20260921160000_review_option_validation_parity_v1.sql` memperketat `save_question_draft`
  (validasi saja, signature tidak berubah) → **12/12 sepakat di staging DAN produksi**
  (2026-09-21, GO eksplisit; ledger via `migration repair`). Verifikasi produksi: parity 12/12,
  `review-draft-concurrency` tetap 5/5, 978 soal tidak berubah, 0 fungsi uji tertinggal.

### Harness & higiene yang ditemukan saat verifikasi
- Spec `7-content-review-workflow` basi dan tidak pernah berjalan (runner self-hosted offline):
  locator login cocok ganda, label peran kini manusiawi ("Editor Konten"/"Reviewer Konten"), status
  kini "Disetujui"/"Terbit", Server Action dengan JS menjawab 200 (bukan 303), dan checkbox jawaban
  benar tidak pernah default A. Semua diperbaiki.
- Emulator `ci-helper` belum membersihkan artifact content editor (soal CWS-*) dan baris review
  (`content_reviews.reviewer_id` RESTRICT), sehingga cleanup gagal "Database error deleting user".
  Disamakan dengan Edge Function; `supabase/functions/ci-e2e-user` ikut ditambal
  (**belum di-deploy** — perlu keputusan deploy terpisah).
- `run-gate.mjs`: `stopAll` kini SIGKILL setelah grace period — emulator pernah tertinggal hidup,
  memegang port 54399, dan membuat run berikutnya memakai kode LAMA (verifikasi menyesatkan).
  Kegagalan hapus user CI tidak lagi senyap (sebelumnya dihitung sebagai "N user dihapus").
- Higiene staging: 7 exam draft CI (2026-09-19) + sisa user `ci-*` dihapus; kini **0 user ci-*** dan
  **0 soal CWS E2E**.

### Verifikasi
- Lint 0/0 · typecheck · **628 unit test / 85 file** · build lolos.
- Gate Review lokal (gate baru `node scripts/local-gates/run-gate.mjs review`): **5 passed, exit 0**
  (setup + 3 spec + cleanup); port dibersihkan setelah run.
- Gate Question Bank: lulus penuh (regresi `lib/postgrest-filter` di jalur pencarian admin).
- Gate admin: hijau terakhir 60 passed; perubahan ini tidak menyentuh permukaan admin.

File: `lib/postgrest-filter.ts` (baru), `lib/review-batch.ts`, `lib/admin-format.ts`,
`src/services/admin-v2.service.ts`, `src/services/content-review.service.ts`,
`app/actions/content-review.ts`, `app/actions/content-review-batch.ts`,
`app/admin/content/review/page.tsx`, `app/admin/AdminOverview.tsx`, `app/admin/audit/page.tsx`,
`components/admin/ReviewQuestionFields.tsx` (baru), `components/admin/ReviewDraftForm.tsx` (baru),
`components/admin/ReviewBatchPanel.tsx`, `supabase/migrations/20260921120000_*.sql`,
`supabase/migrations/20260921140000_*.sql`, `supabase/migrations/20260921160000_*.sql`,
`scripts/db-verify/review-draft-concurrency.sql`, `scripts/db-verify/review-batch-flow.sql`,
`scripts/db-verify/question-option-parity.sql`, `scripts/local-gates/ci-helper.mjs`,
`scripts/local-gates/run-gate.mjs`, `supabase/functions/ci-e2e-user/index.ts`,
`tests/e2e/specs/7-content-review-workflow.spec.ts`, `tests/unit/postgrest-filter.test.ts`,
`tests/unit/review-draft-concurrency.test.ts`, `tests/unit/review-batch-n1.test.ts`,
`tests/unit/content-review-counts.test.ts`, `tests/unit/admin-audit-label.test.ts`,
`docs/STATUS.md`.

---

## 5. Goal aktif

1. **Product Experience V1.1** — UI/UX, UX writing, copywriting, GTM (GitHub issue #21–#24).
   Backlog: `docs/PRODUCT_EXPERIENCE_V1_1_IMPLEMENTATION_BACKLOG.md`.
2. **Menutup blocker keamanan P0** sebelum domain dibuka (bagian 6).
3. **Merapikan maintainability**: satu sumber kebenaran status (dokumen ini), CI hijau, riwayat migrasi disamakan.

Goal berikutnya (belum aktif): **CPNS Instansi Managed Service** (B2B) — PRD di `docs/notes/prd-cpns-instansi-managed-service.md`.

---

## 6. Blocker aktif

### P0 — keamanan (kebocoran kunci jawaban)

Keduanya **terkonfirmasi AKTIF** di staging (schema dump read-only) **dan di produksi** (query read-only + uji eksploitasi 2026-09-16):

| # | Temuan | Status kode | Status DB |
|---|---|---|---|
| P0-1 | `public.get_content_question_detail` bisa dipanggil user login mana pun dan mengembalikan `is_correct`, `score`, `explanation` (guard memakai `status in ('approved','published')`) | ✅ diperbaiki | ✅ **staging 2026-09-16** · ✅ **produksi 2026-09-16** |
| P0-2 | `GRANT SELECT ON public.question_versions TO authenticated` + policy membuka snapshot jawaban soal approved/published | ✅ diperbaiki | ✅ **staging 2026-09-16** · ✅ **produksi 2026-09-16** |

**Bukti sebelum perbaikan di produksi (2026-09-16):** guard `VULNERABLE`, grant + policy ada; uji dengan identitas user biasa (transaksi di-rollback) mengembalikan `options`, `explanation`, dan **`is_correct` = true** → kunci jawaban benar-benar terbaca.

**Bukti sesudah perbaikan (staging & produksi):**

| Skenario | Hasil |
|---|---|
| User login biasa (tanpa permission) memanggil `get_content_question_detail` | ❌ `Question detail access denied` (benar) |
| User login biasa membaca `question_versions` | ❌ `permission denied for table question_versions` (benar) |
| User dengan `content.read/review/publish` memanggil RPC | ✅ tetap boleh (workspace review tidak rusak) — *diverifikasi di staging; produksi belum punya user ber-role* |
| Integritas data | ✅ tidak berubah (produksi: 428 profil, 1088 soal sebelum & sesudah) |

- Migration perbaikan: `supabase/migrations/20260916213000_*.sql`, `20260916213100_*.sql` — **sudah di-apply ke staging dan produksi**, tercatat di `supabase_migrations.schema_migrations` masing-masing.
- Regression test: `tests/unit/answer-key-access-contract.test.ts`
- Catatan: apply memakai `supabase db query --file` karena `supabase db push` tidak bisa jalan (riwayat migrasi tidak sinkron, bagian 8).

### P1 — operasional produksi (temuan 2026-09-16)

- ✅ **Admin produksi sudah ditetapkan (2026-09-16):** `SUPER_ADMIN` untuk `halimdirga8@gmail.com` (`d8c37906-29c8-4a47-8c10-ed2e19dc0de2`). Terverifikasi via `get_user_authorization` → 21 permission termasuk `admin.access`. Sebelumnya `public.user_roles` = 0 baris sehingga **tidak ada seorang pun** yang bisa mengakses `/admin`. *Perbaikan P0-1/P0-2 tidak menimbulkan masalah ini — guard baru hanya menegakkan apa yang seharusnya.*
- [ ] User konten (`CONTENT_EDITOR` / `CONTENT_REVIEWER`) di produksi belum ada — bisa ditetapkan oleh admin dari panel.
- ⚠️ **Flag `tka.smp.monetization_enforcement` = ON (rollout 100%, mode `enforced`) di produksi**, padahal `docs/TKA_SMP_MONETIZATION_AUDIT.md` menyatakan enforcement produksi masih NO-GO. Dampak: TKA SMP Full Tryout terkunci penuh tanpa Tempur Pass, Mini Tryout hanya 1 percobaan gratis. Perlu keputusan sebelum domain dibuka.
- ✅ **Diperbaiki (2026-09-16):** `updateEventCertificateName` (`app/actions/admin.ts`) dulu membaca kolom `profiles.role` yang **sudah tidak ada** di Schema V2 → query error tanpa dicek, sehingga aksi ini selalu `Unauthorized` bahkan untuk admin asli. Kini memakai `isAdmin()` (permission service). Regression test: `tests/unit/admin-authorization-contract.test.ts`.

### P0 — operasional

- CI di `main` sempat merah ±12 hari karena locator E2E basi. **Sudah diperbaiki & diverifikasi lokal** (24/24 test publik lolos); tinggal dipastikan hijau di GitHub setelah push.

### P1 — keamanan/kualitas

#### Perbaikan audit 2026-09-18 (P0 & P1)

Audit menyeluruh: `docs/AUDIT_2026-09-18.md`. Perbaikan yang sudah dikerjakan:

| Temuan | Perbaikan | File |
|---|---|---|
| **P0** Submit ujian gagal untuk pengguna dengan riwayat banyak (`.in()` tanpa batas → `UND_ERR_HEADERS_OVERFLOW`) | `listScores` di-batch lewat `chunkValues()`; `listAllCompletedAttemptIds` diberi batas eksplisit yang gagal keras, bukan memotong agregat diam-diam | `src/repositories/progress.repository.ts` |
| **P0** Loop N+1: 110 UPDATE berurutan per submit Full Tryout | Satu RPC batch `update_attempt_answer_scores`; **plus fallback** ke jalur lama bila RPC belum ada | `src/services/scoring.service.ts`, `src/repositories/attempt.repository.ts` |
| **P0** Write-on-GET dengan service role di halaman publik anonim | Dihapus; `/cpns` tidak lagi menulis ke DB saat render dan tidak lagi memakai klien service role | `app/cpns/page.tsx` |
| **P1** `lib/audit-log.ts` gagal 100% senyap (4 nama kolom tidak ada) | Nama kolom diselaraskan ke skema nyata; kegagalan naik ke `logger.error` | `lib/audit-log.ts` |
| **P1** Bug: React key dari field yang dapat diedit → admin hanya bisa mengetik 1 karakter per klik | Identitas baris stabil (`row.id`) | `components/admin/QuestionOptionsEditor.tsx` |
| **P1** `fraud_status` Midtrans tidak pernah divalidasi | `resolveMidtransFulfilment()`; `deny` → ditolak, `challenge` → pending; `fraud_status` masuk idempotency key | `lib/midtrans-status.ts`, `app/api/payments/webhook/route.ts` |
| **P1** `CRON_SECRET` dibandingkan `===` (tidak timing-safe) | Helper bersama `lib/timing-safe.ts`; `lib/csrf.ts` memakai helper yang sama | `lib/timing-safe.ts`, `app/api/cron/reconcile-payments/route.ts` |
| **P1** Kunci jawaban dibaca dari opsi HIDUP, bukan snapshot | Kunci dibekukan di `question_snapshot` saat attempt dibuat; attempt lama pakai fallback + `logger.warn` | `src/repositories/exam.repository.ts`, `src/services/scoring.service.ts` |
| **P1** Dependency mati | `isomorphic-dompurify`, `@tiptap/extension-underline` dihapus | `package.json` |

**Keputusan produk 2026-09-18 (dari pemilik produk):**

| Aspek | Keputusan | Status |
|---|---|---|
| Attempt lama bila kunci soal diperbaiki | **Dibiarkan** — tidak ada perhitungan ulang data historis | ✅ diterapkan |
| Kelulusan TKA | **Tidak ada konsep lulus** | ✅ panel "Status Kelulusan" dihapus |
| Passing grade 65/80/166 | **Masih berlaku**, harus mudah diubah admin | ✅ database jadi sumber otoritatif (`src/repositories/passing-grade.repository.ts`); `PASSING_GRADES` turun jadi cadangan. Admin sudah bisa mengubahnya lewat field "Passing score" di panel exam |
| Kode mati legacy admin | Boleh dibongkar | ✅ selesai (lihat bagian berikut) |
| Fitur Event Tryout Akbar | **Masih dipakai** | ✅ auto-close diarahkan ke `events` V2 + dijalankan dari cron |

**Migration:** `20260918041911_batch_update_attempt_answer_scores.sql` — **ter-apply di staging DAN produksi
(2026-09-18).** Diverifikasi langsung ke database produksi lewat `supabase db query --linked`:

| Pemeriksaan produksi | Hasil |
|---|---|
| Identitas target | 100 tabel `public`, **428 profil, 1088 soal** — cocok dengan angka produksi yang tercatat |
| Fungsi ada | `update_attempt_answer_scores(jsonb)` ✓ |
| Tercatat di ledger | `supabase_migrations.schema_migrations` → `20260918041911` ✓ (162 baris, sama dengan staging) |
| Konfigurasi keamanan | `security_definer=true`, `search_path=""`, ACL **hanya** `postgres` + `service_role` ✓ |
| Perilaku (diuji dalam transaksi yang DI-ROLLBACK) | `'[]'` → `0`; payload bukan array → `22023 update_attempt_answer_scores expects a JSON array`; id tidak ada → `0` ✓ |
| Integritas setelah uji | 428 profil / 1088 soal / 479 attempt / 17109 jawaban — **tidak berubah** ✓ |

`supabase db push --dry-run` → *"Remote database is up to date."* (`supabase db push` harus dijalankan
**dari dalam folder `supabase/`** — dari root ia gagal dengan `Cannot find project ref`.)

> **Catatan operasional:** CLI Supabase hanya menautkan SATU project pada satu waktu. Untuk memeriksa
> produksi, tautkan ulang dengan `supabase link --project-ref llnttutwhtvxtdktiizo`, lalu kembalikan
> ke staging (`--project-ref lpgrivowdcepcxradavu`). `supabase db query --linked` bekerja tanpa DB
> password karena lewat Management API, dan **wajib** dibungkus `begin; … rollback;` untuk uji tulis.

#### Pemindahan modul admin + penghapusan pohon legacy (2026-09-18, langkah 1–3)

Empat halaman di `app/cpns/admin/**` **bukan kode mati** — mereka implementasi hidup untuk rute
kanonik, diimpor sebagai modul oleh delegator di `app/admin/content/**`. Keempatnya kini page nyata
di pohon kanonik; sisa 11 file pohon legacy dihapus; **44 file / 12.330 baris** kode tak terjangkau
ikut dihapus (termasuk `app/actions/admin.ts` 1.302 baris dan `TryoutAkbarClient` 2.052 baris).

Redirect legacy dipindahkan dari `proxy.ts` ke `next.config.ts` — **sekaligus memperbaiki bug**:
peta lama dijalankan dengan `return` di awal `proxy()`, sebelum cookie sesi di-refresh dan sebelum
header CSP dipasang, sehingga request ke rute legacy tidak pernah melewati `updateSession()`.

Redirect berbasis tab (`?tab=...`) tetap di `proxy.ts` karena `redirects()` tidak bisa mencocokkan
query — tetapi kini dijalankan **setelah** CSP dan cookie dipasang, cookie sesi hasil refresh ikut
dibawa, dan konteks `program`/`track` dari URL asal dipertahankan (dulu selalu dipaksa CPNS/SKD).

`app/actions/admin-v2.ts`: `finish()` dulu mengarahkan ke `/cpns/admin?tab=...` yang sudah tidak
punya halaman, sehingga `revalidatePath` menunjuk rute yang tidak pernah dirender dan
`?ok=`/`?error=` tidak pernah sampai ke layar. Kini diarahkan ke rute kanonik per tab.

**Cakupan test:**

| Lapis | Jumlah | Dapat dijalankan lokal? |
|---|---|---|
| Unit — peta redirect (`admin-redirect-map.test.ts`) | 9 test | ✅ ya |
| E2E publik (spec 9) — routing & redirect legacy | 3 test baru, 33 total | ✅ ya, tanpa kredensial |
| E2E ber-auth (spec 10) — halaman admin dirender | 5 test baru, 10 total | ✅ ya, lewat gate lokal (tanpa OIDC) |

> ✅ **E2E ber-auth halaman admin SUDAH DIJALANKAN dan HIJAU** (2026-09-18).
>
> ```bash
> node scripts/local-gates/run-gate.mjs admin
> # hasil: 12 passed (1.1m), exit 0, 0 user ci-* tersisa di staging
> ```
>
> Gate lokal memakai **emulator Edge Function** (`scripts/local-gates/ci-helper.mjs`) dengan
> service-role staging, sehingga tidak memerlukan GitHub OIDC dan tetap bisa dijalankan meski
> GitHub Actions terblokir billing. Kelima test baru lolos — artinya halaman
> `/admin/content/review`, `/admin/content/articles`, `/admin/content/articles/create`, dan
> `/admin/content/articles/[id]/edit` **benar-benar merender** saat sudah login, bukan hanya
> lolos guard routing.
>
> Catatan penting: gate Admin ini **tidak** memerlukan deployment Vercel Preview. Dengan
> `CI_E2E_HELPER_BASE_URL` diset ke emulator lokal, `assertPreviewUrl()` mengizinkan localhost.
> Ini menutup satu-satunya celah verifikasi yang tersisa dari pemindahan modul admin.

#### Auto-close event disambungkan ke `events` V2 (2026-09-18)

Kode lama (`lib/tryout-event-status.ts`, sudah dihapus) menulis ke tabel `tryout_events` yang
**tidak ada di Schema V2**, jadi selalu gagal tanpa ada yang tahu. Bukti nyata: staging berisi event
QA berstatus `live` padahal `ends_at` sudah lewat sebulan.

Penting dipahami: halaman **tidak** menampilkan status yang salah — `statusFor()` menurunkan status
saat dibaca. Yang basi adalah **kolom** `events.status`, dan kolom itu dipakai pembaca yang tidak
menurunkan status sendiri: leaderboard event, pelepasan sertifikat, filter admin, dan
`listVisibleEvents()`.

`eventRepository.closeExpiredEvents()` (idempoten — hanya menyentuh baris berstatus terbuka dengan
`ends_at < now`) kini dijalankan dari `/api/cron/reconcile-payments`, bukan dari render halaman.

Saat menyalinnya ke cron ditemukan bug: rekonsiliasi pembayaran punya `return` lebih awal ketika
**tidak ada** pembayaran pending — yaitu kondisi normal — sehingga bookkeeping apa pun yang
ditaruh setelahnya tidak akan pernah jalan. `reconcilePendingPayments()` diekstrak agar `GET` hanya
punya satu titik keluar.

**Diverifikasi end-to-end terhadap staging lewat endpoint cron sungguhan:**

| Uji | Hasil |
|---|---|
| Tanpa token / token salah | `401` (fail-closed; `CRON_SECRET` sengaja kosong di `.env.local`) |
| Token benar | `{ orders: {...}, events: { closed: 1 } }` |
| Dijalankan kedua kali | `{ closed: 0 }` — idempoten |
| Kondisi DB | event QA kini berstatus `closed` |

Test: 6 test `event-auto-close` + 2 test cron baru (termasuk kegagalan auto-close yang tidak fatal).

#### Regression test baru dari perbaikan di atas

`progress-batching`, `scoring-batch-fallback`, `scoring-frozen-answer-key`,
`question-options-editor-keys`, `midtrans-fraud-status`, `timing-safe`,
`passing-grade-source`, `admin-redirect-map`, `event-auto-close` — total
**305 unit test / 57 file** (sebelum audit: 263 / 52).

- ✅ **Timer ujian ditegakkan server-side (2026-09-16).** `AttemptAnswerService` menolak penyimpanan jawaban setelah `started_at + durationSeconds` (+ toleransi 30 detik) lewat kode error `ATTEMPT_TIME_EXPIRED`. Sebelumnya hanya timer browser. Attempt tanpa durasi (drill/latihan) tidak dibatasi. Test: `tests/unit/attempt-deadline.test.ts`.
- ✅ **`getResult` memeriksa `status === 'completed'` (2026-09-16)** — `src/services/practice-result.service.ts`. Sebelumnya fail-open (hanya bergantung pada halaman pemanggil).
- ✅ **`fulfill_paid_order` diverifikasi aman (2026-09-16):** ACL di staging **dan** produksi hanya `postgres` + `service_role`; `anon`, `authenticated`, dan `PUBLIC` **tidak** bisa execute. Cek internal `auth.role()` bersifat opsional (defense-in-depth) — belum ditambahkan karena menuntut penulisan ulang fungsi pembayaran ±220 baris dengan risiko regresi lebih besar daripada manfaatnya.
- ✅ **Snap/pembayaran tidak lagi dimuat di semua halaman TKA (2026-09-16):** `app/tka/layout.tsx` dulu memuat skrip Midtrans Snap (beserta iframe popup pihak ketiga) di dashboard, sesi ujian, dan halaman hasil. Kini hanya `/tka/[level]/pass` yang memuatnya, dan URL sandbox yang di-hardcode sudah diganti `env.midtransSnapScriptUrl()`. Gate monetisasi TKA tetap bekerja: Full Tryout tanpa pass menampilkan "Butuh Tempur Pass".
- ⚠️ **Gap scope CPNS (temuan 2026-09-16):** flow "ulang soal salah"/remedial **tidak ada** untuk CPNS — hanya diimplementasikan untuk TKA SMP (`tka-remedial.ts`, `tka-wrong-questions.ts`; tidak dipakai di `app/cpns`). Halaman hasil CPNS hanya menyediakan "Latihan fokus", "Lihat semua hasil", dan pembahasan inline. Konsisten dengan `docs/FEATURE_STATUS_CHECKLIST.md` dan `docs/PRODUCTION_V1_SCOPE.md` (remedial CPNS di luar Production V1) → butuh keputusan produk, bukan bug.
- ⚠️ **Kesiapan konten CPNS (temuan 2026-09-16):** ini **gap publish, bukan gap konten**. Published: TWK 60, TIU **35**, TKP **45** (section butuh TWK 30, TIU 35, TKP 45 → **headroom TIU & TKP nol**). Draft tersedia: TWK **207**, TIU **113**, TKP **113**, semuanya sudah punya opsi + pembahasan tetapi **belum pernah direview** (kebijakan Production V1: soal unreviewed tidak boleh dipublikasikan otomatis). 6 dari 9 materi Latihan Fokus belum bisa dimulai (<30 soal). **Keputusan produk diperlukan:** terima headroom nol untuk acceptance pass pertama, atau jalankan review/publish atas draft yang ada.
- ✅ **Backfill snapshot versi CPNS (2026-09-16, staging + produksi):** 30 soal TWK `published` tidak punya baris `question_versions` sehingga kapasitas TWK ter-under-report (30 dari 60). Migration idempoten `20260823085200_cpns_skd_legacy_question_versions_v1.sql` dijalankan ulang di **staging** dan (dengan GO) di **produksi** → TWK 60/60 di keduanya; total `question_versions` produksi 552 → 582 (+30 tepat), jumlah soal tidak berubah.
- ✅ **Keputusan konten CPNS (2026-09-16): Opsi A** — headroom nol (TIU 35/35, TKP 45/45) diterima untuk acceptance pass pertama. Menambah kapasitas = menjalankan review/publish atas 433 draft yang sudah punya opsi+pembahasan (kerja konten-ops), bukan authoring; dilakukan sebelum ujian nyata bila diperlukan.
- ✅ **Env Upstash (2026-09-16):** kredensial valid (PING → PONG, INCR berhasil) dan **terverifikasi aktif di Vercel Production** — `/api/health` pada deployment `589b824` mengembalikan `rateLimitStore: "redis"` dengan `status: "ok"`. Rate limit kini lintas instance di produksi. Scope **Preview/staging belum terverifikasi** (belum ada deployment Preview untuk diuji); periksa centang scope Preview di Vercel atau jalankan gerbang staging E2E.
- ✅ **Flow CPNS terverifikasi end-to-end di browser (2026-09-16):** drill, mini tryout, dan full tryout (110 soal) — mulai → jawab → kumpulkan → halaman hasil dengan skor & pembahasan (full tryout termasuk breakdown TWK/TIU/TKP); 0 critical console error. **TKA SMP** juga: Mini Tryout → submit → hasil. RLS lintas-user diverifikasi (browser + database).
- ✅ **`/admin/assessment/exams` diperbaiki (2026-09-16):** halaman gagal render (jatuh ke error boundary) untuk admin mana pun karena URL PostgREST mencapai 22.594 karakter → `HeadersOverflowError (UND_ERR_HEADERS_OVERFLOW)`. Filter `.in()` besar kini di-batch lewat `lib/supabase-batch.ts`. Seluruh **9 route `/admin`** kini merender normal.
- ✅ **Validasi zod server-side di auth action (2026-09-16)** — `login`, `signup`, `forgotPassword`, `resetPassword`, `resendVerificationEmail`, `updatePassword`; cast `FormData` yang bisa bernilai `null` juga dihapus. Test: `tests/unit/auth-validation-contract.test.ts`.
- ✅ **Rate limit aplikasi di auth action (2026-09-16)** — `login` 10/5 menit per IP; `signup` 5/15 menit per IP; `forgotPassword` & `resendVerificationEmail` 10/15 menit per IP **dan** 3/15 menit per email (email di-hash, tidak disimpan mentah). Memakai `checkRateLimit` yang sudah ada (Upstash Redis, fallback in-memory, fail-open saat Redis mati). Test: `tests/unit/auth-rate-limit.test.ts`.
- ⚠️ **Aksi di luar kode:** set `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` di Vercel (staging & produksi). Tanpa itu limiter jatuh ke in-memory yang **per-instance** dan mudah ditembus di serverless.
- ✅ **Urutan header IP terverifikasi di produksi (2026-09-16):** `/api/health` kini melaporkan `clientIpSource` (nama header, bukan IP). Diuji dengan mengirim header palsu — `x-real-ip` palsu, `x-forwarded-for` palsu, bahkan `x-vercel-forwarded-for` palsu — sumbernya **tetap** `x-vercel-forwarded-for`, jadi header kiriman client tidak pernah menang. Catatan cakupan: yang terbukti adalah **prioritas nama header** di kode kita; jaminan bahwa Vercel menimpa *nilai* `x-vercel-forwarded-for` adalah kontrak platform Vercel, bukan sesuatu yang bisa dibuktikan dari repo ini. Rate limit Supabase Auth tetap jaring pengaman otoritatif.
- [ ] Belum ada regression test untuk replay webhook secara end-to-end (unit webhook sudah ada).

#### Stabilisasi admin Fase 1 — S1–S12 (2026-09-20)

Dua belas butir perbaikan inti pada permukaan admin, semuanya tanpa migration. Rincian lengkap:
`docs/ADMIN_STABILIZATION_2026-09-20.md`.

| # | Temuan | Perbaikan |
|---|---|---|
| S1 | Modal "Tambah sesi" di `/admin/assessment/events` selalu punya dropdown "Exam EVENT" kosong — mode `events` tidak memuat domain `exams`, padahal modalnya membacanya. Sesi event **tidak bisa dibuat sama sekali dari UI**, tanpa error | mode `events` memuat `['events','products','exams']`; dikunci 8 unit test |
| S2 | Mode `exams` (±146 baris) di `AdminOperationsWorkspace` adalah kode mati tanpa route; ada dua permukaan exam yang berbeda | kode mati dibuang; peta tab pindah ke `lib/admin-operations.ts` (murni, dapat diuji) |
| S3 | Question Bank masih memakai textarea `A\|Teks\|1\|true` — dilarang standar admin §7 — dan **membuang field `imageUrl`** sehingga gambar opsi hilang diam-diam saat disimpan | memakai `QuestionOptionsEditor`; serialisasi & parsing disatukan di `lib/question-options.ts` (7 field, create/update/perbandingan); dikunci 17 unit test |
| S4 | `/admin/assessment/exams` menjalankan query **sebelum** memeriksa izin (`Promise.all`), sehingga peran tanpa `exam.manage` menunggu query berat lalu ditolak | otorisasi lebih dulu, query hanya bila diizinkan |
| S5 | Setiap daftar memuat jendela tetap dan **diam tentang sisanya** (soal 80, exam 80, event/product 50, artikel tanpa batas); `/admin/users` mencetak "100 dari N" tanpa cara menuju sisanya | `lib/admin-pagination.ts` menyatakan posisi daftar secara eksplisit; cap events dinyatakan lewat banner |
| S6 | Data di luar jendela **tidak terjangkau** sama sekali | `listDomainPage` — paginasi 25 baris di database (`count: 'exact'` + `.range()`), detail hanya untuk baris yang tampil |
| S7 | Pencarian disaring di klien atas baris terpotong: mencari soal ke-500 selalu dijawab "tidak ada" — jawaban yang salah | pencarian & filter status lewat query DB, hidup di URL, dengan nilai yang dibersihkan sebelum masuk ekspresi `or` PostgREST |
| S8 | Tidak ada `app/admin/error.tsx`; kegagalan halaman admin jatuh ke boundary produk ("Dashboard CPNS" + maskot) | boundary khusus admin: menyatakan tidak ada data yang berubah + menampilkan `digest` yang bisa dicocokkan ke log |

**Tiga bug hanya ketahuan karena halamannya benar-benar dibuka sebagai admin di server nyata** (semuanya
lolos `tsc` dan unit test): kolom `id` yang tidak ada di `product_wallet_grants` (menjatuhkan seluruh
`/admin/commerce/products`), `uuid = ''` dari `?edit=` kosong, dan **PGRST103** — PostgREST *menolak*
offset di luar jumlah baris, bukan mengembalikan array kosong. Catatan untuk perubahan berikutnya:
`redirect()` di dalam server component yang di-stream menghasilkan shell kosong tanpa heading.

Verifikasi: `tsc` lolos · lint exit 0 · unit **556/556** (75 berkas, dari 490) · build lolos ·
**gate admin lokal 30 passed, exit 0** · staging bersih di akhir run.

| S9 | Hanya artikel & alur review yang menulis `audit_logs`; penyesuaian dompet (uang), peran, penghapusan instansi, dan perubahan kunci jawaban **tidak meninggalkan jejak apa pun** | **33 aksi tulis** kini tercatat di 7 modul; helper menangkap before/after, menyunting kolom rahasia, dan menormalkan `entity_id` ke uuid. Kegagalannya sendiri menemukan bug: **`redirect()` dari fungsi `async`** membuat browser tidak berpindah halaman meski data sudah berubah — dikunci 10 unit test |
| S10 | Hanya hapus artikel yang bertanya; arsip soal/produk/exam/event, hapus setting, keluarkan peserta, rotasi undangan, cabut peran, nonaktifkan akun berjalan **satu klik** | dialog konfirmasi di 12 tempat yang menyebut konsekuensi spesifik; bentuknya ditemukan lewat tiga kegagalan nyata (render prop ditolak React, tombol di luar form, `requestSubmit` menolak tombol `button`) — dikunci 12 unit test |
| S11 | Halaman artikel masih stack V1 (`getCurrentUserRole`), query **tanpa batas**, tanpa pencarian/paginasi, badge status mentah | keluar dari adapter V1 + paginasi/pencarian + label manusiawi; **0 pemakaian `getCurrentUserRole`/`isAdminRole` di `/admin`** |
| S12 | Responsive smoke hanya 2 dari 16 route, padahal §10/§14 menjadikannya syarat | 14 route × 2 viewport = **28 pemeriksaan**; langsung menemukan bug nyata: `/admin/content/review` melebar 412px pada viewport 390px (kolom grid tanpa `min-w-0`) — diperbaiki |

Verifikasi Fase 1 lengkap: `tsc` lolos · lint exit 0 · unit **592/592** (77 berkas, dari 490) ·
build lolos · **gate admin 59 passed, exit 0** (dari 30 sebelum fase ini) · verifikasi bentuk jejak
audit terhadap staging **8/8 lolos**.

> **Utang yang terbuka:** (1) baris jejak audit hasil tulisan aplikasi **tidak terlihat** oleh
> pemeriksaan eksternal (CLI/REST staging) meski aplikasi berhasil membacanya kembali dan 36 instansi
> uji dibersihkan dari staging — perlu diperiksa di lingkungan bersih; (2) participants/attempts
> instansi masih tanpa paginasi; (3) `/admin/commerce` masih global (filter per program/track belum).

> Batas yang diketahui: **events** masih memakai jendela 50 baris (cap-nya kini dinyatakan, tetapi
> belum berhalaman); **exams** dan **articles** juga belum berhalaman; filter per program/track di
> `/admin/commerce` masih belum diterapkan karena ownership ada di `order_items`.

---

## 7. Gate membuka domain publik

Domain tidak boleh diaktifkan sebelum **semua** ini hijau:

- [x] P0-1 & P0-2 ditutup **dan diverifikasi di staging** (2026-09-16).
- [x] P0-1 & P0-2 ditutup **dan diverifikasi di produksi** (2026-09-16).
- [x] Status produksi diverifikasi (fungsi, grant, policy, feature flag) — 2026-09-16.
- [x] **Admin produksi ditetapkan** — `SUPER_ADMIN` untuk `halimdirga8@gmail.com` (2026-09-16).
- [x] **Keputusan flag monetisasi TKA SMP** — diputuskan tetap **ON** (2026-09-16).
- [x] CI `main` hijau di GitHub (2026-09-16) — 35 commit di-push, seluruh job lolos.
- [x] Riwayat migrasi remote disamakan (baseline 2026-09-16, staging & produksi).
- [ ] Regression test kebocoran kunci jawaban berjalan di CI.
- [x] Enforcement timer ujian server-side (2026-09-16).
- [x] Critical user journey diverifikasi di browser: publik (30 test) + ber-auth (30 test: login → onboarding → dashboard, seluruh route CPNS/TKA).
- [ ] Rate limit efektif lintas instance: env Upstash terpasang di staging & produksi.
- [x] Verifikasi header IP tepercaya di deployment nyata (2026-09-16) — header palsu tidak menang.
- [ ] (Disarankan) Product Experience V1.1 selesai.

### Cara verifikasi cepat

Sudah ada di repo:

```bash
npm run lint && npm run typecheck && npx vitest run && npm run build
E2E_REMOTE_BASE_URL=1 BASE_URL=http://127.0.0.1:3100 npx playwright test --project=chromium-public
```

Cek DB (read-only, SQL Editor). Untuk `question_versions` hasilnya harus **0 baris**:

```sql
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'question_versions'
  and grantee in ('anon', 'authenticated');

select pg_get_functiondef(p.oid)
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'app_private' and p.proname = 'get_content_question_detail';
-- definisi tidak boleh mengandung: status in ('approved','published')
```

---

## 8. Kondisi teknis saat ini

| Area | Kondisi |
|---|---|
| Lint | ✅ **0 error, 0 warning** |
| Typecheck / Unit / Build | ✅ hijau (234 unit test, 47 file) |
| E2E publik (`chromium-public`) | ✅ 30/30 lolos (termasuk cek console browser) |
| E2E ber-auth (`chromium-authenticated`) | ✅ **62/62 lolos** (2026-09-17, dijalankan lokal di build terkini): login → onboarding → dashboard, 27 route CPNS/TKA sehat + 2 redirect sengaja, dan **32 cek overflow** (16 permukaan inti × mobile 390×844 & tablet 1024×768) tanpa critical console error |
| Gate staging lokal (pengganti GitHub Actions) | ✅ `node scripts/local-gates/run-gate.mjs tka\|cpns\|admin` atau `scripts/local-gates/docker-run.sh` — emulator Edge Function + service-role staging, tanpa OIDC. **Hasil `5646eda`: TKA 16/16, CPNS 4/4, Admin exit 0 (5 passed + 2 flaky)**. Detail: `docs/LOCAL_STAGING_GATES.md` |
| E2E staging ber-kredensial lain (TKA, content review, admin, CPNS) | dijalankan lewat workflow khusus berbasis GitHub OIDC. **Hasil Round 8:** CPNS Staging E2E ✅, Admin Workspace Staging E2E ✅ (keduanya di deployment Vercel **Preview** ber-env staging), TKA SMP Staging E2E diperbaiki bertahap (detail di `docs/agent-progress.md`) |
| CI | **hijau di GitHub** (`22057ac`, `34bb466`): CI **success** (lint, typecheck, unit, security audit, build, E2E) dan Schema V2 CI **success**; deployment produksi Vercel sukses (domain tetap ditahan) |
| **Riwayat migrasi remote** | ✅ **disamakan 2026-09-16** (staging & produksi → 155 baris = tepat daftar file repo). `supabase db push` kembali normal: *"Remote database is up to date."* Arsip sebelum baseline: `supabase/migration-history-archive/` |
| CSP | satu sumber: nonce + `strict-dynamic` di `proxy.ts` (CSP statis di `next.config.ts` sudah dihapus) |
| RLS lintas-user | ✅ diverifikasi 2026-09-16 di browser **dan** database (user lain → 0 baris; `attempt_questions`/`attempt_answers` tanpa SELECT untuk `authenticated`) |
| Feature flag | `tka.smp.monetization_enforcement` — **ON (100%, enforced)** di produksi (keputusan pengguna) |
| Konfirmasi sesi ujian | ✅ seragam: CPNS & seluruh klien TKA memakai modal (`components/ui/Modal` + `components/tka/TkaSectionConfirmModal.tsx`); tidak ada `window.confirm()` di alur ujian |
| Progres posisi soal TKA | ✅ dipersistensi per attempt+bagian (`lib/session-progress.ts`) — tidak lagi terlempar ke soal 1 saat jawaban tersimpan |
| Audit dead link internal | ✅ 90 route vs 75 target (`href` + `router.push`/`replace` + `redirect`) — **0 target tanpa route/aset**, termasuk aset `public/` |
| Higiene kode | ✅ 0 `TODO`/`FIXME`/`HACK`, 0 `console.log`/`debugger`, 0 mock/dummy pada `app/`, `components/`, `src/`, `lib/` |
| RLS (audit katalog + fungsional, staging 2026-09-17) | ✅ **semua tabel `public` ber-RLS**; `authenticated` tanpa SELECT di `attempt_questions`/`attempt_answers`/`question_versions`; `user_roles` tanpa policy (deny-all non-service); uji lintas-user: attempt/profil/wallet milik orang lain → **0 baris**, `attempt_answers` → *permission denied* |

### Perbaikan P1 2026-09-16 (Round 8)

**Posisi soal TKA terlempar ke soal 1 setiap jawaban tersimpan.** Server Action simpan jawaban membuat
Next.js me-render ulang RSC tree; prop `state.questions` datang dengan identitas baru sehingga
`useEffect` sinkronisasi di `TkaDiagnosticSessionClient` menjalankan `setCurrentIndex(0)`.
Terbukti di browser: pada Soal 12/12, satu klik opsi jawaban → 700 ms kemudian posisi menjadi
**Soal 1 dari 12**. Diperbaiki dengan mempersistensi posisi per attempt+bagian (pola yang sudah dipakai
`TkaFullExamSessionClient`) lewat helper bersama `lib/session-progress.ts`.
Regression test: `tests/unit/session-progress.test.ts`, `tests/unit/tka-section-confirm-contract.test.ts`.

**Halaman hasil TKA bisa terputus di tengah stream.** `gamificationService.getAttemptReward` dipanggil
tanpa penanganan error; lookup itu memakai klien privileged sedangkan workflow E2E staging sengaja
tidak memegang service role asli. Akibatnya render terputus dan panel "Fokus belajar berikutnya" tidak
pernah sampai ke browser (hanya sebagian halaman yang terlihat). Dibuktikan lokal dengan env identik CI:
`/result?completed=1` → panel 0; `/result` (lookup dilewati) → panel 1.
Kini lookup dibungkus `try/catch` + `logger.warn` seperti lookup opsional lain di halaman itu, sehingga
gangguan modul gamifikasi tidak lagi merusak halaman hasil ujian.

### Bug terbuka (ditemukan 2026-09-17)

**P1 — Event Tryout Akbar menunjuk tabel warisan `tryout_events`.** Tabel itu tidak ada di Schema V2
(staging hanya punya `public.events` dan `public.attempt_events`), dan bentuk `public.events` tidak
memuat field yang dipakai kode (`start_grace_minutes`, `duration_minutes`, `max_participants`,
`requires_code`, `is_paid`, `price`, `documentation_url`, `updated_at`). Dampak: CRUD event di admin
gagal, section event di landing `/cpns` kosong, cron auto-close hanya menghasilkan warning.
Perbaikan menyentuh skema → butuh keputusan (migrasi `events` atau tulis ulang fitur terhadap `events` V2).

### Blocker eksternal — GitHub Actions (2026-09-17)

Seluruh workflow GitHub Actions berhenti berjalan dengan anotasi resmi:

> "The job was not started because recent account payments have failed or your spending limit
> needs to be increased. Please check the 'Billing & plans' section in your settings"

- Dampak: CI, Schema V2 CI, dan gate staging TKA/CPNS/Admin tidak bisa dijalankan sampai billing
  GitHub diperbaiki. Job berhenti < 10 detik tanpa satu pun step berjalan (`steps: 0`).
- Status terakhir sebelum blokir: **CI + Schema V2 CI success** dan **CPNS + Admin Workspace
  Staging E2E success** pada commit `32767f7`; gate TKA terakhir hijau 16/16 pada `746484a`.
- Bukan bug kode dan bukan flake test — perlu tindakan pemilik akun di GitHub Billing.

### Design system Round 9 (2026-09-17)

Konsistensi UI disatukan di atas brand sheet resmi (`#0D2B45` ink · `#1976D2` blue · `#F9A825` amber ·
`#FDDCCA` peach · `#FFFFFF`), tipografi **Poppins**, dan maskot **Tama & Tara**.

| Area | Kondisi |
|---|---|
| Token warna | ✅ satu lapisan di `app/globals.css`: primitif brand + skala 50–950 (oklch, tangga lightness sama dengan Tailwind) + pemetaan palet Tailwind → brand di `@theme` (gray/slate→ink, blue/indigo/violet/purple/sky/cyan/teal/fuchsia→brand blue, amber/yellow/orange→brand amber, pink→peach, green=emerald, rose=red) |
| Spacing | ✅ 6.232 pemakaian hanya memakai skala Tailwind/doc (gap-2/3, px-4, p-4/5/6, mt-1/4, py-3); hanya **4 nilai arbitrer** (2 di antaranya `env(safe-area-inset-bottom)` yang memang diperlukan) |
| Shadow & radius | ✅ token terpusat: `.st-shadow-sm/md/lg` = 3/5/8px `var(--brand-ink)` (global, termasuk admin) dan skala `rounded-st-sm…2xl` (12/16/20/24/32px); **297 shadow arbitrer** (6 offset + hex warisan) dihapus |
| Warna arbitrer | ✅ 0 sisa: 10 varian off-white (`#fdfbf7`, `#fbfaf7`, …) → `var(--brand-paper)`; `#fff9c4`/`#fffdeb` → `var(--brand-amber-100)`; `#08172f` → `var(--brand-ink-950)`; shadow indigo → tint brand blue |
| Tone kategori | ✅ terpusat (doc §6.2): blue = diagnostik/aksi, amber = mini tryout/premium, peach = drill, ink = full tryout/event, emerald = selesai, red = gagal |
| Tipografi | ✅ **terverifikasi di browser**: 16 face Poppins loaded, `fonts.check('16px Poppins')` = true, computed body/h1 = `Poppins` (bug resolusi var `:root` ditemukan & diperbaiki — lihat design doc §3.1.1); Poppins (400–800) untuk display + body; Patrick Hand hanya aksen (`--font-script`); 47 file `font-handwriting` → `font-display` |
| Maskot | ✅ `components/brand/Mascot.tsx` (`<Mascot>` + `<MascotPair>`) dengan aturan per mode; terpasang di landing, login, 404, dashboard CPNS, empty state riwayat, hasil TKA & CPNS; **exam mode bebas maskot** |
| Dokumentasi | ✅ `docs/PRODUCT_DESIGN_SYSTEM_V1_1.md` §6.0–6.2 (token konkret, tipografi, aturan maskot, peta tone) |
| Fun & friendly (2026-09-17) | ✅ primitif playful `components/brand/playful.tsx` (`Sticker`, `WashiTape`, `Doodle`, `MascotBubble`) + `.animate-bob`/`.hover-wiggle`; diterapkan di landing (sticker, squiggle, bintang, gelembung Tama+Tara, maskot footer & CTA), login/register, dashboard CPNS & TKA, 404, dan error boundary. **Exam mode tetap tanpa ornamen**. Skala playfulness per mode: design doc §2.4–2.5 |

Verifikasi: E2E publik 30/30 · E2E ber-auth 62/62 (32 cek overflow mobile+tablet) · lint 0/0 ·
typecheck · 234 unit test · build hijau · screenshot landing/login/404/dashboard/riwayat/sesi ujian/hasil
di mobile & desktop (0 overflow, 0 page error).

### Temuan operasional Round 8

- **Gate CPNS/Admin butuh deployment Preview, bukan Production.** Push ke `main` membuat deployment
  Production yang memakai Supabase **produksi**, sehingga user staging disposabel ditolak
  (`Email atau password salah`). Solusi: PR → Vercel membuat deployment **Preview** ber-env staging;
  resolver `scripts/resolve_vercel_preview.mjs` memverifikasi `deploymentCommitSha === expectedSha`.
- **Upstash juga aktif di scope Preview** — `/api/health` pada deployment Preview mengembalikan
  `rateLimitStore: "redis"` dengan `deploymentEnvironment: "preview"` (item terbuka ini tertutup).
- **Gate TKA kini hermetis:** flag `tka.smp.monetization_enforcement` adalah state global staging;
  workflow me-resetnya ke OFF **sebelum** E2E agar sisa run gagal tidak meracuni run berikutnya.
- **Hygiene staging:** 17 user CI tertinggal (`ci-*`, sejak 2026-09-01) dan seluruh user disposabel
  `dsh-*` sudah dihapus; sisa 0.
- `content-review-staging-e2e.yml` belum bisa dijalankan: runner self-hosted macOS ARM64 (`192`) offline.

---

## Peta dokumen

**Kanonik (pakai ini):**

| Dokumen | Isi |
|---|---|
| `docs/STATUS.md` | status terkini (dokumen ini) |
| `AGENTS.md` | aturan kerja untuk developer & AI |
| `docs/production-readiness.md` | checklist gate deploy |
| `docs/schema-v2-cutover-runbook.md` | runbook cutover |
| `docs/ADMIN_UI_UX_STANDARD.md` | standar UI admin |
| `docs/PRODUCT_EXPERIENCE_V1_1_IMPLEMENTATION_BACKLOG.md` | backlog goal aktif |
| `docs/TKA_SMP_MONETIZATION_AUDIT.md` | audit penutupan Milestone 4 |
| `supabase/migrations/README.md` | catatan migrasi |

**Historis (jangan dipakai sebagai status):**

`docs/EXECUTION_ROADMAP.md` · `docs/FEATURE_STATUS_CHECKLIST.md` · `docs/FEATURE_STATUS_CHECKLIST_M4_SYNC.md` · `docs/PRODUCTION_V1_SCOPE.md` · `docs/TKA_SMP_PRODUCTION_ROLLOUT.md` · `docs/PRODUCTION_CUTOVER_READINESS.md` · `docs/notes/*`

---

## Aturan

1. **Status hanya ditulis di dokumen ini.** Dokumen milestone bersifat append-only/historis.
2. Migration ke staging boleh dijalankan setelah project ref diverifikasi; **produksi wajib GO eksplisit**.
3. Jangan deploy, jangan ubah env produksi, jangan commit otomatis tanpa diminta.
4. Detail aturan kerja: `AGENTS.md`.

## Kebijakan monetisasi CPNS + TKA pada satu akun (2026-09-17)

**Keputusan produk (dipilih pemilik produk):** token **dipisah per program**, langganan **per program +
jenjang**, plus **bundle lintas jenjang TKA**; pass CPNS **diaktifkan**.

### Aturan yang berlaku

| Aspek | Aturan |
|---|---|
| Identitas | Satu akun untuk semua program; hak akses diikat ke program (+jenjang), bukan ke akun |
| Token | Saldo terpisah per program: `exam_token_cpns` dan `exam_token_tka` (`programs.token_wallet_type`) |
| Konsumsi | Pass/entitlement diperiksa lebih dulu → kalau tidak ada pass dan `token_cost > 0`, token dipotong → kalau token habis, tawarkan paket |
| Langganan | `CPNS_PASS_30/90` (ACTIVE, Rp39.000/Rp89.000) dan `TKA_{SD,SMP,SMA}_PASS_30/90` |
| Bundle | `TKA_PASS_ALL_30/90` (DRAFT, meng-grant 30 fitur TKA SD+SMP+SMA; harga DRAFT Rp79.000/Rp179.000) — diaktifkan setelah konten SD/SMA live |
| Fulfillment | `fulfill_paid_order` sudah membaca `wallet_type` dari `product_wallet_grants`, jadi kredit otomatis masuk ke wallet program yang benar |

### Perubahan yang diterapkan

- **Migrasi staging** (belum produksi):
  - `20260917090000_program_token_wallets_v1.sql` — `programs.token_wallet_type`, pemindahan saldo
    lama `exam_token` → `exam_token_cpns`, dan RPC `debit_exam_token_once` menjadi program-aware
    (tipe wallet diturunkan dari program exam; semantik lama dipertahankan: idempotensi per attempt,
    `token_cost = 0`, pesan error lama).
  - `20260917094500_monetization_policy_cpns_tka_v1.sql` — grant token CPNS → `exam_token_cpns`,
    pass CPNS ACTIVE + harga, exam CPNS tersambung ke fitur pass (`cpns.full_tryout.regular`,
    `cpns.mini_tryout.unlimited`, `cpns.drill.unlimited`), dan bundle TKA lintas jenjang (DRAFT).
- **Kode**:
  - `src/services/tempur-pass.service.ts` — helper scope-aware (`PassScope`, `hasActivePass`,
    `getActivePassScopes`, `passScopeForTkaLevel`). **Bug lama diperbaiki:** `hasActiveTempurPass()`
    selalu memeriksa fitur TKA SMP sehingga pass TKA SD/SMA dan pass CPNS tidak terdeteksi benar;
    kini setiap call site memakai scope eksplisit (dashboard CPNS → `cpns`, shell TKA → jenjang aktif,
    shell admin → "ada pass mana pun").
  - `src/services/exam-attempt.service.ts` — urutan akses menjadi **pass dulu, token sebagai
    fallback**: `required_feature_id` tanpa token tetap wajib pass (perilaku TKA), sedangkan exam
    ber-token boleh lanjut tanpa pass dan tokennya dipotong; pemegang pass **tidak** dipotong token
    (termasuk saat melanjutkan attempt yang sudah ada).
  - `src/services/wallet.service.ts` + `src/repositories/wallet.repository.ts` — saldo per program
    (`getBalanceForProgram`, `getTokenWalletTypeForProgram`).
  - `src/services/commerce.service.ts` + `src/services/admin-v2.service.ts` — tidak lagi hardcode
    `wallet_type = 'exam_token'`; grant token mengikuti program produk.
  - `components/profile/AccountProfilePage.tsx` — halaman profil membaca wallet sesuai konteks
    (CPNS vs TKA).
  - `scripts/local-gates/ci-helper.mjs` — emulator gate memberi saldo `exam_token_cpns`.

### Aktivasi jenjang SD & SMA (2026-09-17, lanjutan)

Pemilik produk memutuskan **langsung mengaktifkan TKA SD & SMA**:

- Produk: `TKA_SMA_PASS_30/90` → ACTIVE + harga Rp29.000/Rp69.000; bundle `TKA_PASS_ALL_30/90`
  → ACTIVE + harga Rp79.000/Rp179.000 (SD sudah ACTIVE sebelumnya).
- Aplikasi: `TKA_AVAILABLE_LEVELS` kini `['SD','SMP','SMA']` dan **16 guard hardcode `SMP`**
  diganti pengecekan `isTkaLevelAvailable(level)` (halaman pass, mini tryout, tryout, diagnostik,
  remedial, fokus, soal salah, riwayat, progress, sesi tryout, beli-token) sehingga SD & SMA
  memakai dashboard, latihan, dan halaman pass yang sama seperti SMP.
- Landing `/tka` kini menampilkan ketiga jenjang sebagai aktif (`Buka jenjang`), bukan "Segera hadir".
- Spec diperbarui mengikuti kebijakan baru: `tests/e2e/specs/1-public.spec.ts` (tidak ada lagi
  "Segera hadir"/"Belum tersedia") dan `tests/e2e/specs/8-tka-smp-mini.spec.ts` (anonim di `/tka/sd`
  dan `/tka/sma` diarahkan ke login), plus `tests/unit/tka-navigation.test.tsx`.

**Risiko yang masih terbuka:** track **SMA belum punya exam (0)** sehingga pembeli pass SMA baru
mendapat dashboard kosong (empty state jujur: "0 soal tersedia" + ajakan aktivasi jalur). Track SD
punya 6 exam. Sebelum production GO, konten SMA harus diisi atau produk SMA dikembalikan ke DRAFT.

### Sisa pekerjaan (belum dikerjakan)
- Belum ada produk token TKA (`TKA_TOKEN_*`) karena exam TKA `token_cost = 0`; wallet TKA sudah siap.
- Tampilan **dua saldo sekaligus** di satu layar (CPNS + TKA) belum dibuat; saat ini saldo mengikuti
  konteks halaman. Kandidat untuk halaman "Langganan & Token" tingkat akun.
- ⚠️ **KOREKSI 2026-09-18 — pernyataan "produksi belum disentuh" di bawah TIDAK AKURAT.**
  Verifikasi langsung ke DB produksi (`supabase db query --linked`, read-only) menunjukkan keenam
  migration `20260917*` **sudah ada di ledger produksi**, dan seluruh 15 produk monetisasi berstatus
  **ACTIVE** di produksi: `CPNS_TOKEN_{1,5,10}`, `CPNS_PASS_{7,30,90,180}`,
  `TKA_{SD,SMP,SMA}_PASS_{30,90}`, dan bundle `TKA_PASS_ALL_{30,90}`.
  Artinya monetisasi CPNS + TKA **sudah aktif di produksi**, bukan menunggu Milestone 5.
  Yang perlu ditinjau sebelum domain dibuka: apakah harga dan cakupan produk itu memang sudah final,
  dan apakah flag `tka.smp.monetization_enforcement` (ON di produksi) sesuai keputusan produk.
  *(Teks asli dipertahankan di bawah sebagai catatan historis.)*
- ~~Produksi belum disentuh: migrasi hanya di staging, monetisasi produksi tetap menunggu Milestone 5.~~
  *(pernyataan 2026-09-17 — sudah tidak berlaku, lihat koreksi di atas)*

## Audit UI/UX menyeluruh (2026-09-17)

Audit dijalankan dengan harness otomatis: 122 pemuatan halaman (20 rute publik × 3 viewport +
32 rute ber-autentikasi × 2 viewport, peran TKA/CPNS/Admin) yang memeriksa status HTTP, error
console, pelanggaran CSP, overflow horizontal, jumlah `<h1>`/landmark, tautan login yang bocor ke
pengguna login, nama tautan duplikat, dan target sentuh kecil.

**Diperbaiki (P1/P2):**

| Temuan | Dampak | Perbaikan |
|---|---|---|
| Pelanggaran CSP di `/syarat-ketentuan`, `/kebijakan-privasi`, `/kebijakan-pengembalian`, `/forgot-password`, `/auth/reset-password`, halaman 404 | Halaman statis memakai nonce hasil build, sehingga script diblokir CSP (hidrasi/interaksi rusak) | Semua halaman yang butuh script kini `force-dynamic`; rute statis tersisa hanya manifest/robots/sitemap |
| CSP `upgrade-insecure-requests` saat `next start` lokal | Browser meng-upgrade request http lokal ke https → `ERR_SSL_PROTOCOL_ERROR` di dev/E2E | Flag hanya dipasang untuk host non-loopback |
| Sidebar TKA muncul/hilang tidak konsisten saat pindah jenjang (SMP ↔ SD/SMA) | Permukaan marketing & aplikasi memakai segmen layout `/tka` yang sama, sehingga navigasi client-side memakai ulang layout yang sudah ter-mount → chrome salah | Tautan antar-permukaan memakai navigasi dokumen penuh lewat `components/tka/TkaSurfaceLink.tsx` (switcher jenjang, logo shell, CTA landing, kartu jenjang, tautan coming soon). Navigasi di dalam permukaan yang sama tetap `next/link` |
| Sesi tryout CPNS dirender di dalam sidebar | Soal tampil di kerangka dashboard, padahal layout sesi menyatakan "full-screen tanpa sidebar" | Layout dashboard melewati shell untuk `/cpns/dashboard/tryout/<sessionId>` (pola `x-pathname`, sama seperti perbaikan chrome TKA) |
| Dua landmark `<main>` di `/cpns/dashboard/pilih-jalur` | Struktur landmark ganda, membingungkan screen reader | `<main>` halaman → `<div>` (shell sudah menyediakan `<main>`) |
| Halaman legal tanpa landmark `<main>` | Navigasi screen reader tidak menemukan konten utama | Layout `(legal)` memakai `<main>` |
| Skrip Vercel Analytics dimuat di lokal | 404 + error MIME di console setiap halaman, mengotori audit/E2E | Dimuat hanya saat `VERCEL === '1'` |
| Tiga tautan "Buka peta Drill" bertujuan berbeda dengan nama sama di `/cpns` | Pelanggaran WCAG 2.4.4 (tujuan tautan tidak dapat dibedakan) | Diberi `aria-label` per mata pelajaran (TWK/TIU/TKP) |

**Tidak diubah (sengaja):**

- **Pelanggaran CSP di `/cpns/dashboard/*` dan `/tka/smp/profile`** berasal dari **iframe pihak ketiga
  Midtrans Snap**, bukan kode kita: listener `securitypolicyviolation` milik halaman mencatat 0
  pelanggaran, sedangkan console meneruskan pesan dari frame Snap. CSP kita sudah mengizinkan
  `app.midtrans.com` + nonce.
- **Nama tautan duplikat** mayoritas berasal dari chrome responsif (sidebar desktop + bottom nav
  mobile) yang salah satunya `display:none`, sehingga tidak ada di accessibility tree.
- `/admin/product` bukan rute yang ada — itu kesalahan daftar rute di harness, bukan tautan mati.
- Sisa P3: tabel admin memakai banyak tautan "Edit" per baris (lazim, konteks dari baris) dan
  `skdMap`/kartu fitur punya label berulang yang sudah diberi `aria-label`.
