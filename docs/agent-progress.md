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

- [ ] `push` ke `main` (belum dilakukan — push memicu deploy produksi Vercel, butuh konfirmasi eksplisit).
- [ ] Set `UPSTASH_REDIS_REST_URL`/`_TOKEN` di Vercel (staging & produksi) agar rate limit lintas instance.
- [ ] Verifikasi empiris header IP (`lib/request-ip.ts`) terhadap deployment Vercel nyata.
- [ ] Rate limit untuk `startTryout`/`startTkaExam`/`claim_voucher` (kandidat berikutnya, perlu analisis agar tidak mengganggu alur ujian sah).
- [ ] Regression test replay webhook end-to-end.
- [ ] **Flow TKA SMP belum diuji end-to-end di browser** (butuh track TKA aktif + Tempur Pass karena
      flag monetisasi ON; spec 6/8/9/13 ada tetapi hanya jalan lewat workflow staging ber-OIDC).
- [ ] TKA SD/SMA: saat ini menampilkan "segera hadir" (sesuai scope Production V1) — diputuskan ditunda.
- [ ] `components/dashboard/MobileProfileDropdown.tsx` masih berlabel "Riwayat" (label desktop sudah "Hasil") — inkonsistensi copy kecil.
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

1. Verifikasi flow **TKA SMP** end-to-end di browser: user uji dengan track TKA SMP aktif + entitlement
   Tempur Pass (monetisasi ON), jalankan diagnostic/mini/full → submit → hasil, lalu hapus kembali.
2. Audit jalur **tulis admin** (buat/edit exam & soal) memakai user admin disposabel: verifikasi bahwa
   aksi benar-benar tersimpan dan bisa dibersihkan — selama ini baru diverifikasi render (baca).
3. Audit **loading state** (`loading.tsx`) pada route ber-auth dan halaman publik.
4. Perbaiki temuan, jalankan lint/typecheck/unit/build/E2E, commit atomic, update dokumen ini.
