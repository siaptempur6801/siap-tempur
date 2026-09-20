# Stabilisasi Admin — Fase 1 (S1–S4)

Tanggal: 2026-09-20
Status: **S1–S4 selesai & terverifikasi lokal. Belum di-commit, belum menyentuh produksi.**
Lanjutan backlog: Fase 1 butir S5–S12 (belum dikerjakan).

## Kenapa fase ini ada

Diskusi 2026-09-20 memetakan seluruh permukaan admin (16 route) dan menemukan
tiga kelompok masalah: fitur yang backend-nya ada tetapi tidak tersambung ke UI,
fitur setengah jadi, dan perbaikan inti yang tidak butuh keputusan produk.
Keputusan pemilik produk: **stabilkan admin dulu**, Instansi menyusul, commerce
Fase 3, notifikasi dikerjakan dengan Resend setelahnya.

Fase 1 sengaja dipecah kecil (1–3 berkas per butir) dan S1–S4 dikerjakan lebih
dulu karena keempatnya bug nyata, bukan pekerjaan UX.

## Yang dikerjakan

### S1 — Sesi event tidak bisa dibuat dari UI

**Gejala:** modal "Tambah sesi" pada `/admin/assessment/events` selalu
menampilkan dropdown "Exam EVENT" yang kosong, sehingga sesi tidak bisa
ditambahkan sama sekali — tanpa pesan error.

**Sebab:** `SECTIONS_BY_MODE.events` bernilai `['events','products']`, sedangkan
modal itu membaca `data.exams`. Karena domain `exams` tidak pernah di-query,
`data.exams` selalu `[]`.

**Perbaikan:** mode `events` kini memuat `['events','products','exams']`.

**Batas yang diketahui:** daftar exam berasal dari `getWorkspaceData` yang
dibatasi 80 baris terbaru. Bila suatu context punya lebih dari 80 exam, exam
EVENT lama bisa tidak muncul. Perbaikan penuh menunggu pagination (S6).

### S2 — Kode mati: dua permukaan Exam

`AdminOperationsWorkspace` masih memiliki mode `exams` (±146 baris) yang **tidak
dirujuk route mana pun**; permukaan exam yang hidup adalah
`AdminExamsWorkspace.tsx`. Dua permukaan exam yang berbeda adalah sumber
kebingungan, jadi yang mati dibuang.

Sekaligus peta tab dipindahkan ke modul murni `lib/admin-operations.ts`
(mengikuti pola `lib/admin-nav.ts`) supaya dapat diuji tanpa React — inilah yang
membuat S1 bisa dikunci test.

### S3 — Question Bank memakai editor opsi terstruktur

Question Bank masih memakai textarea mentah berisi `A|Teks|1|true` — persis yang
dilarang `docs/ADMIN_UI_UX_STANDARD.md` §7 ("opsi soal **tidak** boleh meminta
admin menulis format `A|content|score|...`"). Editor terstruktur
(`QuestionOptionsEditor`) sudah tersedia dan dipakai Review Queue.

Kontrak serialisasi keduanya diverifikasi identik, jadi penggantian ini murni
pertukaran komponen — bukan perubahan format.

**Temuan tambahan saat verifikasi:** jalur Question Bank hanya membaca **enam**
field (`app/actions/admin-v2.ts`), sehingga field ketujuh — `imageUrl` — dibuang
tanpa pesan. Gambar opsi hilang saat disimpan dari Question Bank, meskipun jalur
Content Workspace (`app/actions/content-review.ts:53`) sudah lama menyimpannya.
Sekarang tujuh field dibaca, disimpan, dan dibandingkan (create, update, dan
deteksi perubahan) sehingga editor tidak lagi menampilkan kolom yang isinya
diam-diam hilang.

Serialisasi + parsing dipindahkan ke `lib/question-options.ts` sebagai satu
sumber kebenaran untuk kedua sisi, sehingga penulis dan pembaca tidak bisa
menyimpang lagi.

### S4 — Halaman Exams memuat data sebelum memeriksa izin

`AdminExamsWorkspace` menjalankan `getWorkspace()` dan `getCurrentAuthorization()`
serentak lewat `Promise.all`, lalu baru memeriksa permission. Akibatnya peran
tanpa `exam.manage` tetap menunggu seluruh query exam + section + pool soal
selesai hanya untuk disuguhi "Akses tidak tersedia" — dan waktu muat halaman
membocorkan seberapa berat data di baliknya.

Kini izin diperiksa lebih dulu; query hanya dijalankan bila izin ada. Pola ini
sama dengan `AdminOperationsWorkspace`.

## Berkas yang berubah

| Berkas | Perubahan |
|---|---|
| `lib/admin-operations.ts` | **baru** — peta tab: route, judul, domain data, permission |
| `lib/question-options.ts` | **baru** — serialisasi & parsing payload opsi (7 field) |
| `app/admin/AdminOperationsWorkspace.tsx` | mode `exams` dibuang; mode `events` memuat `exams`; textarea opsi → `QuestionOptionsEditor`; memakai peta dari `lib/` |
| `app/admin/assessment/exams/AdminExamsWorkspace.tsx` | otorisasi sebelum query; blok "Akses tidak tersedia" ganda dihapus |
| `app/actions/admin-v2.ts` | parser opsi memakai `lib/question-options.ts` (7 field) |
| `src/services/admin-v2.service.ts` | `imageUrl` pada tipe input, insert, update, select, dan perbandingan perubahan |
| `tests/unit/admin-operations.test.ts` | **baru** — 8 test penjaga peta tab |
| `tests/unit/admin-question-options.test.ts` | **baru** — 17 test kontrak payload opsi |

## Verifikasi

| Pemeriksaan | Hasil |
|---|---|
| `npx tsc --noEmit` | lolos |
| `npm run lint` | lolos (exit 0) |
| `npm run test:unit` | **534 / 534** (74 berkas) — sebelumnya 490 / 71 |
| `npm run build` | lolos |
| Gate admin lokal (`node scripts/local-gates/run-gate.mjs admin`) | **29 passed, exit 0** (3,3 menit) — sebelumnya 25; staging bersih di akhir run (7 user `ci-*` dihapus) |

Gate admin mencakup seluruh 16 route admin (termasuk `/admin/assessment/exams`
dan `/admin/assessment/events` yang disentuh S1–S4), alur peran, dan smoke
responsif 390px — jadi S2 dan S4 benar-benar terbukti di browser, bukan hanya
lolos typecheck.

Regression test yang mengunci insiden:

- `admin-operations.test.ts` — mode `events` **wajib** memuat domain `exams`
  (penyebab S1), tiap route wajib punya `page.tsx`, dan mode `exams` tidak boleh
  kembali sebagai tab komponen ini.
- `admin-question-options.test.ts` — round-trip editor ↔ server membuktikan
  tidak ada field yang hilang; parser menolak baris rusak; dan Question Bank
  dilarang kembali ke textarea `name="options"`.

## Sisa Fase 1

| # | Task |
|---|---|
| S5 | Header "menampilkan X dari N" di semua daftar (cap 50/80/100 tidak lagi diam-diam) |
| S6 | Pagination server-side untuk users, questions, products, events, exams, articles |
| S7 | Search + filter lewat query DB untuk 6 route yang belum punya |
| S8 | `app/admin/error.tsx` + feedback error actionable |
| S9 | Audit trail menyeluruh (kini hanya artikel & alur review yang tercatat) |
| S10 | Konfirmasi proporsional untuk aksi destruktif |
| S11 | Articles keluar dari stack V1 (`getCurrentUserRole` + client lama) |
| S12 | Responsive smoke 2 → 16 route |

## Risiko yang masih terbuka

- **S1 punya batas 80 exam** seperti dijelaskan di atas; belum ditutup.
- **Timer ujian, RLS, dan isolasi data tidak disentuh** fase ini — tidak ada
  perubahan pada jalur peserta.
- Migration admin terbaru (Users/Reports/Audit, Entitlements/Settings, seluruh
  Instansi) **masih belum di-apply ke produksi**; fase ini tidak menambah
  migration baru, tetapi drift lama itu belum tertutup.
