# STATUS — Siap Tempur

> **Ini satu-satunya sumber kebenaran status project.**
> Terakhir diperbarui: **2026-10-07**
> Dokumen roadmap/checklist lama bersifat **historis** dan tidak boleh dijadikan acuan status — lihat [Peta dokumen](#peta-dokumen).

---

## 1. Produk

Platform tryout/latihan ujian berbasis web (B2C): **CPNS/SKD** dan **TKA** (jenjang sekolah).

Loop produk: **Latihan → ukur kemampuan → temukan kelemahan → perbaiki → ulangi.**

Stack: Next.js 16 (App Router) · TypeScript · Supabase (Auth + Postgres + RLS/RPC + Storage) · Midtrans · Vercel · Playwright + Vitest.

### Product architecture — 2026-10-06

Core learning domains: **CPNS** and **TKA**. Each domain can expose **Tryout**, **Mini Tryout**, and **Drill** through the existing `exams` catalog, with level/track, section, duration, and scoring rules kept in the domain configuration. **Direct**, **Event**, and **Organization** are access/distribution contexts; Event starts reuse the assessment attempt/result engine, and Organization batch assignments reference catalog assessments. Event and Organization do not own question, scoring, or exam-definition engines.

Event starts retain event metadata on the assessment attempt. TKA SMP tryout modes enter the existing section-aware TKA RPC flow; CPNS and drill flows use the shared Schema V2 attempt flow. Organization batch assignments store the existing `exam_id` and validate domain, assessment type, availability, and question content in the assignment RPC. The former organization template tables and records remain for history, but template composition and composed-exam deletion are no longer supported through authenticated RPCs.

Snapshot parsing shared by TKA remedial and wrong-question history is in `src/domain/question-snapshot.ts`. Remedial remains scoped to one source attempt; the wrong-question bank remains a historical aggregation.

The distribution, attempt-context, quota, corrected uniqueness, and Organization reporting migrations are now applied to **staging** (`lpgrivowdcepcxradavu`) and **production** (`llnttutwhtvxtdktiizo`); the per-migration production ledger and checks are recorded in the 2026-10-07 promotion entry below. The P0 security migration is also applied to production. The context RPC resumes attempts by exact Direct/Event/Organization reference; Direct generic lookup excludes distributed attempts. The partial unique index protects one active Direct/Event attempt per exact context while excluding explicitly imported rehearsal history. Organization participant assignment discovery and start/resume use the shared assessment session and result engine. Monitoring/export now select the most recently created organization attempt across assigned assessment types. The application is deployed and healthy at release `37fcab4fd3dfd354c46df2a22eba634d43517f8c`; the public domain is active with limited content, and no global dark-launch mechanism is present. CPNS products remain archived until canonical content is reviewed and released.

**QA follow-up 2026-10-06 (superseded by read-only production recheck below):** Staging authenticated E2E covers CPNS Event full lifecycle, Direct/Event and Event A/B isolation, resume, result and leaderboard source integrity; TKA SMP Full Tryout Event lifecycle; Organization CPNS + TKA SMP Full Tryout discovery/start/autosave/refresh/resume/submit; CPNS monitoring/export consistency; participant cross-org and unassigned-batch denial; and TKA Organization assignment context with unchanged token balance. TKA SMA has no ready assessments; its active PASS offers were archived in staging without removing existing entitlements, and the participant page renders an unavailable state. TKA SD has 5 ready assessments; TKA SMP has 26.

**Pre-hotfix production snapshot 2026-10-06 (historical):** Production read-only SQL found that a normal active profile with no roles could call `get_content_question_detail` for an approved/published question it neither authored nor reviewed. The RPC returned detail despite content/admin permissions being false. Direct `SELECT` on `question_versions` was already denied. Root cause: nullable `author_id`/`reviewer_id` comparisons produce `v_allowed = NULL`; `IF NOT v_allowed` fails open in PL/pgSQL. The production fix and post-migration verification are recorded below.

Earlier staging regression snapshot (superseded by the final re-run below): **Public E2E 42 PASS / 2 SKIP; Admin 60/60 PASS; CPNS 8/8 PASS; TKA SMP 16/16 PASS; Unit 709/709 PASS; Lint, Typecheck, Build, and `git diff --check` PASS.** CPNS E2E includes CPNS/TKA SMP Event and Organization Mini/Drill cells, duplicate Event registration, Direct/Event and Event/Event isolation, dual-organization assignment isolation, zero-token Organization assignment, and TKA total-score monitoring/export consistency. At this point the distinct catalog TKA Drill Direct cell was not yet proven; it passed in the final re-run below. Event timing was then covered in service tests; the final participant UI and actual start-boundary test is recorded below. The universal session restores one-option answers saved in `selected_option_id`; Organization monitoring/export choose the latest attempt by creation time across assessment types.

The earlier remaining-gap list above is historical; the current decision is recorded here. The PRD [`prd-cpns-instansi-managed-service.md`](notes/prd-cpns-instansi-managed-service.md) explicitly scopes Organization MVP to CPNS, requires TWK/TIU/TKP and total CPNS scores, and excludes other exam domains from its initial product scope. TKA Organization section breakdown is therefore **NOT REQUIRED FOR MVP**; keep canonical total-score parity as the reporting gate and track section breakdown as P2 only if a later TKA Organization requirement is approved. No score recalculation is implied by test counts. The production answer-key P0 is now closed after migration and smoke verification; controlled application deployment remains on hold because six application migrations are staging-only. Dark launch stays active.

**P0 hotfix & final P1 closure recheck 2026-10-06:** Staging security migration `20261006135419_harden_nullable_content_question_access_guard.sql` is fail-closed (`coalesce(v_allowed, false)`). Production preflight verified the production target and found the vulnerable guard plus no existing ledger entry for this fix. The same security migration was applied to production at **2026-10-06 16:56:17 UTC** (ledger version `20261006165617`, name `harden_nullable_content_question_access_guard`). Post-migration SQL smoke used an existing active participant identity inside a rolled-back transaction with `SET LOCAL ROLE authenticated`: `public.get_content_question_detail` returned `Question detail access denied`, and direct `SELECT` from `question_versions` was denied. The existing internal SUPER_ADMIN detail-RPC smoke passed. No published production question has both `author_id` and `reviewer_id` NULL, so that exact row fixture was unavailable; the fail-closed expression is covered by the migration contract test and staging verification. A participant start/answer/submit flow was not run on production to avoid changing exam state. P0 is **CLOSED**. The answer-bearing payload was never printed or recorded.

The production migration delta after the hotfix is six staging-only application migrations: `assessment_distribution_contracts`, `attempt_distribution_context_v1`, `context_attempt_quota_boundary`, `enforce_active_b2c_attempt_context_uniqueness`, `fix_org_export_latest_attempt_order`, and `fix_org_monitoring_latest_attempt_order`. They are required before promoting the current staging application because its Event/Organization/session and reporting flows depend on them. No optional migration delta was identified. None of these application migrations was applied in this hotfix. Direct TKA SMP catalog Drill is available through the existing attempt RPC and passed authenticated browser discovery/start/autosave/refresh/resume/completion coverage. Concurrent double-start and double-submit checks passed for Direct, Event, and Organization; Event and Organization race checks resolve to one canonical attempt/result, and Direct CPNS token balance did not incur a second debit on duplicate submit. Event timing passed through participant UI and the actual start Server Action boundary for before/during/after windows. TKA Organization section breakdown is non-blocking P2, not an MVP requirement. Latest staging gates: Public E2E 42 passed / 2 skipped; Admin 60/60; TKA SMP 17/17; CPNS 9/9; Unit 709/709; lint, typecheck, build, and `git diff --check` passed. Application deployment remains on hold until the six application migrations are promoted with a reviewed plan; dark launch remains active.

QA fixture cleanup: Event, registration, attempt, ranking, assignment, and Organization fixtures created by the new staging E2Es are removed in `finally` blocks; temporary admin users are cleaned by the gates. Staging gate cleanup reported 0 leftover `ci-*` users to remove. Disposable TKA participant accounts are also cleaned by the staging helper lifecycle. The production hotfix changed only the security function definition; no production question, answer, result, entitlement, or session data was mutated.

**Controlled production promotion preflight 2026-10-07 — HOLD:** Production target was verified as Siap Tempur project `llnttutwhtvxtdktiizo`; P0 migration is already present (ledger version `20261006165617`). No application migration was applied in this promotion attempt. Read-only preflight found **2 duplicate groups / 2 extra rows** that violate `20261006135702_enforce_active_b2c_attempt_context_uniqueness.sql`: legacy/direct `in_progress` attempts for CPNS assessment `legacy-history-skd-full` and TKA SD assessment `legacy-history-sd-mini`. No user identifiers or answer payloads are recorded here. Do not delete, merge, or alter those historical attempts automatically; agree on a data-owner remediation, resolve only through an approved procedure, then rerun the duplicate preflight before any migration. Other checks found 0 active Organization duplicate groups, 0 missing Organization assignment references, 0 orphan Event/assignment/exam references, and 0 invalid Organization attempt-context rows. There are 478 legacy B2C attempts without explicit context metadata; they are retained and the migration's Direct fallback interprets them as Direct. The assessment-context migration would archive 2 active TKA SMA PASS catalog products because no ready SMA assessment exists; the two products are `TKA_SMA_PASS_30` and `TKA_SMA_PASS_90`. The migration does not delete entitlement rows; the read-only product-feature/source check found 0 matching active entitlement rows for these products. Six application migrations remain unapplied to production, including the uniqueness index migration. Database status is **HOLD**, application deployment is **HOLD**, deployment status is **NOT DEPLOYED**, and dark launch remains **ACTIVE**. Once the duplicate data is handled under an approved plan and preflight is clean, apply migrations one at a time in dependency order and verify each ledger entry and post-check before proceeding.

**Legacy duplicate attempt review 2026-10-07 — no mutation:** Read-only inspection linked the four records to `legacy_prod.test_sessions` / `test_answers`; their metadata identifies them as `production_legacy_rehearsal` imports with `history_class` set. Both archive exams are `draft`, both source sessions in each group are historical `in_progress` rows with no end/submission timestamp, and no canonical result or direct downstream references were found. For CPNS, attempt #1 has 35 imported question/answer rows but 0 selected options; attempt #2 has 35 rows and 34 source selections (33 mapped canonical selections), making #2 the progress-bearing record to preserve. For TKA SD Mini, attempt #1 has 20 rows and 0 selections; attempt #2 has 30 rows and 0 selections, with the later source activity seven seconds after start and both access deadlines long past. These are sequential legacy sessions, not evidence of a current start race. The database has no attempt-status check constraint, but the application and production rows use only `in_progress` and `completed`; marking incomplete legacy history completed would falsify its state, while an `abandoned` status has no established application contract. Therefore no safe status mutation or single active canonical record is established. Preserve all four attempt IDs and their imported answers; data-owner decision is required on the terminal-state contract or uniqueness-index treatment for imported archive history. Full read-only preflight still reports 2 B2C duplicate groups / 2 extra rows; Organization duplicate groups, reference orphans, and invalid Organization contexts are all 0. **Database remains HOLD.**

**Legacy-safe uniqueness follow-up 2026-10-07 — production untouched:** The duplicate rows are historical imports, not operational sessions; `status='in_progress'` alone is not the right uniqueness domain. Their stable explicit classifier is `metadata.migration_source='production_legacy_rehearsal'` (all 476 imported rows have it, including all 50 imported rows still marked in progress; the two unmarked B2C rows are completed). Added `20261006172558_scope_active_b2c_attempt_uniqueness_to_operational_rows.sql`, matching the staging ledger version `20261006172558`; it replaces the B2C partial-index predicate to exclude only this explicit import source while retaining the existing Direct key (`user_id + exam_id + empty event key`) and per-Event key (`user_id + exam_id + eventId`). Missing context is not used as a history heuristic. The separate Organization assignment index is unchanged. Staging has the original uniqueness migration followed by this corrective migration; its corrected unique index is present, unique and valid. Disposable DB probe passed: duplicate legacy rows coexist, modern Direct duplicates reject, Event A/B coexist while same-Event duplicates reject, and Organization assignment A/B coexist while same-assignment duplicates reject. The authenticated CPNS gate passed **9/9**, including two-tab Direct and Event double-start converging to one attempt; Direct token balance was debited once. Focused contract tests passed **2/2** and `git diff --check` passed.

Production read-only dry-run with the corrected predicate: **0 modern duplicate groups / 0 extra modern rows**, **2 legacy duplicate groups / 2 extra legacy rows**, 50 marked legacy active rows excluded, 0 unmarked operational active rows, and 0 currently active rows covered by the new index predicate. The four specified production attempt IDs were re-read and remain `in_progress` with their legacy markers and `updated_at` values intact; no production data or schema was changed. Older 2026-10-07 HOLD notes above describe the pre-correction predicate and are superseded for B2C uniqueness by this entry; unrelated application migrations remain unapplied. **DATABASE: READY FOR MIGRATION PROMOTION (preflight clean for corrected predicate), not applied. APPLICATION: HOLD. DARK LAUNCH: ACTIVE.**

Production promotion sequence for uniqueness: first apply the corrected SQL under its migration name so the valid index exists without touching legacy rows; then apply the original unapplied `20261006135702_enforce_active_b2c_attempt_context_uniqueness.sql`, whose `CREATE UNIQUE INDEX IF NOT EXISTS` will observe the corrected index with the same name and leave it intact while recording the original migration. Do not run the original index migration first, because its old predicate includes the two legacy duplicate groups and will fail. For the full application migration set, apply `assessment_distribution_contracts` → `attempt_distribution_context_v1` → `context_attempt_quota_boundary` → corrected uniqueness SQL → original uniqueness migration (ledger record/no-op) → `fix_org_export_latest_attempt_order` → `fix_org_monitoring_latest_attempt_order`, checking ledger and each postcondition after every step. Production promotion remains a separate authorized task; staging applied order and ledger are verified, but production migrations were not run here.

**Controlled production database promotion 2026-10-07 — complete:** Applied individually to verified production project `llnttutwhtvxtdktiizo`, without `db push`: (1) `assessment_distribution_contracts` — ledger `20261006173714`; (2) `attempt_distribution_context_v1` — `20261006173747`; (3) `context_attempt_quota_boundary` — `20261006173825`; (4) `scope_active_b2c_attempt_uniqueness_to_operational_rows` — `20261006173852`; (5) `enforce_active_b2c_attempt_context_uniqueness` — `20261006173913`; (6) `fix_org_export_latest_attempt_order` — `20261006173941`; (7) `fix_org_monitoring_latest_attempt_order` — `20261006174008`. Each apply succeeded and each entry was verified in the production migration ledger before continuing. The original uniqueness migration was inspected and is `CREATE UNIQUE INDEX IF NOT EXISTS` on the same index name; after applying it, the corrected predicate remained intact.

Post-checks: assignment and context RPCs exist with expected grants and validation; Event validator trigger is enabled; organization attempt index and corrected B2C index are `unique`, `ready`, `valid`, and `live`. The B2C predicate excludes only `metadata.migration_source='production_legacy_rehearsal'`; it does not exclude rows with missing context. Final read-only preflight reports **0 modern B2C duplicate groups / 0 extra rows**, **2 legacy groups / 2 extra rows**, and **0 Organization duplicate groups / 0 extra rows**. Event and Organization assessment references have 0 orphans. There are 0 Organization assignments/attempts, so production reporting sample parity is **NOT RUN — no safe existing fixture**; export and monitoring function definitions were verified scoped by participant, organization, source, and batch, with `created_at` before `attempt_number` in ordering.

The context migration archived `TKA_SMA_PASS_30` and `TKA_SMA_PASS_90` because there are still no ready/usable TKA SMA assessments. Entitlements were not deleted (the production entitlements table had 0 rows). All four legacy attempts remain `in_progress` with their import markers and timestamps unchanged; their 120 attempt-question snapshots remain and there are 0 score rows. No answer content was emitted. Production P0 regression smoke after all migrations: authenticated participant `question_versions` SELECT denied; participant detail RPC denied; existing SUPER_ADMIN detail access passed. Direct assessment content remains resolvable (31 ready CPNS/TKA assessment rows with question content). **DATABASE: READY. APPLICATION: HOLD (not deployed). DARK LAUNCH: ACTIVE.**

---

## 2. Environment

| Environment | Supabase project ref | Aplikasi | Catatan |
|---|---|---|---|
| Local | staging | `npm run dev` | `.env.local` menunjuk staging |
| Staging | `lpgrivowdcepcxradavu` | Vercel Preview | Sumber rehearse & E2E |
| Production | `llnttutwhtvxtdktiizo` | **public production aktif** | konten terbatas; CPNS commerce archived |

**Status operasional 2026-10-07:** domain publik `siaptempur.id` aktif pada deployment production yang sehat. Tidak ada global dark-launch gate; exposure dikelola per produk/konten. CPNS Pass dan token tetap `ARCHIVED` untuk penjualan baru, legacy CPNS assessments tetap DRAFT, dan canonical assessment belum dibuat. Owner telah menyetujui blueprint 2024, Mini overlap tercatat, Drill parsial 9/28, serta syarat Pass 28/28. Candidate manifest v1 tersedia tetapi seluruh item masih `NEEDS_REVIEW`; jangan membuat/aktifkan assessment dari kandidat sebelum review akademik dan asset check selesai. Lihat [CPNS Production Content Readiness](CPNS_PRODUCTION_CONTENT_READINESS.md).

> **Status terkini 2026-10-06:** runtime Schema V2 aktif di produksi. P0 answer-key ditutup setelah migration `20261006165617` dan smoke participant lulus; lihat bukti migration di Bagian 1 dan 6. Dark launch tetap aktif sambil menunggu promotion aplikasi dan migration dependensinya.

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
- `src/services/question-bank.service.ts`, `src/services/admin-workspace.service.ts`
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

Kejelasan review massal (2026-09-23): panel menjelaskan fungsinya sendiri lewat blok **"Apa ini?"**
(jalur cepat satu batch; keputusan tetap milik manusia; tidak menembus workflow; hanya soal batch
ini yang tersentuh), menyebut posisi tahap (`Langkah 2 · Tahap 2 dari 3 — Akademik`, peta
`STAGE_NUMBER` di `lib/review-batch.ts`), dan tombol terbit menyebut jumlah (`Terbitkan N soal`).
Ditambah daftar **"Soal di batch ini"** dengan badge status + tautan `Periksa` per soal supaya
reviewer bisa spot-check sebelum memutuskan puluhan soal sekaligus. Keputusan destruktif
(Tolak / Minta revisi) kini melewati dialog konfirmasi yang menyebut jumlah dan akibatnya serta
**wajib bercatatan** — dijaga ganda: klien (`components/admin/ReviewBatchStageForm.tsx`) dan server
(`CATATAN_WAJIB` di `app/actions/content-review-batch.ts`), karena input klien tidak dipercaya.
Verifikasi: **691 unit test / 93 file**; gate admin 60 passed (termasuk assertion panel baru);
gate Review 5 passed.

### P1-b — pencarian aman + pengukuran payload
- `escapePostgrestValue` dipindah ke satu modul bersama `lib/postgrest-filter.ts` dan dipakai
  `admin-workspace.service` (produk/exam/soal) serta `content-review.service`. Sebelumnya pencarian review
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

### Kebijakan penugasan reviewer — aturan C (2026-09-22)
- Permission baru `content.assign` (ADMIN/SUPER_ADMIN) memisahkan **menugaskan ke orang lain**
  (aksi manajerial) dari **klaim untuk diri sendiri**.
- `assign_question_reviewer`: klaim diri cukup `content.review`; menugaskan/memindahkan ke orang lain
  wajib `content.assign`/`question.manage`; review yang dipegang reviewer lain tidak bisa direbut lewat
  klaim diri. `claim_pilot_review_stage` (klaim massal) sudah self-only dan tidak berubah.
- UI: reviewer melihat tombol **"Klaim untuk saya"**; dropdown **"Tugaskan"** hanya untuk pemegang
  assign/manage. Aksi menolak lebih awal dengan pesan yang jelas bila reviewer mencoba menugaskan orang lain.
- Migration `20260922010000_review_assign_policy_v1.sql` — **ter-apply di staging DAN produksi**
  (GO 2026-09-22; ledger via `migration repair`). Verifikasi produksi: permission `content.assign`
  hanya di ADMIN/SUPER_ADMIN, guard baru (`v_can_assign_others`, pesan rebut) ada di definisi fungsi,
  ledger tercatat. `db-verify` produksi melaporkan **skipped** karena belum ada pengguna
  `content.review` tanpa `question.manage` — jalur 6/6 dijalankan penuh di staging.
- Verifikasi `scripts/db-verify/review-assign-policy.sql` **6/6**: manager assign ok; reviewer assign
  ke orang lain ditolak; reviewer klaim diri ok; reviewer rebut review ditolak; manager pindahkan ok;
  grant `content.assign` ke non-manager = 0. Gate Review 5 passed exit 0.
- Catatan: `content.publish` masih dimiliki CONTENT_REVIEWER (belum dipisah ke manager) — keputusan
  produk terpisah, belum diubah.

### Placeholder riwayat ditandai (2026-09-22)
- Produksi punya 2 soal `LEGACY-HISTORY-SKD-TIU/TWK` (`source_type=legacy_history_placeholder`,
  tanpa opsi/kunci) — penampung riwayat attempt lama (399 + 6 `attempt_questions`), **tidak boleh
  dihapus**. Sebelumnya keduanya tampil seperti draft biasa yang "belum lengkap".
- Daftar **Question Bank** dan **Review Queue** kini menandainya dengan badge "Placeholder riwayat",
  menggantikan badge status, dan mematikan tombol Edit ("Terkunci"). Deep link `?edit=` menampilkan
  penjelasan, bukan form yang bisa disimpan.
- Fixture placeholder ditambahkan ke gate QB (staging tidak punya baris seperti ini) supaya jalur ini
  diuji — badge muncul, tanpa tautan Edit, modal menampilkan penjelasan. Fixture dibersihkan di `finally`.
- Verifikasi: 635 unit test / 87 file; gate QB lulus; gate Review 5 passed exit 0.
- Catatan: blokir ini di lapisan UI/daftar; RPC tidak menolak pengeditan placeholder (belum ada
  migration untuk itu).

### Perbaikan regresi: opsi tersimpan hilang di form edit (2026-09-22)
- Saat editor opsi dipindah ke `ReviewQuestionFields` (P2-c), prop `defaultValue` ikut hilang sehingga
  form edit menampilkan **opsi contoh kosong A–D** alih-alih opsi tersimpan. Data di database tidak
  rusak (server menolak simpan dengan isi kosong), tetapi admin tidak bisa melihat/menyunting opsi.
  Ditemukan dari laporan pemilik produk saat memeriksa `TWK-000460` (DB lengkap: 5 opsi A–E).
- `ReviewQuestionFields` menerima `optionsDefaultValue`; form edit mengirim
  `serializeOptionRows(data.options)`.
- Dikunci: 2 unit test + gate Review kini memeriksa nilai opsi A/D dan checkbox "Jawaban benar A"
  setelah draft dibuat. 637 unit test / 88 file.

### P1 audit tampilan — status produk huruf besar (2026-09-22)
- `products`/`product_prices` memakai **HURUF BESAR** (dikunci CHECK `status = upper(status)`), tetapi
  form, filter, dan penulisan memakai huruf kecil. Akibatnya: filter "Aktif" **selalu 0 baris**
  (0 baris `active` vs 15 `ACTIVE`), simpan/edit produk gagal `check_violation` 23514, dan harga lama
  dinonaktifkan dengan `inactive` yang juga melanggar constraint.
- Perbaikan: `ADMIN_DOMAIN_LISTS.products.statusCase = 'upper'` (filter + hitungan menyesuaikan),
  `saveProduct` menormalkan `input.status.trim().toUpperCase()` + validasi `DRAFT/ACTIVE/ARCHIVED`,
  deaktivasi harga memakai `INACTIVE`, opsi form/filter memakai nilai uppercase.
- Bukti langsung (transaksi rollback): tulis `active` ditolak 23514; `ACTIVE`/`INACTIVE` lolos.
- Dikunci 3 unit test. Spec 10 juga diperbarui mengikuti alur review massal baru (panel di balik
  `?bulk=1`, tombol langkah 1 dinamis) — **gate admin 60 passed, exit 0**.
- Sisa temuan audit tampilan (P2, belum dikerjakan): label `settlement` mentah, tipe soal/produk
  mentah, campur bahasa tombol/label.

### P2 audit tampilan — label mentah & campur bahasa (2026-09-22)
- `adminStatusLabel`: status pembayaran Midtrans (`settlement`, `capture`, `deny`, `expire`, `cancel`,
  `refund`, `partial_refund`, `chargeback`) kini berlabel Indonesia — sebelumnya tampil mentah.
- Helper baru `adminQuestionTypeLabel` + `adminProductTypeLabel` (`lib/admin-format.ts`): header detail
  Review tidak lagi menampilkan `single_choice`; daftar produk tidak lagi `PASS/TOKEN_PACK` dan kata
  "grant" → "N token".
- Bahasa diseragamkan di alur review & commerce: tombol "Terbitkan soal", "Ubah draf / revisi", label
  form (Mapel / subtes, Tingkat kesulitan + Mudah/Sedang/Sulit, Level kognitif, Sumber / referensi,
  Materi utama), opsi tipe soal, judul kartu & header tabel commerce (Pesanan/Pembayaran/Pengguna/
  Dibuat/Penyedia/Nominal/Metode).
- Spec 7 disesuaikan. Verifikasi: **643 unit test / 90 file**; gate Review 5 passed; gate admin 60 passed.
- Sisa (P3): "Edit"/"Archive" pada baris daftar masih Inggris (dipakai luas — butuh keputusan),
  blank vs `—`, `entity_type` mentah di `/admin/audit`.

### P3 audit tampilan — istilah baris, opsi mentah, jenis entitas (2026-09-22)
- Aksi baris daftar memakai istilah Indonesia: **"Ubah"/"Arsipkan"** (products/events/questions/exams/
  articles), judul modal "Ubah product/event", konfirmasi "Produk … akan diarsipkan"; artikel
  "Terbitkan"/"Tarik dari terbit".
- Opsi select tidak lagi menampilkan nilai mentah: status event/sesi (Terjadwal/Berlangsung/Selesai/
  Diarsipkan) dan status produk (Draf/Aktif/Diarsipkan).
- `/admin/audit`: `adminEntityTypeLabel` dipakai di tabel dan label opsi filter (nilai filter tetap
  mentah); helper label baru mengembalikan `—` untuk nilai kosong.
- Dikunci 3 unit test: label entitas, tidak ada `<option>nilai_mentah</option>`, tidak ada `>Edit<`/`>Archive<`.
- Spec 10 + gate QB disesuaikan. Verifikasi: **646 unit test / 90 file**; gate admin 60 passed;
  gate Review 5 passed; gate QB lulus.
- Catatan: "Products/Exams/Articles" sebagai judul halaman/nav sengaja dibiarkan (nama modul) — hanya
  aksi dan nilai data yang diseragamkan.

### P4 audit tampilan — konsistensi alur admin lintas modul (2026-09-22)
- Tipe ujian tidak lagi menampilkan kode database `DRILL`/`MINI_TRYOUT`/`FULL_TRYOUT`/`EVENT`;
  kartu dan form memakai label manusiawi. Istilah utama halaman ujian diseragamkan menjadi Ujian,
  Bagian, Batas percobaan, Biaya token, Nilai kelulusan, dan jumlah soal tersedia.
- Form produk memakai label Paket token/Langganan/Tiket event sambil mempertahankan nilai backend;
  sumber entitlement `order_item` tampil sebagai "Pembelian produk".
- Reviewer Workspace memakai istilah Indonesia untuk draf, antrean, riwayat review, jejak audit,
  dan riwayat versi. Tombol review massal hanya muncul bagi role dengan `content.review` atau
  `content.publish`; deep-link tanpa izin kembali ke antrean biasa.
- Pergantian Program/Track sekarang membuang `bulk` dan `page`, sehingga mode review massal atau
  halaman lama tidak aktif kembali secara tidak sengaja di konteks baru.
- Dashboard dirapikan menjadi Konten/Ujian/Produk, Antrean review, Konteks aktif, dan Aksi cepat.
  Tidak ada perubahan schema atau migration.
- Verifikasi: lint dan typecheck lulus; **649 unit test / 90 file**; build produksi lulus; gate admin
  **60 passed, exit 0** mencakup 14 route, role, alur form, serta overflow mobile 390 px dan tablet
  1024 px. Warning tracing `lib/event-certificate-pdf.ts` tetap warning lama di luar scope.

### Antrean review hanya berisi yang perlu tindakan (2026-09-22)
- Setelah backfill 353 soal legacy terbit, antrean tenggelam oleh soal selesai. Default antrean kini
  **"Perlu tindakan"**: semua status kecuali `published`/`archived`. Filter eksplisit **"Semua status"**
  (`status=all`) tetap tersedia; antrean 6 baris di dashboard memakai aturan yang sama.
- `AdminListToolbar` mendapat `statusPlaceholder`; halaman review menambah opsi `all`.
- Spec 7 disesuaikan dengan label hasil polish (Buat draf soal, Putaran N, Jejak audit) yang tertinggal
  dari commit `565db82`.
- Verifikasi: **653 unit test / 90 file**; gate Review 5 passed; gate admin 60 passed.

### Tahap A — upload gambar soal & opsi (2026-09-22)
- Bucket `question-images` dipakai untuk gambar soal: policy baru `question_images_content_upload`
  (folder `questions/<uid>/`, permission `content.create`/`content.update`/`question.manage`) plus policy
  hapus untuk berkas sendiri. Policy lama yang memeriksa kolom `profiles.role` (sudah dihapus di
  Schema V2) dibuang.
- **Bug diperbaiki:** `ArticleRichTextEditor` mengunggah ke bucket `question-images` dengan folder
  `articles/` — selalu gagal; kini memakai bucket `article-images` seperti `ArticleForm`.
- Helper murni `lib/question-media.ts`: validasi (2 MB, jpg/png/webp/gif), path per pengguna, markup
  `[[image:url]]`, dan penyisipan di posisi kursor — dikunci 11 unit test + 4 kontrak.
- UI: `QuestionRichTextField` (tombol "Sisipkan gambar" pada Pertanyaan & Pembahasan; dipakai Question
  Bank **dan** Review Queue) dan `QuestionImageButton` (unggah + pratinjau + hapus pada setiap opsi).
  Pratinjau memakai `MathRenderer` yang sudah ada.
- Gate QB menambah langkah unggah nyata (pertanyaan + opsi) dan membersihkan berkas storage di `finally`;
  staging 0 sisa berkas uji.
- Migration `20260922120000_question_image_upload_v1.sql` **ter-apply di staging DAN produksi**
  (GO 2026-09-22; ledger via `migration repair`). Verifikasi produksi: policy
  `question_images_content_upload` + `question_images_content_delete` ada, policy lama yang memeriksa
  `profiles.role` hilang.
- Verifikasi: **666 unit test / 92 file**; gate QB lulus; gate Review 5 passed; gate admin 60 passed.

### Tahap B — toolbar snippet rumus (2026-09-22)
- `lib/latex-snippets.ts`: 18 snippet (pecahan, akar, pangkat, indeks, operator × ÷ ± ≤ ≥ ≠, simbol
  π α θ ∞, serta integral/sigma/limit/matriks sebagai blok `$$…$$`) dengan `cursorBack` agar kursor
  berhenti di dalam `{}` siap diketik.
- `FormulaToolbar` dipakai di Pertanyaan & Pembahasan (`QuestionRichTextField`) dan versi ringkas di
  setiap isi opsi (`QuestionOptionsEditor`); snippet disisipkan di posisi kursor dan dirender
  `MathRenderer`/KaTeX yang sudah ada — pratinjau soal langsung menampilkan hasilnya.
- Gate QB menambah langkah klik tombol "Pecahan" dan memastikan `\frac` masuk ke textarea.
- **Sisa opsional selesai (2026-09-22):** tempel (Ctrl/Cmd+V) & tarik-lepas gambar pada Pertanyaan,
  Pembahasan, dan isi opsi — memakai jalur unggah yang sama dengan tombol (validasi + kompresi);
  event non-gambar dibiarkan lewat. **Kompresi klien:** berkas >512 KB diperkecil ke maks 1600 px dan
  di-encode WebP, GIF dilewati agar animasinya tidak hilang, berkas mentah boleh sampai 8 MB.
  Terverifikasi di gate: **1,02 MB → 81 KB**.
- Verifikasi: **679 unit test / 93 file**; gate QB lulus (unggah, drop, rumus, kompresi); gate Review
  5 passed; staging 0 sisa berkas uji.

### Editor visual soal — WYSIWYG (2026-09-22)
- Pertanyaan & Pembahasan di Question Bank kini memakai editor **TipTap**: rumus dirender KaTeX
  langsung di editor (node `data-latex`/`data-latex-block`) dan gambar tampil sebagai gambar (`<img>`)
  — penulis tidak melihat kode `$...$`/`[[image:...]]`. Toolbar: tebal, miring, daftar, tombol rumus,
  serta unggah/tempel/drag-drop gambar.
- Format simpan menjadi HTML, tetapi **soal lama tetap aman**: `parseRichTextSegments`
  (`lib/question-rich-text.ts`) membaca format lama (`$…$`, `[[image:…]]`, markdown, HTML) maupun
  format editor, dan dipakai `MathRenderer` untuk halaman peserta/hasil/pratinjau. Saat soal lama
  dibuka, `questionTextToEditorHtml` mengonversinya ke bentuk editor (produksi: 40 stem HTML,
  6 ber-`$`, 7 ber-gambar, **0 campuran HTML+math**).
- Editor read-only saat soal terkunci; update inisialisasi tidak lagi menandai form "dirty" (dulu
  memicu dialog konfirmasi sebelum admin mengubah apa pun).
- **Isi opsi & form Review Queue kini memakai editor yang sama.** Isi opsi memakai mode ringkas
  (tanpa daftar; tombol gambar ikon di toolbar) dan menyimpan HTML di dalam JSON `options`.
  Soal lama yang belum disentuh tetap utuh — hidden `options` tidak berubah sampai penulis
  mengedit baris tersebut; begitu diedit, baris itu dinormalkan ke HTML (`<p>…</p>`).
- **Rumus bisa diubah isinya.** Node rumus adalah `atom` (tidak bisa diketik seperti teks), jadi
  klik rumus membuka editor LaTeX (Enter = terapkan, Esc = batal, tombol hapus; kursor otomatis
  di placeholder `{}` pertama), dan snippet dari toolbar membawa `autoEdit` sehingga popover
  langsung terbuka — mis. `a/b` → isi pembilang/penyebut, `matriks` → ubah angka, dengan pratinjau
  langsung untuk rumus blok. LaTeX tidak valid dirender merah (`errorColor`), bukan crash.
- Dua jebakan yang ditutup saat integrasi: (1) pelaporan perubahan ke form induk tidak lagi
  bergantung pada fokus editor (dulu aksi programatik seperti unggah gambar/tombol rumus tak
  terlaporkan → form tidak "dirty", JSON opsi kosong) — kini baseline HTML awal dicatat dan
  setiap perubahan dokumen setelahnya dilaporkan; (2) div `contenteditable` diberi
  `role="textbox"` eksplisit agar Chrome mengeksposnya sebagai field teks (pembaca layar +
  locator role). `required` pada editor dijaga di event submit form.
- Verifikasi: **688 unit test / 93 file**; gate QB lulus (unggah/drop/rumus + **ubah isi rumus
  inline & blok** + kompresi 3,44 MB → 756 KB + isi opsi HTML/gambar/rumus + workflow
  publish/revise); gate Review 5 passed; gate admin 60 passed.
- `QuestionRichTextField` + `useImagePasteDrop` (jalur textarea lama) **dihapus**; seluruh
  penulisan soal lewat editor visual.
- Tahap berikutnya (opsional): normalisasi HTML massal untuk soal lama bila diinginkan.

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
- Lint 0/0 · typecheck · **688 unit test / 93 file** · build lolos.
- Gate Review lokal (gate baru `node scripts/local-gates/run-gate.mjs review`): **5 passed, exit 0**
  (setup + 3 spec + cleanup); port dibersihkan setelah run.
- Gate Question Bank: lulus penuh (regresi `lib/postgrest-filter` di jalur pencarian admin).
- Gate admin: hijau terakhir 60 passed; perubahan ini tidak menyentuh permukaan admin.

File: `lib/postgrest-filter.ts` (baru), `lib/review-batch.ts`, `lib/admin-format.ts`,
`src/services/admin-workspace.service.ts`, `src/services/content-review.service.ts`,
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
`tests/unit/review-assign-policy.test.ts`, `lib/question-source.ts` (baru),
`tests/unit/question-source-placeholder.test.ts` (baru), `tests/unit/review-options-preserved.test.ts` (baru), `tests/unit/admin-product-status-case.test.ts` (baru), `tests/unit/admin-display-labels.test.ts` (baru),
`components/admin/ReviewQuestionFields.tsx`, `components/admin/ArticleStatusActions.tsx`,
`components/admin/AdminListToolbar.tsx`, `lib/question-media.ts` (baru),
`components/admin/QuestionImageButton.tsx` (baru), `components/admin/QuestionRichTextField.tsx` (baru),
`components/admin/ArticleRichTextEditor.tsx`, `lib/latex-snippets.ts` (baru),
`components/admin/FormulaToolbar.tsx` (baru), `lib/question-media-client.ts` (baru),
`components/admin/useImagePasteDrop.ts` (baru), `components/admin/QuestionRichTextEditor.tsx` (baru),
`components/admin/QuestionOptionsEditor.tsx`, `components/MathRenderer.tsx`, `lib/question-rich-text.ts`,
`supabase/migrations/20260922120000_*.sql`,
`app/admin/assessment/exams/AdminExamsWorkspace.tsx`, `app/admin/audit/page.tsx`,
`tests/e2e/specs/10-admin-workspace-authenticated.spec.ts`,
`supabase/migrations/20260922010000_*.sql`,
`scripts/db-verify/review-assign-policy.sql`, `src/auth/permissions.ts`, `docs/STATUS.md`.

---

## Operasi data produksi — 2026-09-22

Dijalankan atas instruksi pemilik produk, dengan backup baris sebelum perubahan di luar repo
(`backup-legacy-products.json`, `backup-legacy-order-items.json`, `backup-legacy-questions.json`,
`backup-qa-exams.json`).

### Produk legacy dibersihkan (26 → 16 produk)
- 11 produk `LEGACY_*` (4 event ticket + 7 paket) semuanya dirujuk **322 `order_items`**
  (FK `ON DELETE RESTRICT`), milik 322 order pelanggan (50 lunas) — tidak bisa dihapus tanpa merusak
  riwayat.
- Solusi: satu produk dipakai ulang sebagai **`LEGACY_HISTORY_PLACEHOLDER`**
  ([Legacy] Riwayat pembelian, `ARCHIVED`); 307 item dialihkan ke sana (15 sudah di sana → 322), lalu
  **10 produk legacy dihapus**.
- Validasi: `order_items` 332 · `orders` 332 · `profiles` 429 — **tidak berubah**. Produk kini
  15 katalog `ACTIVE` + 1 placeholder. Riwayat pelanggan aman (halaman transaksi CPNS hanya
  menampilkan `TOKEN_PACK`; legacy memang tidak pernah tampil).

### Soal legacy diterbitkan (353 soal)
- **353 draft legacy CPNS/SKD diterbitkan lewat alur resmi** (submit → assign → approve Editorial →
  Academic → Technical QA → publish), bukan update status langsung. Semua `single_choice` dengan
  **tepat 1 kunci** (divalidasi sebelum eksekusi); **353/353 berhasil, 0 gagal**, masing-masing
  meninggalkan 3 review round + audit (akun SUPER_ADMIN sebagai reviewer/approver).
- Kapasitas terbit CPNS/SKD kini **TWK 237 · TIU 113 · TKP 113** (kebutuhan section 30/35/45).
- 232 soal legacy lain **sudah terbit sejak cutover Agustus** tanpa jejak review (dipublikasikan
  migrasi); dibiarkan apa adanya — di luar operasi ini.
- Backup status sebelum perubahan tersimpan (`backup-legacy-questions.json`); pembalikan bisa lewat
  alur `revise` bila diperlukan.

### Artefak dev dibersihkan dari produksi
- **9 exam `[QA]` dihapus** (8 `archived` + `[QA] TKA SD E2E` draft) — semuanya 0 attempt/sesi/
  assignment, termasuk 3 item `[CONTOH]` di dalamnya.
- **11 soal `[CONTOH]` TKA-SD-BIND tidak dihapus** (dipakai 83 riwayat attempt + 3 exam item) — tetap
  `archived`, di luar pool peserta.
- **Aturan:** konten dev/coba-coba hanya di staging, tidak dimasukkan ke produksi.

---

## 5. Goal aktif

1. **Product Experience V1.1** — UI/UX, UX writing, copywriting, GTM (GitHub issue #21–#24).
   Backlog: `docs/PRODUCT_EXPERIENCE_V1_1_IMPLEMENTATION_BACKLOG.md`.
2. **Menutup blocker keamanan P0** sebelum domain dibuka (bagian 6).
3. **Merapikan maintainability**: satu sumber kebenaran status (dokumen ini), CI hijau, riwayat migrasi disamakan.

Goal berikutnya (belum aktif): **CPNS Instansi Managed Service** (B2B) — PRD di `docs/notes/prd-cpns-instansi-managed-service.md`.

---

## 6. Security status and historical blockers

### P0 — keamanan (kebocoran kunci jawaban) — CLOSED 2026-10-06

Snapshot sebelum hotfix dan status verifikasi terkini:

| # | Temuan | Status kode | Status DB |
|---|---|---|---|
| P0-1 | `get_content_question_detail` guard gagal-aman pada nilai authorization NULL | ✅ fail-closed guard di `20261006135419_harden_nullable_content_question_access_guard.sql` | ✅ applied production (ledger `20261006165617`); participant RPC denied; authorized SUPER_ADMIN smoke passed |
| P0-2 | Direct SELECT pada `question_versions` | ✅ revoke dan policy hardening sebelumnya | ✅ participant SELECT denied setelah hotfix; authenticated grant tidak ada |

**Bukti sebelum perbaikan di produksi (2026-09-16):** guard `VULNERABLE`, grant + policy ada; uji dengan identitas user biasa (transaksi di-rollback) mengembalikan `options`, `explanation`, dan **`is_correct` = true** → kunci jawaban benar-benar terbaca.

**Bukti historis sesudah perbaikan 2026-09-16 (sebelum nullable-edge hotfix):**

| Skenario | Hasil |
|---|---|
| User login biasa (tanpa permission) memanggil `get_content_question_detail` | ❌ `Question detail access denied` (benar) |
| User login biasa membaca `question_versions` | ❌ `permission denied for table question_versions` (benar) |
| User dengan `content.read/review/publish` memanggil RPC | ✅ tetap boleh (workspace review tidak rusak) — *verifikasi staging 2026-09-16; saat itu produksi belum punya user ber-role konten* |
| Integritas data | ✅ tidak berubah (produksi: 428 profil, 1088 soal sebelum & sesudah) |

- Migration perbaikan historis: `supabase/migrations/20260916213000_*.sql`, `20260916213100_*.sql` — tercatat pernah di-apply ke staging dan produksi. Cakupannya tidak menguji actor tanpa permission terhadap soal yang `author_id` dan `reviewer_id`-nya NULL.
- Nullable guard production smoke (2026-10-06): `question_versions` participant SELECT = denied; participant detail RPC = denied; authorized existing SUPER_ADMIN detail RPC = pass. The production nullable-row fixture is unavailable (no published row has both author and reviewer NULL).
- Security migration source: `supabase/migrations/20261006135419_harden_nullable_content_question_access_guard.sql`; applied to staging under ledger version `20261006135534` and production under ledger version `20261006165617`. Ledger versions are assigned by the migration service at apply time; the migration name and SQL body match.
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
- [x] P0-1 RPC answer-key guard lulus verifikasi produksi setelah migration `20261006165617` (2026-10-06).
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
  - `src/services/commerce.service.ts` + `src/services/admin-workspace.service.ts` — tidak lagi hardcode
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
