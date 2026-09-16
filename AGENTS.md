# AGENTS.md — Siap Tempur

## Project Context

Siap Tempur adalah platform tryout/latihan ujian berbasis web: **CPNS/SKD/SKB** dan **TKA** (jenjang SD/SMP/SMA). Fokus utama project:
- sistem ujian/tryout
- token ujian
- ranking/leaderboard
- manajemen soal
- hasil ujian
- admin panel
- keamanan data peserta
- kestabilan saat banyak user mengerjakan tryout

## Status Terkini — WAJIB dibaca lebih dulu

**Sumber kebenaran status: [`docs/STATUS.md`](docs/STATUS.md).** Dokumen roadmap/checklist lain bersifat historis dan tidak boleh dijadikan acuan status.

Ringkas per 2026-09-16:
- Production V1 / Schema V2 sudah live di database (cutover 2026-09-01), tetapi **domain publik sengaja tidak diaktifkan** (dark launch).
- **Blocker P0 terbuka:** kebocoran kunci jawaban lewat RPC `get_content_question_detail` dan tabel `question_versions`. Migration perbaikan sudah ada, **belum di-apply ke DB**.
- **Riwayat migrasi remote tidak sinkron** → `supabase db push` tidak bisa dipakai sebelum baseline/repair.
- CI `main` sempat merah karena locator E2E basi; perbaikannya sudah ada dan terverifikasi lokal.

## Peta Dokumentasi

| Kebutuhan | Baca |
|---|---|
| Status & blocker terkini | `docs/STATUS.md` |
| Gate deploy | `docs/production-readiness.md` |
| Runbook cutover DB | `docs/schema-v2-cutover-runbook.md` |
| Standar UI admin | `docs/ADMIN_UI_UX_STANDARD.md` |
| Backlog goal aktif | `docs/PRODUCT_EXPERIENCE_V1_1_IMPLEMENTATION_BACKLOG.md` |
| Catatan migrasi | `supabase/migrations/README.md` |
| Riwayat cutover & monetisasi | `docs/PRODUCTION_CUTOVER_COMPLETION.md`, `docs/TKA_SMP_MONETIZATION_AUDIT.md` |

## Working Rules for Codex

Sebelum mengubah kode:
1. Baca struktur project terlebih dahulu.
2. Jelaskan file yang akan disentuh.
3. Buat rencana singkat.
4. Jangan langsung refactor besar.
5. Jangan menghapus fitur tanpa izin.
6. Migration database boleh langsung dijalankan hanya ke project staging yang project ref-nya sudah diverifikasi. Migration ke production tetap wajib konfirmasi eksplisit.
7. Jangan deploy tanpa konfirmasi.
8. Jangan mengubah env production.
9. Jangan commit otomatis tanpa diminta.

## Tech Assumption

Jika project memakai Next.js, TypeScript, Supabase, Prisma, atau PostgreSQL:
- validasi harus dilakukan di server-side
- jangan percaya data dari client
- role/permission harus dicek di API/server action
- token ujian tidak boleh bisa dimanipulasi dari client
- ranking harus dihitung dari data valid
- hasil ujian harus konsisten dan tidak bisa diedit user biasa

## Security Rules

Periksa hal berikut saat audit:
- auth
- role admin/user
- akses database
- server action/API route
- validasi input
- env variable
- secret leak
- SQL injection / unsafe query
- token ujian
- manipulasi skor
- manipulasi leaderboard
- race condition saat submit ujian

## Quality Rules

Sebelum menyatakan selesai:
- jalankan lint jika tersedia
- jalankan typecheck jika tersedia
- jalankan build jika tersedia
- jelaskan error jika command gagal
- tampilkan daftar file yang diubah
- tampilkan risiko yang tersisa

## Preferred Output

Saat audit, gunakan format:
A. Ringkasan kondisi project
B. Skor kesiapan 0-100
C. Layak production: YA/BELUM
D. Blocker P0
E. Risiko security
F. Bug potensial
G. Masalah role/permission
H. Masalah database/transaksi
I. File yang perlu diperbaiki
J. Prioritas fix P0/P1/P2
K. Rencana perbaikan bertahap
