# Admin Performance Optimization — 8 Oktober 2026

Status: refactor dan validasi lokal/staging. **Aplikasi belum dideploy.** Migrasi read model hanya diterapkan pada Supabase staging `lpgrivowdcepcxradavu`; production belum disentuh.

## Metode pengukuran

Baseline dibekukan sebelum optimasi; kedua aplikasi memakai `next build` / `next start` dengan Turbopack, database staging yang sama, Chromium 1440 × 1000, akun admin fixture yang sama, tiga browser context baru per halaman. Pengukuran akhir dilakukan setelah seluruh E2E berhenti. Tabel memakai median tiga pengukuran.

Request dihitung di server melalui instrumentasi `fetch` ke Supabase, termasuk auth dan prefetch yang terjadi sampai halaman interaktif + 350 ms idle. Ini jumlah HTTP request, bukan jumlah statement SQL. Payload adalah byte respons Supabase tanpa kompresi. JS adalah `encodedBodySize` chunk JavaScript yang benar-benar dimuat browser, bukan seluruh folder build. Waktu siap mengukur judul halaman + hydration guard; antrean review dashboard memiliki loading terpisah dan diperiksa selesai juga.

Data staging relatif kecil: 42 assessment, 1.086 soal, tiga konteks program/track, empat scope monitoring pada parity check. Angka lokal ini tidak membuktikan p95 atau throughput production. Snapshot baseline dan hasil akhir: [before.json](/Users/dirga/Projects/siap-tempur-admin-performance-qa-2026-10-08/before.json), [after.json](/Users/dirga/Projects/siap-tempur-admin-performance-qa-2026-10-08/after.json). Screenshot, EXPLAIN dan log validasi tersimpan di folder QA yang sama. Contoh: [Dashboard](/Users/dirga/Projects/siap-tempur-admin-performance-qa-2026-10-08/after-dashboard.png), [Question Bank](/Users/dirga/Projects/siap-tempur-admin-performance-qa-2026-10-08/after-questions.png), [Assessment mobile](/Users/dirga/Projects/siap-tempur-admin-performance-qa-2026-10-08/responsive-assessment-390.png).

## 1. Bottleneck yang ditemukan

- Link sidebar dan setiap aksi baris melakukan prefetch otomatis ke workspace dinamis. Prefetch ikut menjalankan autentikasi dan query halaman yang belum dibuka.
- Assessment mengulang pembacaan binding/review/supply per assessment, dengan proyeksi drill yang sebelumnya mengirim seluruh mapping/versi soal untuk dihitung di aplikasi.
- Loader katalog memuat data workspace/context yang tidak dipakai list, termasuk lookup dan dataset pendukung dari modul lain.
- Question Bank dengan filter review/taksonomi membaca himpunan mapping/ID/history secara luas sebelum pagination; monitoring membawa roster, attempt/metadata dan jawaban untuk dihitung di Node.
- Event menghitung peserta dengan request per baris; hitungan entitlement Users mengambil baris grant, padahal UI hanya membutuhkan angka.
- Shell membaca feature pass lalu entitlement secara berurutan. Konteks katalog juga mengikuti program → track dan diulang dalam satu render.
- Editor TipTap dan dependensi upload/Supabase ikut dimuat saat membuka list Question Bank/Products.
- Tabel presentasi diberi `use client`. Pada navigasi Assessment → Dashboard dan Orders → detail, browser memblokir chunk tabel di bawah CSP nonce + `strict-dynamic`; skeleton bertahan walau query selesai. Ini masalah pemuatan modul, bukan alasan menaikkan timeout.

## 2. Perubahan yang dilakukan

- `AdminLink` memakai `prefetch=false` secara default; opt-in tetap tersedia.
- Konteks katalog memakai join track/program, fetch exam types paralel, lalu subject yang bergantung pada track. `React.cache` dengan key primitive hanya menduplikasi dalam satu render/request; tidak menyimpan akses antar pengguna.
- Enam RPC read-only menggantikan fetch luas/count per baris dengan proyeksi aggregate dan page server.
- Assessment memakai satu supply map untuk readiness UI dan eligibility distribusi; katalog eligibility dibatasi pada ID yang sedang dibutuhkan.
- Instansi hanya memuat peserta ketika tab Participants dibuka, assignment/selector ketika tab Assignments dibuka, dan summary di Overview. Detail tidak membaca ulang list seluruh instansi.
- Dashboard memulai query KPI dan antrean review secara paralel, memakai satu aggregate status review, dan `Suspense` khusus antrean review enam baris. Unit test mengunci bahwa queue lambat/gagal tidak memblokir KPI dan actor tanpa izin konten tidak membacanya.
- Pembacaan pass menjadi satu join feature/entitlement dengan klien authenticated, owner filter, tanggal, status dan kuota yang sama.
- Editor dimuat dinamis; upload SDK baru dimuat saat pengguna memilih berkas. Nilai form tersembunyi tetap dimiliki parent agar submit sebelum editor selesai tidak menghapus konten.
- Tabel menjadi Server Component. CSP, nonce, permission, answer-key gate dan freshness monitoring tetap dipertahankan. Tombol admin desktop dibuat ringkas, target mobile tetap 36 px.

## 3. Request dan data sebelum → sesudah

| Halaman | Request Supabase | Payload server (KiB) | JS awal (KiB) |
|---|---:|---:|---:|
| Dashboard | 65 → 15 | 47.1 → 7.2 | 217.9 → 217.2 |
| Assessment | 74 → 14 | 262.5 → 25.5 | 223.1 → 222.7 |
| Question Bank | 59 → 12 | 85.9 → 42.7 | 537.3 → 231.7 |
| Event | 32 → 10 | 26.8 → 4.7 | 224.3 → 223.9 |
| Instansi | 45 → 7 | 39.0 → 6.9 | 227.0 → 226.7 |
| Monitoring (Event) | 35 → 8 | 40.8 → 4.6 | 224.3 → 223.9 |
| Products | 51 → 14 | 129.9 → 40.8 | 537.3 → 231.7 |
| Orders | 47 → 10 | 54.5 → 14.8 | 218.6 → 218.1 |
| Users | 33 → 8 | 33.5 → 6.1 | 220.0 → 219.5 |

Pengurangan request bukan hasil menonaktifkan auth: pemeriksaan autentikasi/permission tetap berjalan untuk navigasi yang benar-benar dibuka. Tidak ada cache persistent untuk attempts, results, monitoring atau hak akses.

## 4. Query yang dioptimalkan

Migrasi: `supabase/migrations/20261008044154_admin_read_models.sql`.

| RPC/proyeksi | Fungsi |
|---|---|
| `admin_assessment_supply` | Count binding/current version, review tiga tahap, supply section untuk ID assessment yang diminta. |
| `admin_drill_supply` | Count distinct soal approved/published dengan mapping primary, closure taxonomy dan frozen current version. |
| `admin_resource_counts` | Aggregate peserta event, assignment instansi, entitlement aktif untuk ID yang ditampilkan; kind memakai allowlist. |
| `admin_question_status_counts` | Satu aggregate status dengan RLS authenticated yang sama; tidak mengambil semua baris soal. |
| `admin_question_page` | Filter search/status/taxonomy/latest review di database, count dan page 25, hanya field list tanpa options/key/history. |
| `admin_monitoring_page` | Scope Event atau Instansi/Batch/Assignment, latest attempt per peserta, aggregate summary/report, progres hanya page 25; metadata attempt tidak dikirim. |
| Pass feature join | Dua request bergantung menjadi satu read authenticated, aturan usability tidak berubah. |

EXPLAIN ANALYZE staging: assessment supply sekitar **6,4 ms**, question page **21,0 ms**, monitoring page **14,0 ms** pada scope uji. Ini observasi satu eksekusi, bukan SLA. Query monitoring baru menghitung lebih banyak daripada query roster lama, jadi kedua EXPLAIN tersebut tidak diperlakukan sebagai perbandingan ekuivalen.

Tidak menambah index spekulatif. Existing index dan rencana query cukup untuk scope staging; volume besar tetap perlu pengukuran ulang. Semua RPC baru `SECURITY INVOKER`, search path eksplisit. Lima proyeksi sensitif hanya dapat dieksekusi service role setelah service memvalidasi permission/konteks; count review authenticated tetap mengikuti RLS. Anon ditolak.

## 5. Bundle berat yang dikurangi

TipTap/editor dan modul upload tidak lagi menjadi kebutuhan first-load list. Penurunan JS Question Bank dan Products tercatat pada tabel pengukuran; chunk editor masih tersedia saat editor benar-benar dibuka. Pola pemuatan mengikuti [Next.js lazy loading](https://nextjs.org/docs/app/guides/lazy-loading). Tidak menambah library UI, tidak memasukkan chart/PDF ke AdminShell, dan tidak mengklaim total seluruh aset editor dihapus.

Build produksi lolos. Ada warning lama pada `lib/event-certificate-pdf.ts`: pembacaan path font dinamis menyebabkan tracing seluruh project. Ini memengaruhi server artifact certificate dan dicatat sebagai debt tersendiri.

## 6. Client Component dan rendering

`components/ui/table.tsx` kehilangan batas `use client`; `AdminDataTable` dan rows tetap dirender server. Sembilan entry workspace utama memang sudah Server Components sebelum audit—tidak dihitung sebagai konversi baru. Komponen client yang tersisa memiliki fungsi interaktif: form, dialog, search, filter, drawer dan editor.

React production profiling dilakukan pada salinan build Webpack `--profile` agar duration tersedia. Empat karakter search menghasilkan tujuh commit dengan render sekitar 0,1–3,1 ms per commit dan satu navigasi debounce; tidak ditemukan render loop atau alasan memasang memo secara menyeluruh. Data ada di `react-profiler.json`. Profiling dipakai untuk inspeksi render, bukan perbandingan waktu Turbopack.

## 7. Dashboard sebelum → sesudah

KPI tidak lagi menunggu seluruh data review dihitung di aplikasi. Pengukuran intermediate memperlihatkan queue masih dimulai setelah KPI; setelah pekerjaan itu dimulai bersamaan, median first-load Dashboard turun dari 1.047 ms menjadi 796 ms pada pengukuran ulang. Antrean enam soal memiliki loading/error scoped sehingga panel tersebut tidak memblokir ringkasan operasional. Navigasi yang sebelumnya tertahan akibat chunk tabel kini selesai tanpa pelanggaran CSP.

Uji browser baseline: Assessment → Dashboard masih belum siap setelah 6 detik dan menghasilkan pelanggaran `script-src-elem` pada chunk tabel. Build akhir berhasil dalam 831 ms dengan nol pelanggaran CSP pada sampel yang sama; ini satu sampel diagnosis, bukan p95. Kebijakan nonce + `strict-dynamic` tetap mengikuti [panduan CSP Next.js](https://nextjs.org/docs/app/guides/content-security-policy).

| Halaman | Waktu siap sebelum (ms) | Sesudah (ms) |
|---|---:|---:|
| Dashboard | 846 | 796 |
| Assessment | 2337 | 606 |
| Question Bank | 801 | 581 |
| Event | 708 | 601 |
| Instansi | 758 | 591 |
| Monitoring (Event) | 744 | 574 |
| Products | 1026 | 875 |
| Orders | 636 | 632 |
| Users | 666 | 589 |

Tidak semua halaman menjadi lebih cepat pada setiap sampel. Latensi jaringan Supabase, hydration dan query/readiness yang memang wajib tetap memengaruhi hasil; manfaat request/payload/JS terukur lebih konsisten daripada satu angka latensi. Tidak ada timeout tes yang dinaikkan.

## 8. Tabel, filter dan pagination

- Question Bank: satu RPC berhalaman **25**, filter database dan total exact; review berdasarkan latest review pada current version.
- Monitoring: **25** peserta per halaman, scope wajib, filter database dan summary aggregate seluruh scope. Tidak memuat semua jawaban ke client/Node.
- Users: mempertahankan RPC pagination **25** dan permission server; entitlement summary menjadi aggregate untuk ID halaman tersebut.
- Orders: pagination **25** tetap server-side; item/profile/payment dibaca batch untuk order halaman itu saja.
- Audit Log: pagination **50** tetap server-side dengan actor/action/resource/date filters.
- Daftar yang memakai PostgREST tetap menggunakan range di database sesuai [Supabase range pagination](https://supabase.com/docs/reference/javascript/range).
- Search memakai debounce **350 ms**. E2E membuktikan empat ketikan menghasilkan satu navigasi RSC, pagination reset dan query state bertahan setelah reload.
- URL, parent context, filter dan browser Back dipertahankan. Out-of-range tidak dijadikan kegagalan PostgREST; monitoring clamp dan katalog menampilkan target halaman terakhir.

## 9. Regresi dan cleanup

| Gate | Hasil akhir |
|---|---|
| Admin E2E | **77 passed** |
| Public E2E | **42 passed, 2 skipped** |
| CPNS staging | **9 passed** |
| TKA SMP staging | **17 passed** |
| Content Review | **5 passed** |
| Unit | **789 passed / 105 files** |
| Lint | PASS |
| Typecheck | PASS |
| Build produksi Turbopack | PASS, warning tracing font certificate dijelaskan di atas |
| `git diff --check` | PASS |
| Database parity | **1.634 assertions**, assessment/question/review/readiness/monitoring/scoreband/progress/pass join dan anon denial; read-only. Nilai tepat ada di log. |

Dua skip Public adalah tes kredensial valid/logout placeholder yang sudah ada; alur login/logout authenticated dijalankan oleh setup dan role/staging suites, bukan skip baru.

Seluruh flow utama admin diuji: Assessment → Event/Instansi, Batch → Assignment, Event/Instansi → Monitoring → Result → Back, Question/Review, Product readiness/server gate, Orders/payment/User entitlements, Settings/Audit Log.

Kegagalan sementara tidak disembunyikan: navigasi CSP diperbaiki di source; ekspektasi label lama disesuaikan dengan accessible name aktual; assertion tinggi tombol dipenuhi lewat UI. Satu tes CPNS sebelumnya melakukan reload sebelum autosave selesai; kini tes terlebih dulu membuktikan jawaban tersimpan di database, lalu tetap menguji pilihan setelah reload. Assertion tidak dilemahkan dan engine tidak diubah untuk mengakomodasi tes. Pada satu run concurrent, editor artikel melewati assertion 5 detik: trace menunjukkan authorization request 3,5 detik + article read 1,4 detik. Lima navigasi terpisah sukses sekitar 1,1 detik tanpa error/CSP; suite admin kemudian diulang sendiri dengan timeout tetap. Ini dicatat sebagai lonjakan latensi staging, bukan ditutupi lewat retry otomatis atau timeout lebih besar.

Responsive: screenshot dan pemeriksaan overflow pada 1440, 1024, 390 px, desktop sidebar/mobile drawer dan tabel scroll tetap usable. E2E mencakup dialog/focus serta navigasi per role. Tidak melakukan sertifikasi audit aksesibilitas penuh baru.

Cleanup source: hapus loader katalog luas `AdminWorkspaceService.getWorkspaceData`, helper count/global-context yang hanya dipakai loader tersebut, `getReviewSummary` lama, helper progress JS monitoring dan import/type/ekspor yang mati. `ContentReviewService.getWorkspaceData` berbeda dan tetap dipakai oleh Review Workspace berhalaman. Tidak menyimpan dua loader paralel.

Akun/data fixture milik pengujian dibersihkan melalui helper staging; proses baseline/profiling/helper dihentikan setelah QA. File pengguna/password sementara dihapus. Perubahan UI/backend lain yang sudah ada sebelum audit tidak di-reset.

## 10. Remaining performance debt

- **P1:** tidak ada kegagalan gate yang tersisa pada cakupan ini.
- **P2:** ukur p95/p99 dan query plans pada volume production yang representatif; staging kecil belum membuktikan performa roster besar. Review count dan latest-attempt aggregate dapat membutuhkan tuning/index yang dibuktikan EXPLAIN pada volume tersebut. Lonjakan latensi staging pada run concurrent menunjukkan pengujian beban/pool database juga masih diperlukan.
- **P2:** lazy editor tetap berat ketika editor dibuka; certificate font tracing server artifact masih perlu perbaikan terpisah. Produk/readiness masih memiliki pembacaan katalog wajib sehingga pengurangan request tidak selalu menurunkan waktu first-load.
- **P3:** tambahkan budget request/JS/latensi pada CI dan observasi route transitions di deployment staging; verifikasi setiap Client Component baru di bawah CSP ketat. Seluruh pengukuran saat ini lokal → Supabase staging, belum uji Vercel production.
