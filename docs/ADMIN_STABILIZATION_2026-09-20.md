# Stabilisasi Admin — Fase 1

Tanggal: 2026-09-20
Status: **S1–S8 selesai & terverifikasi lokal. Belum di-commit, belum menyentuh produksi.**
Lanjutan backlog: Fase 1 butir S9–S12 (belum dikerjakan).

| Butir | Isi | Status |
|---|---|---|
| S1–S4 | Bug sesi event, kode mati, editor opsi, urutan cek izin | ✅ selesai |
| S5–S8 | Cap diam-diam, paginasi, pencarian, error boundary | ✅ selesai |

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
| S9 | Audit trail menyeluruh (kini hanya artikel & alur review yang tercatat) |
| S10 | Konfirmasi proporsional untuk aksi destruktif |
| S11 | Articles keluar dari stack V1 (`getCurrentUserRole` + client lama) |
| S12 | Responsive smoke 2 → 16 route |

---

# S5–S8 — Cap diam-diam, paginasi, pencarian, error boundary

## Masalah yang diselesaikan

Sebelum S5–S8, setiap daftar admin memuat satu jendela tetap dan **diam tentang
sisanya**: soal 80 baris terbaru, exam 80, event/product 50, artikel tanpa batas
sama sekali. `/admin/users` bahkan mencetak "100 dari N" tanpa satu pun cara
menuju sisanya — admin melihat 428 pengguna dan tidak bisa menemukan 328 di
antaranya.

Yang lebih berbahaya: **pencarian disaring di klien atas baris yang sudah
terpotong**. Degree produksi punya 573 soal CPNS/SKD; mencari soal ke-500 selalu
dijawab "tidak ada" — jawaban yang salah, bukan sekadar kosong.

### S5 — cap tidak lagi diam-diam

`lib/admin-pagination.ts` menyatukan kalimat status daftar:
"Menampilkan 1–25 dari 573 soal. Halaman 1 dari 23." — dengan bentuk tunggal/jamak
yang benar ("1 product", "7 produk").

Untuk **events**, yang masih memakai jendela 50 baris, cap-nya dinyatakan
terang-terangan lewat banner saat jendela itu penuh, sehingga admin tidak
menyimpulkan "tidak ada" dari jawaban yang sebenarnya "tidak ada di 50 terbaru".

### S6 — paginasi di sisi database

`adminV2Service.listDomainPage(domain, …)` menggantikan pemuatan seluruh daftar
untuk domain `products` dan `questions`: `count: 'exact'` + `.range()` per
halaman (25 baris). Detail yang hanya dibutuhkan baris yang tampil — harga
product, grant token, dan opsi soal — kini diambil lewat
`listProductPrices`/`listProductWalletGrants`/`listQuestionOptions`, yang
di-batch memakai `chunkValues()` supaya tidak mengulang insiden
`UND_ERR_HEADERS_OVERFLOW`.

Halaman-halaman yang sudah memakai jalur workspace tidak lagi menarik domain yang
tidak dirender (`ADMIN_OPERATIONS_PAGE_SECTIONS`).

### S7 — pencarian & filter lewat query database

Toolbar pencarian + filter status di Products, Question Bank, dan Events. Filter
hidup di URL (bisa di-bookmark & dibagikan), dan setiap perubahan filter kembali
ke halaman 1. Nilai pencarian dibersihkan sebelum masuk ekspresi `or` PostgREST
(koma/tanda kurung/wildcard dibuang) supaya tidak bisa mengubah bentuk filter.

Tautan "Edit" mempertahankan halaman dan filter, sehingga menyimpan perubahan
tidak melempar admin kembali ke halaman 1.

### S8 — error boundary khusus admin

`app/admin/error.tsx`. Sebelumnya kegagalan di halaman admin jatuh ke
`app/error.tsx` — boundary produk yang menawarkan "Dashboard CPNS" dan bermaskot,
tujuan pemulihan yang salah untuk admin. Boundary baru menyatakan dua hal yang
paling pertama ditanyakan admin: **tidak ada data yang berubah**, dan `digest`
apa yang harus dilaporkan.

## Tiga bug yang ditemukan saat verifikasi (bukan saat menulis)

Ketiganya lolos `tsc` dan lolos unit test; hanya ketahuan karena halamannya
benar-benar dibuka sebagai admin di server nyata.

1. **`column product_wallet_grants.id does not exist` (42703).**
   Tabel itu tidak punya kolom `id` — primary key-nya `(product_id, wallet_type)`.
   Memilih `id` membuat PostgREST menolak dan **seluruh** `/admin/commerce/products`
   jatuh ke error boundary. Inilah yang pertama ditangkap gate.
2. **`uuid = ''` (400) dari `?edit=` kosong.** `params.edit || ''` dikirim apa
   adanya ke `.eq('id', …)`. Kini hanya id berbentuk UUID yang boleh menyentuh
   query (diverifikasi: `?edit=bukan-uuid` dan `?edit=<uuid tidak ada>` keduanya
   merender daftar normal).
3. **`PGRST103 Requested range not satisfiable`.** PostgREST **menolak** offset di
   luar jumlah baris — bukan mengembalikan array kosong. `?page=2` pada context
   yang hanya punya 7 product karena itu menjatuhkan halaman ke error boundary,
   dan `redirect()` yang dimaksudkan merapikannya tidak pernah tercapai.
   Perbaikannya dua lapis: `listDomainPage` menghitung total lebih dulu dan
   **tidak menjalankan query baris** bila nomor halaman di luar jangkauan, lalu UI
   merender empty state yang menyebut halaman terakhir beserta tautan ke sana.

   Catatan penting untuk perubahan berikutnya: **`redirect()` di dalam server
   component yang di-stream menghasilkan shell kosong tanpa heading** — bukan
   redirect yang terlihat pengguna. Karena itu keadaan "di luar jangkauan"
   diselesaikan dengan empty state di halaman, bukan redirect.

## Berkas yang berubah pada S5–S8

| Berkas | Perubahan |
|---|---|
| `lib/admin-pagination.ts` | **baru** — konstanta, parsing halaman, offset, ringkasan, pembangun tautan |
| `components/admin/AdminPagination.tsx` | **baru** — pager (tidak dirender bila hanya satu halaman) |
| `app/admin/error.tsx` | **baru** — error boundary admin |
| `app/admin/AdminOperationsWorkspace.tsx` | toolbar pencarian/filter, paginasi, empty state jujur, detail berlingkup-id |
| `lib/admin-operations.ts` | `ADMIN_OPERATIONS_PAGE_SECTIONS` — domain yang benar-benar di-query |
| `src/services/admin-v2.service.ts` | `listDomainPage`, `countDomainRows`, tiga metode detail berlingkup-id |
| `tests/unit/admin-pagination.test.ts` | **baru** — 19 test |
| `tests/unit/admin-operations.test.ts` | +3 test (domain per halaman) |
| `tests/e2e/specs/10-admin-workspace-authenticated.spec.ts` | +1 test browser: posisi daftar, filter di URL, paginasi membawa filter |

## Verifikasi S5–S8

| Pemeriksaan | Hasil |
|---|---|
| `npx tsc --noEmit` | lolos |
| `npm run lint` | lolos |
| `npm run test:unit` | **556 / 556** (75 berkas) |
| `npm run build` | lolos |
| Probe manual terhadap server produksi lokal (admin sungguhan di staging) | 573 soal CPNS/SKD → "Menampilkan 1–25 dari 573 soal. Halaman 1 dari 23."; `?page=3` → 51–75; `?q=TWK` → 237 hasil, halaman 10; `?edit=bukan-uuid` → daftar normal; `?page=99` → empty state "Tidak ada soal pada halaman 23"; log server bersih |
| Gate admin lokal (`node scripts/local-gates/run-gate.mjs admin`) | **30 passed, exit 0** (3,9 menit) — dari 29; staging bersih di akhir run (8 user `ci-*` dihapus) |

## Risiko yang masih terbuka

- **S1 punya batas 80 exam** seperti dijelaskan di atas; belum ditutup.
- **Timer ujian, RLS, dan isolasi data tidak disentuh** fase ini — tidak ada
  perubahan pada jalur peserta.
- Migration admin terbaru (Users/Reports/Audit, Entitlements/Settings, seluruh
  Instansi) **masih belum di-apply ke produksi**; fase ini tidak menambah
  migration baru, tetapi drift lama itu belum tertutup.
