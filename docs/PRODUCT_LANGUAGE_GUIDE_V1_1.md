# SiapTempur Product Language Guide V1.1

Status: **DRAFT — active for Product Experience V1.1**  
Parent: GitHub Issue #21  
Audit: GitHub Issue #22

## 1. Voice

SiapTempur speaks like a focused learning coach:

- encouraging, not noisy
- confident, not arrogant
- practical, not academic
- clear, not technical
- friendly, not childish
- concise, not robotic

## 2. Pronouns

Use **kamu** consistently in ordinary user-facing product copy.

Preferred:

- `Cek email kamu untuk verifikasi akun.`
- `Lanjutkan latihanmu.`
- `Bagian ini masih perlu kamu perkuat.`

Avoid mixing:

- `Anda`
- `akun ini`
- impersonal system language when a natural second-person sentence is clearer

Legal pages may use a more formal register where appropriate.

## 3. Capitalization

Use sentence case for normal UI text.

Preferred:

- `Daftar gratis`
- `Mulai tryout`
- `Kirim ulang email verifikasi`
- `Menunggu pembayaran`

Avoid unnecessary title case:

- `Daftar Gratis`
- `Kirim Ulang Email Verifikasi`
- `Pendaftaran Berhasil!`

Product names/acronyms remain capitalized:

- SiapTempur
- CPNS
- SKD
- TWK
- TIU
- TKP
- TKA

## 4. Indonesian-first terminology

| Internal / inconsistent | User-facing standard |
|---|---|
| Production V1 | remove from UI |
| production-ready | remove from UI |
| track | jalur belajar |
| catalog | pilihan / daftar (context dependent) |
| entitlement | akses |
| user_tracks | never show |
| attempt | percobaan / pengerjaan / riwayat pengerjaan |
| progress | perkembangan |
| progress dashboard | perkembangan belajar |
| mastery | penguasaan materi |
| readiness | kesiapan ujian |
| wrong questions | soal yang perlu diulang |
| drilling | latihan fokus / drill (only where brand/product naming requires) |
| start exam | mulai ujian |
| submit | kumpulkan jawaban |
| learning recommendation | rekomendasi belajar |
| activate pass | aktifkan akses |
| payment pending | menunggu pembayaran |
| payment expired | waktu pembayaran habis |
| payment failed | pembayaran belum berhasil |
| checkout | pembayaran / lanjut ke pembayaran (context dependent) |
| rank | peringkat |

## 5. CTA rules

CTA must describe the next user action, not a vague destination.

Preferred:

- `Mulai latihan`
- `Lanjutkan tryout`
- `Lihat pembahasan`
- `Perbaiki materi ini`
- `Coba mini tryout gratis`
- `Pilih paket`
- `Lanjut ke pembayaran`
- `Cek hasil belajarmu`

Avoid:

- `Lihat selengkapnya` when a specific action exists
- `Submit`
- `Proceed`
- `Open`
- `Activate`
- `Lihat CPNS` if the actual purpose is to start learning

## 6. Feedback messages

### Success

Structure:

**What happened** + optional **what to do next**.

Examples:

- `Berhasil masuk. Lanjutkan belajarmu.`
- `Akun berhasil dibuat. Cek email kamu untuk verifikasi.`
- `Jawaban berhasil dikumpulkan. Lihat hasil dan rekomendasi belajarmu.`
- `Pembayaran berhasil. Akses belajarmu sudah aktif.`

Avoid celebration for routine actions when it creates noise.

### Error

Explain:

1. what failed
2. what the user can do

Examples:

- `Email atau kata sandi belum cocok. Coba periksa lagi.`
- `Kami belum bisa memproses pembayaran ini. Coba lagi atau pilih metode pembayaran lain.`
- `Koneksi terputus. Jawaban yang sudah tersimpan tetap aman. Coba sambungkan kembali.`

Avoid:

- `Unknown`
- raw provider/database errors
- internal codes without a plain-language explanation

## 7. Empty states

An empty state must suggest a useful next action.

Bad:

> Belum ada data.

Better:

> Kamu belum punya riwayat tryout. Mulai tryout pertamamu untuk melihat perkembangan skor di sini.

CTA:

> `Mulai tryout`

## 8. Locked/access states

Do not talk about entitlement, access contracts, or implementation.

Preferred:

> Paket ini belum aktif di akunmu.
>
> Pilih akses belajar untuk membuka tryout dan fitur latihan lengkap.

CTA:

> `Lihat pilihan paket`

## 9. Coming-soon states

Preferred:

> **TKA SD**  
> Segera hadir.

Optional:

> Kami sedang menyiapkan latihan dan tryout untuk jenjang ini.

Avoid:

- roadmap
- release version
- production status
- development milestone

## 10. Exam language

Exam mode should be calm and unambiguous.

Preferred labels:

- `Soal 12 dari 30`
- `Tandai untuk ditinjau`
- `Soal sebelumnya`
- `Soal berikutnya`
- `Kumpulkan jawaban`
- `Sisa waktu`

Confirmation:

> Kamu yakin ingin mengumpulkan jawaban? Setelah dikumpulkan, jawaban tidak bisa diubah.

## 11. Result language

Results should lead to learning action.

Hierarchy:

1. result/score
2. interpretation
3. strong/weak area
4. recommended next action

Example:

> **Skor SKD kamu: 369**
>
> TIU menjadi bagian terlemah pada tryout ini. Mulai dari latihan Analogi dan Silogisme sebelum mencoba full tryout berikutnya.

CTA:

> `Latihan TIU sekarang`

Avoid treating score as the end of the journey.

## 12. CPNS messaging

### Promise

> Persiapan SKD yang tidak berhenti di skor.

### Explanation

> Latihan TWK, TIU, dan TKP, ukur kemampuanmu, lalu fokus memperbaiki bagian yang masih lemah.

### Learning loop

> Latihan → ukur → perbaiki → coba lagi.

## 13. TKA SMP messaging

### Promise

> Belajar dari setiap hasil, bukan sekadar menyelesaikan soal.

### Explanation

> Latihan dan tryout membantu kamu melihat bagian yang sudah kuat dan yang masih perlu diperbaiki sebelum ujian.

## 14. Main SiapTempur messaging

### Brand line

> Belajar lebih terarah. Hadapi ujian lebih siap.

### Differentiator

> Bukan cuma latihan soal. SiapTempur membantu kamu tahu apa yang harus dipelajari berikutnya.

## 15. Marketing claims

Every measurable or comparative claim must be verifiable.

Before publishing, verify claims such as:

- number of questions
- number of users
- national ranking coverage
- `CAT BKN asli`
- prediction/accuracy claims
- pass-rate claims
- `terlengkap`, `terbaik`, `nomor 1`

Prefer precise, supportable wording over aggressive unsupported claims.

## 16. First confirmed rewrite targets

### Login

Current issues:

- mixed `kamu` and `Anda`
- `streak` may not be meaningful for a new/returning user
- inconsistent capitalization
- generic error messages

Direction:

> **Selamat datang kembali**  
> Masuk untuk melanjutkan belajarmu.

### Register

Current issue:

- copy only mentions SKD even though one account now supports CPNS and TKA

Direction:

> **Buat akun SiapTempur**  
> Mulai belajar CPNS atau TKA dalam satu akun.

### CPNS dashboard

Current issue:

- primary CTA defaults to `Mulai Tryout`
- ranking is given major visual weight
- dashboard does not clearly recommend the best next learning action

Direction:

> **Lanjutkan dari bagian yang paling perlu kamu perbaiki.**

Primary CTA should eventually be data-driven.

### TKA SMP

Current issues:

- user sees technical terms (`track`, `catalog`, `progress`, `attempt`, `entitlement`, `user_tracks`)
- activation explains database implementation

Direction:

> **Aktifkan jalur belajar TKA SMP**  
> Simpan perkembangan latihan dan hasil tryout kamu dalam satu tempat.
