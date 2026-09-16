# Siap Tempur Agent Progress

> Dokumen ini adalah memori persisten pekerjaan agent. Baca ini dulu setelah
> context reset, lalu lanjutkan dari **Next Action**.
> Dokumen status produk (satu-satunya sumber kebenaran) tetap `docs/STATUS.md`.

## Current Objective

Audit dan selesaikan Siap Tempur hingga **staging-ready release** yang stabil untuk
CPNS dan TKA: core user journey jalan end-to-end, arsitektur & database konsisten,
UI/UX rapi & responsive, tanpa blocker kritis pada build, auth, authorization,
exam engine, scoring, result, drill, remedial, dan akses pengguna.

## Current Architecture Understanding

- Next.js 16 (App Router) + TypeScript + Tailwind 4; Supabase (Auth + Postgres + RLS/RPC + Storage); Midtrans; Vercel.
- Lapisan: `app/actions` + `app/api` → `src/services` → `src/repositories` → Supabase.
- Otorisasi terpusat: `src/services/authorization.service.ts` (`user_roles → roles → permissions`).
  `lib/utils/admin.ts` hanya adapter transisi. Kolom `profiles.role` **sudah tidak ada** di Schema V2.
- Middleware Next 16 ada di `proxy.ts` (bukan `middleware.ts`): CSP nonce + `updateSession` + redirect route admin legacy.
- Exam: attempt disimpan di `exam_attempts`; payload jawaban dari `attempt_questions.question_snapshot`
  (sudah tidak memuat `is_correct`); penilaian server-side dari `question_options`.
- Environment: staging `lpgrivowdcepcxradavu`, produksi `llnttutwhtvxtdktiizo`. Domain publik **sengaja mati** (dark launch).

## Completed

- [x] P0 kebocoran kunci jawaban — `get_content_question_detail` (guard status approved/published) dan
      `GRANT SELECT question_versions TO authenticated` + policy. Migration + sinkronisasi bootstrap +
      regression test. **Diterapkan & diverifikasi di staging DAN produksi.**
- [x] Admin produksi ditetapkan (`SUPER_ADMIN` untuk `halimdirga8@gmail.com`) — sebelumnya `user_roles` kosong
      sehingga `/admin` tidak bisa diakses siapa pun.
- [x] Baseline ledger migrasi remote (staging 82→155, produksi 165→155) sehingga `supabase db push` normal;
      riwayat lama diarsipkan di `supabase/migration-history-archive/`.
- [x] Deadline ujian ditegakkan server-side (`ATTEMPT_TIME_EXPIRED`, toleransi 30 detik).
- [x] `getResult` menolak attempt yang belum `completed`.
- [x] `updateEventCertificateName` tidak lagi memakai kolom legacy `profiles.role`.
- [x] Validasi zod server-side di auth action + hapus cast `FormData` yang bisa null.
- [x] Rate limit auth action (login/signup/forgot/resend) + helper IP tepercaya `lib/request-ip.ts`.
- [x] CSP disatukan ke `proxy.ts` (CSP statis `unsafe-inline`/`unsafe-eval` dihapus dari `next.config.ts`).
- [x] CI: locator landing basi diperbaiki (`data-testid`), workflow E2E diarahkan dari `feat/schema-v2` ke `main`.
- [x] `docs/STATUS.md` sebagai satu sumber kebenaran + banner HISTORIS pada dokumen usang.
- [x] E2E: `auth.setup.ts` mengikuti alur nyata login → `/onboarding` → dashboard; `3-dashboard.spec.ts`
      memakai locator href (label "Riwayat" sudah berganti jadi "Hasil").
- [x] E2E `16-console-health.spec.ts`: halaman publik bebas hydration/uncaught error.
- [x] E2E `17-authenticated-route-health.spec.ts`: 27 route CPNS/TKA ber-auth merender halaman nyata
      (status < 500, ada `<main>`, tidak kosong, console bersih) + 2 redirect sengaja
      (`/tka`→`/tka/smp`, `/tka/smp/beli-token`→`/tka/smp/pass`) + 10 route inti bebas overflow
      horizontal di viewport mobile 390×844.
- [x] Audit responsif manual: 18 route ber-auth × {mobile 390×844, tablet 1024×768} = 36 kombinasi, **0 overflow**
      dan 7 halaman publik × {mobile, tablet, desktop 1440×900} = 21 kombinasi, **0 overflow**.
- [x] `npm run lint` bersih total: 0 error, 0 warning.
- [x] Verifikasi browser nyata dengan user staging disposabel (dibuat lalu dihapus; 0 sisa):
      login → onboarding → dashboard → beli paket, dan seluruh route ber-auth.
- [x] Audit `Admin flow` dengan user staging disposabel ber-role ADMIN: 9 route `/admin` —
      menemukan 1 route rusak, diperbaiki, kini 9/9 sehat.
- [x] **Flow drill CPNS diverifikasi end-to-end di browser** (user staging disposabel dengan track SKD aktif +
      saldo token, dihapus lagi): pilih materi → konfirmasi token → sesi dimulai → pilih jawaban →
      "Selanjutnya" sampai soal terakhir → "Kumpulkan jawaban" → modal konfirmasi → **halaman hasil tampil
      dengan skor & pembahasan**, 0 critical console error.
- [x] **Flow full tryout CPNS diverifikasi end-to-end di browser** (110 soal, user uji dengan track+token):
      "Mulai Full Tryout" → konfirmasi token → sesi 110 soal → lompat ke soal terakhir lewat navigator →
      "Kumpulkan jawaban" → modal → **hasil dengan skor + breakdown TWK/TIU/TKP**, 0 critical console error.
- [x] **Flow TKA SMP tuntas terverifikasi end-to-end di browser** (user uji track SMP, dihapus lagi):
      Mini Tryout (Bahasa Indonesia) → pilih jawaban → soal terakhir → "Kirim tryout" → konfirmasi →
      **halaman hasil `/tka/smp/tryout/<id>/result` dengan angka skor**, 0 critical console error.
      Catatan: TKA memakai `window.confirm()` native (bukan modal custom seperti CPNS) — Playwright
      otomatis men-dismiss dialog, jadi skrip wajib memasang `page.on('dialog', d => d.accept())`.
      Spec 6/8/13 sudah menangani ini dengan benar dan menguji submit → result, jadi **bukan bug produk**.
- [x] **TKA SMP: sesi ujian berjalan** (user uji track SMP aktif, dihapus lagi): `/tka/smp` dashboard,
      Mini Tryout 2 paket (BIN/MAT) bisa dimulai, sesi memuat soal + opsi (`data-selected`) dan jawaban
      tersimpan; **Full Tryout menampilkan "Butuh Tempur Pass"** — gate monetisasi server-side bekerja
      seperti yang diputuskan.
- [x] **FIXED: Snap dimuat di semua halaman TKA.** `app/tka/layout.tsx` memuat skrip pembayaran Midtrans
      di setiap halaman TKA ber-login (dashboard, sesi ujian, hasil) — beserta iframe popup
      `app.sandbox.midtrans.com`. Kini hanya `/tka/[level]/pass` yang memuatnya (halaman itu sudah punya
      loader sendiri), dan URL sandbox yang di-hardcode diganti `env.midtransSnapScriptUrl()`.
      Terverifikasi: `/tka/smp` & `/tka/smp/mini-tryout` → 0 skrip Snap, 0 iframe pihak ketiga, 0 pesan CSP;
      `/tka/smp/pass` → Snap tetap tersedia.
- [x] **Klarifikasi penting:** pesan "Executing inline script violates Content Security Policy" di console
      halaman TKA **berasal dari iframe popup Midtrans** (`app.sandbox.midtrans.com/snap/v4/popup`),
      bukan dari CSP kita (proxy.ts tetap nonce + strict-dynamic). Diverifikasi lewat lokasi/frame pesan —
      jangan "diperbaiki" dengan melonggarkan CSP kita.
- [x] **Backfill snapshot versi CPNS (2026-09-16):** 30 soal TWK berstatus `published` tidak punya
      baris `question_versions` (dibuat 2026-08-23, kemungkinan masuk setelah migration backfill
      `20260823085200_cpns_skd_legacy_question_versions_v1.sql` dijalankan). Dampak: admin workspace
      hanya menghitung soal yang punya versi beku sehingga kapasitas TWK ter-under-report (30 dari 60).
      Diperbaiki dengan **menjalankan ulang migration idempoten tersebut** — staging DAN (dengan GO
      eksplisit) produksi → TWK 60/60 di keduanya; total versi produksi 552 → 582 (+30 tepat).
- [x] **Keputusan konten CPNS: Opsi A** (headroom nol diterima untuk acceptance pass pertama).
      Fakta pendukung: gap-nya **gap publish, bukan gap konten** — draft tersedia TWK 207 / TIU 113 /
      TKP 113, semuanya sudah punya opsi + pembahasan tetapi belum pernah direview (kebijakan
      Production V1 melarang publikasi otomatis soal unreviewed).
- [x] **Upstash dikonfigurasi & diverifikasi (2026-09-16):** kredensial di `.env.local` diuji langsung
      ke Upstash REST (PING → PONG, INCR berhasil, key uji dibersihkan). `/api/health` kini
      mengembalikan `rateLimitStore` sehingga status redis-vs-memory bisa diverifikasi dari luar.
- [x] **Push ke `main` + CI hijau (2026-09-16):** 35 commit di-push (`b04e23f..df534a6`). GitHub Actions:
      **CI success** (lint, typecheck, unit, security audit, build, E2E) dan **Schema V2 CI success**;
      deployment Vercel Production **success**. Domain `siaptempur.id` tetap sengaja ditahan.
      Ini menutup blocker yang membuat CI merah sejak awal September.
- [x] **Audit keamanan kelas-P0 (Round 6, read-only di staging):** seluruh RPC publik yang menyentuh kunci
      jawaban/pembahasan sudah diperiksa:
      `get_exam_attempt_result/review_for_user` → ownership + wajib `completed`;
      `get_exam_attempt_state_for_user` → ownership + membuang `is_correct`/`score`;
      `get_tka_smp_wrong_questions` → `auth.uid()` + `where uwq.user_id = v_user` + membuang
      `is_correct`/`score`; `import_reviewed_cpns_legacy_question` → service-role saja;
      `get_content_question_detail` → sudah diperbaiki (Round 1).
      Hanya 2 fungsi publik yang menyentuh kunci jawaban; **tidak ada kebocoran tersisa**.
- [x] **Item rate-limit lanjutan ditutup dengan analisis:**
      `claim_voucher` **tidak ada** di runtime V2 (hanya `pg_promote` milik Postgres yang tidak
      terekspos) → vektor brute-force voucher tidak berlaku.
      `startTryout`/`startTkaExam` dibatasi token/kuota + advisory lock + start idempoten, sehingga
      penyalahgunaan sudah terbatas; menambah rate limit berisiko memblokir "lanjutkan sesi" yang sah →
      **tidak ditambahkan**, keputusan didokumentasikan.
- [x] **Regression test replay webhook:** sudah tercakup — `tests/unit/payments-webhook.test.ts`
      menguji event duplikat idempoten (baris "already processed idempotent webhook event"), dan
      bukti fulfillment idempoten terhadap staging nyata ada di `docs/TKA_SMP_MONETIZATION_AUDIT.md`
      (settlement duplikat tetap tepat 10 entitlement).
- [x] **Audit performa bundel (§22):** total JS client 3,4 MB / 74 chunk. Chunk terbesar: **tiptap 492 KB**
      — hanya diimpor `components/admin/ArticleRichTextEditor.tsx` dan `RichTextBlockEditor.tsx`, jadi
      **tidak bocor ke jalur learner**; `katex` 276 KB memang dibutuhkan untuk soal matematika; sisanya
      vendor inti. Tidak ditemukan kebocoran pustaka berat ke halaman ujian.
- [x] **Loading state dilengkapi:** `loading.tsx` untuk `/tka/[level]/tryout`, `/mini-tryout`, dan `/riwayat`
      (sebelumnya hanya CPNS yang punya padanannya). Total 29 `loading.tsx`.
- [x] **Audit akhir (Round 4):**
      (a) Semua 6 workflow GitHub valid: trigger sudah ke `main`, seluruh referensi file ada, dan nama
      project Playwright cocok (CPNS memakai `--config=playwright.cpns-rc.config.ts` dengan project
      `chromium-cpns-rc` — bukan di playwright.config.ts).
      (b) Tidak ada ekspor yatim: `chunkValues`, `getClientIp`, `isAuthActionRateLimited`,
      `AUTH_RATE_LIMITS`, `hashRateLimitSubject`, `readAttemptDurationSeconds`,
      `resolveAnswerDeadlineMs`, `assertAnswerWindowOpen` semuanya dipakai.
      (c) Loading state sudah luas (26 `loading.tsx`) + 4 error boundary; TODO/FIXME dan `console.log`
      tetap bersih (0 temuan).
- [x] **Klarifikasi cakupan:** jalur tulis admin **sudah** tercakup `7-content-review-workflow.spec.ts`
      (author → editorial → academic → technical QA → published + mobile/tablet) dan submit TKA
      tercakup spec 6/8/13 — keduanya hanya berjalan lewat workflow staging ber-OIDC.
- [x] **Audit empty state** untuk user tanpa data (dashboard, riwayat, ranking, profil, TKA progress):
      semua route render dengan pesan/CTA, 0 critical error, tidak ada halaman kosong.
      Ditemukan & diperbaiki: empty state riwayat menampilkan pesan "tidak cocok filter" padahal datanya
      belum ada → kini dibedakan + CTA "Mulai mini tryout".
- [x] **Risiko laten jalur drill ditutup:** `findQuestionIdsForKnowledgeNode` kini memakai `chunkValues`
      untuk kedua filter `.in()` (node + turunannya, dan daftar soal ter-map). Diverifikasi ulang lewat
      flow drill end-to-end di browser (mulai → jawab → kumpulkan → hasil, 0 critical error) +
      kontrak test baru.
- [x] **RLS lintas-user diverifikasi** (dua user uji staging):
      (a) di browser — user B membuka URL sesi & hasil milik A → dialihkan ke `/cpns/dashboard/tryout`,
      tidak ada konten A yang bocor;
      (b) di database — user simulasi (`authenticated`, uuid acak) melihat **0 baris** untuk
      `exam_attempts`, `wallets`, dan `profiles` milik user lain, dan 0 baris total di `exam_attempts`.
      `attempt_questions`/`attempt_answers` bahkan tidak diberi SELECT ke `authenticated`
      (`permission denied for table attempt_questions`).
- [x] **Flow mini tryout CPNS diverifikasi end-to-end di browser**: "Mulai TWK" → konfirmasi token → sesi →
      jawab → kumpulkan → **halaman hasil dengan skor & pembahasan**, 0 critical console error.
- [x] Locator opsi jawaban kini berbasis `data-testid="answer-option-<index>"` (ditambahkan di
      `PracticeSessionClient`); `11-cpns-rc.spec.ts` tidak lagi memakai filter teks `/^A/` yang rapuh.
- [x] **FIXED** `/admin/assessment/exams` gagal render (error boundary) karena URL PostgREST
      mencapai 22.594 karakter → `HeadersOverflowError`. Filter `.in()` besar kini di-batch
      lewat helper bersama `lib/supabase-batch.ts`.

## In Progress

- [ ] Audit lanjutan: mini tryout → submit → scoring → result → remedial (CPNS) dan TKA setara.
      Catatan: `11-cpns-rc.spec.ts` sudah mencakup full tryout lifecycle + drill start/token, tetapi
      hanya berjalan lewat workflow `cpns-staging-e2e.yml` (butuh OIDC + Vercel preview).

## Remaining

- [ ] Set `UPSTASH_REDIS_REST_URL`/`_TOKEN` di Vercel (staging & produksi) agar rate limit lintas instance.
- [ ] Verifikasi empiris header IP (`lib/request-ip.ts`) terhadap deployment Vercel nyata.
- [ ] TKA memakai `window.confirm()` native sedangkan CPNS memakai modal custom — inkonsistensi UX
      kecil (P3); berfungsi dan sudah ditangani spec.
- [ ] TKA SD/SMA: saat ini menampilkan "segera hadir" (sesuai scope Production V1) — diputuskan ditunda.
- [ ] WIP manusia yang belum di-commit: `PilihJalurContent` (surface CPNS/TKA) — **jangan diubah tanpa izin**.

## Bugs Found

1. **P0** kunci jawaban bocor lewat RPC `get_content_question_detail` + `question_versions` (staging & produksi) — FIXED.
2. `updateEventCertificateName` selalu `Unauthorized` karena membaca `profiles.role` yang sudah dihapus — FIXED.
3. Timer ujian CPNS/event hanya ditegakkan di client — FIXED (server-side).
4. `auth.setup.ts` salah asumsi tujuan login (`/cpns/dashboard`), padahal `/onboarding` — FIXED.
5. `3-dashboard.spec.ts` mencari label "Riwayat" yang sudah berganti "Hasil" — FIXED.
6. Locator landing `HomePage.ts` basi ("SiapTempur TKA SMP") — FIXED (CI merah ±12 hari).
7. `user_roles` produksi kosong → `/admin` tak bisa diakses — FIXED (admin ditetapkan).
8. Ledger migrasi remote tidak sinkron → `db push` menolak jalan — FIXED (baseline).
9. **P1** `/admin/assessment/exams` gagal render (error boundary) karena URL PostgREST melebihi batas
   header (22.594 karakter, `HeadersOverflowError`) — FIXED (filter `.in()` di-batch).
10. **Kesiapan staging (bukan bug kode):** di staging **dan** produksi, track CPNS hanya punya exam
    `[QA]` (0 `exam_question_items`, 0 blueprint rules) plus 3 draft `[Legacy History]`. Soal published
    per subjek: TWK 60, TIU **35**, TKP **45** — sedangkan section meminta TWK 30, TIU 35, TKP 45,
    jadi headroom **nol** untuk TIU & TKP (satu soal unpublished → Full/Mini Tryout gagal
    `QUESTION_BANK_INCOMPLETE`). Dari 9 materi Latihan Fokus, **6 belum bisa dimulai** (<30 soal).
11. **Gap scope (bukan regresi): CPNS tidak punya flow "ulang soal salah"/remedial.** Tidak ada route
    `app/cpns/**/wrong*` maupun `**/remedial*`, dan `app/actions/tka-remedial.ts` /
    `tka-wrong-questions.ts` tidak dipakai di `app/cpns`. Yang ada di halaman hasil CPNS hanya
    "Latihan fokus" (→ drilling-materi), "Lihat semua hasil", dan pembahasan inline. Ini konsisten
    dengan `docs/FEATURE_STATUS_CHECKLIST.md` (CPNS learning loop belum selesai) dan
    `docs/PRODUCTION_V1_SCOPE.md` (remedial CPNS tidak termasuk Production V1). Remedial terimplementasi
    hanya untuk TKA SMP. **Butuh keputusan produk** sebelum dibangun — bukan diimplementasikan
    sepihak oleh agent.

## Decisions

- **Tidak push ke `main`**: push memicu deploy produksi Vercel; butuh konfirmasi eksplisit pengguna.
- **Flag `tka.smp.monetization_enforcement` dibiarkan ON (100%)** di produksi — keputusan pengguna.
- Rate limit: **Upstash Redis**, fail-open saat Redis mati, login/signup **tidak** dibatasi per-email (cegah lockout DoS).
- Limiter dipasang **setelah** validasi zod dan **sebelum** Supabase.
- `fulfill_paid_order` tidak ditambah cek internal `service_role`: ACL sudah ketat (`postgres` + `service_role` saja), menulis ulang fungsi pembayaran ±220 baris berisiko lebih besar daripada manfaatnya.
- TKA SD/SMA tetap "segera hadir" (di luar scope Production V1) — bukan dead-end, sudah ada halaman coming soon.

## Database Changes

- `app_private.get_content_question_detail` — guard diperketat (hanya author/reviewer/permission konten).
- `public.question_versions` — `SELECT` dicabut dari `anon`/`authenticated`/`PUBLIC`; policy `question_versions_authoring_select` dihapus.
- `public.user_roles` — 1 baris `SUPER_ADMIN` di produksi.
- `supabase_migrations.schema_migrations` — baseline di staging & produksi (155 baris, = daftar file repo).
- Tidak ada perubahan pada `feature_flags` (monetisasi tetap ON).

## Migrations

- `supabase/migrations/20260916213000_fix_content_question_detail_answer_key_leak.sql` (applied staging + produksi)
- `supabase/migrations/20260916213100_revoke_authenticated_question_versions_select.sql` (applied staging + produksi)
- Bootstrap `scripts/cutover/bootstrap/08,16,18` disinkronkan (fresh bootstrap tidak mengulang lubang).

## Tests

```text
Lint        : ✅ 0 error, 0 warning
Typecheck   : ✅
Unit        : ✅ 46 file / 214 test (vitest)
E2E publik  : ✅ 30 test (chromium-public, termasuk 6 test console-health)
E2E auth    : ✅ 40 test (setup + 2 dashboard + 27 route-health + 10 mobile overflow) — opt-in
Build       : ✅
CI GitHub   : ✅ success (main @ df534a6) — lint/typecheck/unit/audit/build/E2E
```

Test baru: `answer-key-access-contract`, `admin-authorization-contract`, `attempt-deadline`,
`auth-validation-contract`, `request-ip`, `auth-rate-limit`, `16-console-health.spec.ts`.

## Important Files

- `docs/STATUS.md` — status produk (sumber kebenaran).
- `lib/request-ip.ts`, `lib/server-rate-limit.ts`, `lib/api-utils.ts` — rate limit & IP.
- `app/auth/actions.ts` — auth server actions (zod + rate limit).
- `src/services/attempt-answer.service.ts` — deadline ujian.
- `src/services/practice-result.service.ts` — guard hasil ujian.
- `tests/e2e/auth.setup.ts`, `tests/e2e/specs/3-dashboard.spec.ts`, `tests/e2e/specs/16-console-health.spec.ts`.
- `supabase/migration-history-archive/` — arsip ledger sebelum baseline.

## Current Blockers

1. **Push ke remote** (butuh konfirmasi; memicu deploy produksi Vercel). CI `main` di GitHub masih merah sampai push.
2. **Env Upstash** belum ada di Vercel → rate limit masih per-instance.
3. **Kredensial E2E staging** (`E2E_PARTICIPANT_EMAIL`/`PASSWORD`) kosong di `.env.local` → E2E ber-auth bersifat opt-in; dipakai user disposabel saat verifikasi manual.
4. **Akses akun Upstash/Vercel** tidak tersedia untuk agent.

## Next Action

1. **Telusuri submit TKA SMP** yang tidak berpindah ke halaman hasil (cek apakah butuh seluruh bagian
   selesai, atau tombol kirim butuh alur berbeda). Ini satu-satunya langkah flow inti yang belum tuntas.
2. Audit jalur **tulis admin** (buat/edit exam & soal) memakai user admin disposabel: selama ini baru
   diverifikasi render (baca).
3. Audit **loading state** (`loading.tsx`) pada route ber-auth.
4. Perbaiki temuan, jalankan lint/typecheck/unit/build/E2E, commit atomic, update dokumen ini.
