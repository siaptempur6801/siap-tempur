# Hasil Cek Production Readiness

A. **Skor Kesiapan: 82/100**

B. **Layak production: BELUM**

P0 utama sudah ditutup. Sisa pekerjaan terbesar adalah migration history remote yang belum rapi, CSP nonce penuh, duplicate admin route cleanup, dan regression test khusus untuk payment/scoring/RPC abuse.

## C. Blocker P0

- [x] Security-definer RPC bisa dipanggil dengan user/session arbitrary.
  - Ditutup lewat `supabase/migrations/20260529_harden_rpc_and_answer_visibility.sql`.
  - RPC sensitif sekarang punya ownership guard dan execute privilege dibatasi.
- [x] Kunci jawaban terbuka via RLS.
  - `options.is_correct`, `options.score_value`, dan `questions.explanation` tidak lagi selectable oleh `authenticated`.
  - Page server yang butuh answer key memakai service/admin client.
- [x] Jawaban bisa dipalsukan dengan `optionId` dari soal lain.
  - Scoring join sekarang cocokkan `option_id + question_id`.
  - `submitAnswer` validasi session owner, session aktif, answer row, dan option milik question.
- [x] Payment quota bisa double-credit untuk transisi `capture -> settlement`.
  - Ditutup lewat RPC atomic `process_paid_transaction`.
  - Webhook dan `syncPaymentStatus` memakai jalur idempotent yang sama.

## D. Risiko Security

- [x] `syncPaymentStatus(orderId)` belum memastikan `orderId` milik user login.
  - Sekarang query transaksi dibatasi `.eq('user_id', user.id)`.
- [~] CSP masih memakai `'unsafe-inline'` dan `'unsafe-eval'`.
  - Sudah ditambah `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, dan `frame-ancestors 'none'`.
  - Sisa: hapus `'unsafe-inline'/'unsafe-eval'` butuh nonce/penyesuaian script Midtrans dan style inline.
- [x] Image remote pattern terlalu luas `hostname: '**'`.
  - Sekarang dibatasi ke `*.supabase.co` dan `*.supabase.in`.
- [x] Supabase auth local config lemah untuk production.
  - `minimum_password_length`, `password_requirements`, email confirmation, secure password change, dan email frequency sudah diperketat di `supabase/config.toml`.
- [x] `.env.local` berisi secret.
  - `.gitignore` sudah mengabaikan `.env*`; value tidak dicatat di dokumen.

## E. Bug Potensial

- [x] Mock payment flow client memanggil webhook tanpa signature.
  - Mock webhook path di halaman beli paket sudah dihapus dari production path.
- [x] `start_tryout_session` tidak atomic terhadap quota.
  - Ditutup di migration hardening dengan `UPDATE ... WHERE tryout_quota > 0 RETURNING`.
- [x] `console.log` payment token/status di client production path.
  - Log token/status payment di `beli-paket` sudah dihapus.

## F. Masalah Role/Permission

- [x] Admin server actions memakai `isAdmin()` sebelum service role client.
- [x] Admin layout/API export memakai admin check server-side.
- [x] RPC DB sensitif sekarang punya ownership/service-role guard.
- [ ] Perlu regression test untuk membuktikan non-admin tidak bisa menjalankan action admin dari server action endpoint.

## G. Masalah Database/Transaksi

- [x] Fungsi quota/payment/session belum idempotent penuh.
  - Payment sudah idempotent via `process_paid_transaction`.
  - Session/scoring ownership sudah diperketat.
- [x] `increment_tryout_quota` tidak membatasi caller/nilai increment.
  - Sekarang service-role only dan increment harus positif.
- [x] `calculate_session_score` tidak memastikan session owner.
  - Sekarang cek `auth.uid()` atau `service_role`.
- [x] Start tryout tidak atomic terhadap quota.
- [x] Public read `options` membuka answer key.
- [ ] Remote migration history Supabase kosong/tidak sinkron.
  - Jangan jalankan `supabase db push` penuh sampai strategi baseline/repair ditentukan.
  - `supabase migration repair` tidak cukup karena migration lama memakai version/timestamp duplikat per hari. Perlu baseline/squash migration atau rename strategy yang sengaja direncanakan.

## H. File Yang Sudah Diperbaiki

- [x] `supabase/migrations/20260529_harden_rpc_and_answer_visibility.sql`
- [x] `supabase/migrations/20260529_payment_status_idempotency.sql`
- [x] `app/actions/practice.ts`
- [x] `app/actions/payment.ts`
- [x] `app/api/payments/webhook/route.ts`
- [x] `app/cpns/admin/page.tsx`
- [x] `app/cpns/admin/edit/[id]/page.tsx`
- [x] `app/cpns/dashboard/latihan/[sessionId]/result/page.tsx`
- [x] `app/cpns/dashboard/beli-paket/page.tsx`
- [x] `components/admin/ExcelImport.tsx`
- [x] `components/admin/ExcelImportDialog.tsx`
- [x] `components/admin/ExportDataClient.tsx`
- [x] `components/admin/TryoutAkbarClient.tsx`
- [x] `components/dashboard/MockSnapModal.tsx` dihapus karena mock webhook path tidak dipakai lagi.
- [x] `lib/csv.ts`
- [x] `public/template_soal_skd.csv`
- [x] `public/template_soal_skd.xlsx` dihapus setelah import pindah ke CSV.
- [x] `next.config.ts`
- [x] `package.json`
- [x] `package-lock.json`
- [x] `supabase/config.toml`

## I. Prioritas Fix

P0:
- [x] Revoke execute RPC sensitif dari `anon/authenticated`, buat guard `auth.uid()`.
- [x] Sembunyikan `is_correct`/`score_value` dari client.
- [x] Validasi `option_id` harus milik `question_id` saat submit dan scoring.
- [x] Buat payment webhook idempotent untuk `settlement/capture`.

P1:
- [x] Atomic quota decrement dengan `UPDATE ... WHERE tryout_quota > 0 RETURNING`.
- [x] Batasi `syncPaymentStatus` hanya untuk transaksi milik user.
- [x] Tambah `typecheck` dan `test` script standar.
- [~] Perketat CSP dan image remotePatterns.
- [x] Ganti `xlsx` atau ubah flow import/export ke CSV-only karena advisory high tanpa fix.
- [ ] Rapikan migration history remote Supabase.

P2:
- [x] Bersihkan console log production payment.
- [x] Rapikan duplicate route admin `/cpns/admin` dan `/cpns/dashboard/admin`.
- [x] Jalankan audit dependency/security terpisah.
- [ ] Tambah regression test untuk payment, scoring, RLS/RPC abuse.

## J. Rencana Perbaikan Bertahap

- [x] Database hardening: revoke execute, ownership checks, RLS/column grant untuk option tanpa answer key.
- [x] Perbaiki scoring dan submit answer agar option selalu cocok dengan question.
- [x] Perbaiki payment idempotency dan ownership check.
- [x] Tambah CI scripts: `typecheck`, `test`, `lint`, `build`.
- [x] Ganti/mitigasi permanen `xlsx`.
- [ ] Baseline/repair migration history remote Supabase.
- [ ] Tambah regression test: RPC abuse, scoring integrity, payment webhook replay.
- [ ] Staging verification end-to-end sebelum production.

## Verifikasi Command

- [x] `npm run lint`: pass.
- [x] `npm run typecheck`: pass.
- [x] `npm run build`: pass.
- [x] `npm test`: pass (`lint + typecheck`).
- [x] `npm audit --audit-level=high`: pass, high advisory `xlsx` hilang setelah flow import/export diubah ke CSV-only dan dependency `xlsx` dilepas.
- [~] `npm audit --audit-level=moderate`: masih gagal di advisory `next -> postcss`; `npm audit fix --force` menyarankan downgrade besar ke Next 9, jadi tidak dijalankan.
- [ ] `test:cpns-resume`: belum dijalankan karena script membuat user, menulis DB, membuat session, dan cleanup user.

## K. Hasil Audit Coding Standards (P0/P1/P2)

P1 (Refactor & Type Safety):
- [ ] Pecah komponen raksasa (God Object): `PracticeSessionClient.tsx` (>1100 baris) dan `ProfileClient.tsx` (>900 baris) agar mematuhi batas 800 baris.
- [ ] Ekstrak logika *timer*, *beacon sync*, dan *modal* dari `PracticeSessionClient.tsx` menjadi *Custom Hooks* (`useExamTimer`, dsb.) untuk menghindari duplikasi kode.
- [ ] Hapus penggunaan tipe data `any` di `lib/midtrans.ts` dan ganti dengan *interface* yang tepat untuk menjamin *type safety*.

P2 (Minor & Cleanup):
- [x] Rapikan struktur root folder (pindah `utils/` ke `lib/utils/`).
- [x] Hapus sisa `console.log` di jalur kritis seperti `app/api/payments/webhook/route.ts`.

