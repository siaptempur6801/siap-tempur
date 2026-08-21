# AGENTS.md — Siap Tempur

## Project Context

Siap Tempur adalah platform tryout CPNS/SKD/SKB berbasis web. Fokus utama project:
- sistem ujian/tryout
- token ujian
- ranking/leaderboard
- manajemen soal
- hasil ujian
- admin panel
- keamanan data peserta
- kestabilan saat banyak user mengerjakan tryout

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
