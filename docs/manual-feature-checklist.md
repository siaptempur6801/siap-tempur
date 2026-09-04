# Manual Feature Checklist

Checklist manual untuk smoke test fitur SiapTempur sebelum release atau setelah perubahan besar.

## Akses Dasar

- [x] Buka `/`
- [ ] Landing page tampil styled, bukan HTML polos
- [ ] Navigasi header jalan: Program, Kenapa berbeda, Cara kerja, Fitur, Artikel
- [ ] Tombol `Masuk` menuju `/login`
- [ ] Tombol `Mulai belajar gratis` menuju `/register`
- [ ] Buka lewat `http://localhost:3000`
- [ ] Buka lewat IP LAN, misalnya `http://192.168.1.6:3000`, CSS tetap tampil normal

## Auth

- [ ] Register user baru di `/register`
- [ ] Login user di `/login`
- [ ] Logout dari dashboard
- [ ] Akses `/cpns/dashboard` tanpa login diarahkan ke `/login`
- [ ] Setelah login, user diarahkan balik ke halaman tujuan
- [ ] Forgot password `/forgot-password` tampil
- [ ] Reset password `/auth/reset-password` tampil

## Dashboard CPNS

- [ ] Buka `/cpns/dashboard`
- [ ] Nama/profile user tampil
- [ ] Ringkasan skor/progres tampil tanpa runtime error
- [ ] Token/kuota tampil
- [ ] Streak/ranking tampil atau fallback aman
- [ ] Riwayat terakhir tampil atau empty state rapi
- [ ] Sidebar/menu dashboard bisa dibuka di mobile
- [ ] Tidak ada error Supabase di terminal

## Drilling Materi

- [ ] Buka `/cpns/dashboard/drilling-materi`
- [ ] Daftar materi TWK/TIU/TKP tampil
- [ ] Jumlah soal per materi tampil
- [ ] Klik mulai drilling
- [ ] Jika token tidak cukup, tampil pesan jelas
- [ ] Jika sesi aktif ada, tombol lanjutkan tampil
- [ ] Tidak muncul error `HeadersOverflowError`

## Mini Tryout

- [ ] Buka `/cpns/dashboard/mini-tryout`
- [ ] Pilihan TWK/TIU/TKP tampil
- [ ] Mulai mini tryout
- [ ] Soal tampil berurutan
- [ ] Jawaban bisa dipilih
- [ ] Navigasi nomor soal jalan
- [ ] Submit selesai
- [ ] Hasil mini tryout tampil

## Full Tryout

- [ ] Buka `/cpns/dashboard/tryout`
- [ ] Mulai full tryout
- [ ] Timer tampil dan berjalan
- [ ] Jawaban tersimpan saat pindah soal
- [ ] Refresh halaman lalu sesi bisa dilanjutkan
- [ ] Submit tryout
- [ ] Hasil total TWK/TIU/TKP tampil
- [ ] Status lulus/tidak lulus sesuai passing grade

## Result Dan Riwayat

- [ ] Buka `/cpns/dashboard/riwayat`
- [ ] Riwayat attempt tampil
- [ ] Klik detail hasil
- [ ] Pembahasan tampil
- [ ] Jawaban benar/salah jelas
- [ ] Skor per kategori konsisten
- [ ] User tidak bisa membuka result milik user lain

## Ranking

- [ ] Buka `/cpns/dashboard/ranking`
- [ ] Leaderboard tampil
- [ ] Rank user tampil bila ada data
- [ ] Empty state aman bila belum ada ranking
- [ ] Ranking tidak berubah karena refresh biasa
- [ ] Skor ranking sesuai hasil valid

## Event / Tryout Akbar

- [ ] Buka `/cpns/dashboard/event`
- [ ] Event aktif/scheduled tampil
- [ ] Detail event bisa dibuka
- [ ] Register/join event berjalan
- [ ] Event live hanya bisa diakses sesuai waktu
- [ ] Submit event menghasilkan skor
- [ ] Ranking event tampil
- [ ] User tidak bisa ikut event tanpa entitlement/token jika aturan mewajibkan

## Beli Paket / Payment

- [ ] Buka `/cpns/dashboard/beli-paket`
- [ ] Paket produk tampil
- [ ] Klik beli paket
- [ ] Midtrans script loaded tanpa console error
- [ ] Sandbox payment bisa dibuat
- [ ] QRIS/Snap token muncul
- [ ] Setelah pembayaran sukses, token/entitlement bertambah
- [ ] Jika Midtrans env dummy, error tampil jelas dan tidak crash

## Profile

- [ ] Buka `/cpns/dashboard/profile`
- [ ] Data user tampil
- [ ] Edit nama/profile jika tersedia
- [ ] Upload avatar jika tersedia
- [ ] History aktivitas tampil
- [ ] Data user lain tidak bisa diakses

## Admin

- [ ] Login sebagai admin
- [ ] Buka `/admin`
- [ ] User non-admin tidak bisa masuk admin
- [ ] Buka `/admin/content/questions`
- [ ] Buat soal baru
- [ ] Edit soal
- [ ] Hapus/arsip soal sesuai fitur
- [ ] Opsi jawaban tersimpan benar
- [ ] Pembahasan tersimpan
- [ ] Validasi form admin jalan

## Admin Artikel

- [ ] Buka `/admin/content/articles`
- [ ] Buat artikel
- [ ] Edit artikel
- [ ] Publish/unpublish artikel
- [ ] Buka `/blog`
- [ ] Artikel publish tampil
- [ ] Artikel draft tidak tampil untuk publik

## Admin Exam / Event / Commerce

- [ ] Buka `/admin/assessment/exams`
- [ ] Exam config tampil
- [ ] Buka `/admin/assessment/events`
- [ ] Event config tampil
- [ ] Buka `/admin/commerce/products`
- [ ] Produk/paket tampil
- [ ] Harga dan grant wallet sesuai konfigurasi
- [ ] User biasa tidak bisa akses server action admin

## TKA

- [ ] Buka `/tka`
- [ ] Buka level TKA yang tersedia, misalnya `/tka/smp`
- [ ] Diagnostic bisa dimulai
- [ ] Soal diagnostic tampil
- [ ] Submit diagnostic
- [ ] Result diagnostic tampil
- [ ] Progress page tampil
- [ ] Wrong questions tampil
- [ ] Remedial session bisa dibuka

## Security Manual

- [ ] Coba akses dashboard tanpa login
- [ ] Coba akses admin sebagai user biasa
- [ ] Coba buka result/session ID milik user lain
- [ ] Coba manipulasi token/score dari browser devtools
- [ ] Coba submit attempt dua kali
- [ ] Coba refresh saat ujian berjalan
- [ ] Coba buka route API/server action langsung
- [ ] Pastikan tidak ada secret tampil di browser bundle
- [ ] Pastikan `.env.local` tidak ter-commit

## Command Akhir

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run build`

## Catatan QA

Tanggal:

Tester:

Environment:

Catatan:

