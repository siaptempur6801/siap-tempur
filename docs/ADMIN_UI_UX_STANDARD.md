# Siap Tempur — Admin UI/UX Standard

> Berlaku untuk seluruh fitur baru dan perubahan admin setelah Milestone 1.5.
> Canonical namespace: `/admin`.
> Prinsip utama: fitur admin belum COMPLETE hanya karena backend, security, dan E2E sudah bekerja; operasional harian juga harus mudah dipahami dan efisien.

## 1. North Star

Admin harus dapat mengetahui **sedang bekerja di program/track apa**, **apa yang membutuhkan tindakan**, dan **tindakan utama berikutnya** tanpa memahami schema database atau istilah developer.

Target alur umum:

```text
Masuk Admin
  → lihat Program / Track aktif
  → pilih area kerja
  → cari/filter data
  → lakukan tindakan utama
  → menerima feedback sukses/error yang jelas
  → kembali ke queue/list tanpa kehilangan konteks
```

## 2. Information Architecture

Satu admin shell digunakan untuk seluruh program:

```text
/admin
├── Overview
├── Content
│   ├── Question Bank
│   ├── Review Queue
│   └── Articles
├── Assessment
│   ├── Exams
│   └── Events
└── Commerce
    ├── Products
    └── Orders & Payments
```

CPNS dan TKA **bukan admin yang berbeda**. Program dan track adalah context operasional.

## 3. Program / Track Context

- Context selector harus persistent di header admin.
- Admin harus selalu dapat melihat Program dan Track aktif.
- Mengubah Program harus memilih Track valid untuk program tersebut.
- Context switch harus menghapus filter/entity selection yang tidak valid pada context baru.
- Link antar-modul harus mempertahankan `program` dan `track` bila modul bersifat contextual.
- Global module boleh tidak terikat context bila memang datanya lintas program.

## 4. Navigation

- Navigation berbasis pekerjaan, bukan nama tabel database.
- Menu harus permission-aware; jangan tampilkan aksi/menu yang user tidak dapat gunakan.
- Desktop memakai sidebar yang dapat diciutkan.
- Mobile memakai drawer + akses cepat yang tidak menutupi pekerjaan utama.
- Route canonical harus berada di `/admin/*`; route legacy hanya compatibility layer.
- Tidak boleh ada dead-end navigation.

## 5. Page Hierarchy

Setiap halaman operasional idealnya memiliki urutan:

1. Page title + deskripsi singkat.
2. Primary action tunggal yang jelas.
3. Status/metric yang membantu mengambil keputusan bila relevan.
4. Search/filter toolbar.
5. Main work surface (table, queue, form, detail).
6. Secondary/history information di bawah atau dalam expandable area.

Jangan membuat audit/history menguasai primary workflow.

## 6. Tables & Queues

Untuk list operasional:

- search yang mudah ditemukan;
- filter yang konsisten;
- status badge human-readable;
- row dapat discan cepat;
- primary row action jelas;
- empty state menjelaskan kondisi;
- responsive strategy eksplisit (scroll container atau card layout), bukan overflow halaman;
- filter/context tidak hilang saat membuka detail lalu kembali.

Bulk action ditambahkan hanya bila aman secara permission/workflow dan memang mengurangi pekerjaan berulang.

## 7. Forms

- Jangan mengekspos format storage/internal sebagai primary input.
- Jangan meminta admin menulis UUID jika entity dapat dipilih berdasarkan nama/kode.
- Field teknis advanced harus dipisahkan dari input utama.
- Label menggunakan bahasa operasional manusia.
- Validation/error harus muncul dekat konteks masalah dan tetap divalidasi server-side.
- Form panjang dipecah secara logis: Content, Classification, Explanation, Publishing/Workflow.
- Primary save/submit action harus mudah ditemukan.

Contoh: opsi soal **tidak** boleh meminta admin menulis format `A|content|score|...`; gunakan editor opsi terstruktur.

## 8. Workflow & Status

Status database boleh tetap machine-readable, tetapi UI harus menampilkan label seperti:

- `editorial_review` → Editorial Review
- `academic_review` → Academic Review
- `technical_qa` → Technical QA
- `revision_required` → Perlu Revisi
- `published` → Published

Aksi harus mengikuti role dan state. Tombol yang tidak boleh digunakan tidak perlu ditampilkan sebagai CTA aktif.

Destructive action perlu confirmation yang proporsional; tindakan rutin tidak boleh dipenuhi dialog konfirmasi yang tidak perlu.

## 9. Feedback States

Setiap critical admin page wajib memiliki:

- loading state bila ada client transition/data fetch;
- empty state;
- success feedback;
- actionable error feedback;
- disabled/pending state untuk submit yang dapat berlangsung lama bila client action digunakan.

Admin tidak boleh harus menebak apakah halaman kosong karena tidak ada data atau karena error.

## 10. Responsive Standard

Primary target: desktop dan tablet, tetapi workflow penting tetap usable di mobile.

Minimum automated smoke widths:

- Mobile: `390×844`
- Tablet: `1024×768`
- Desktop: default Playwright Desktop Chrome

Critical pages tidak boleh menghasilkan document-level horizontal overflow pada ukuran tersebut. Komponen yang memang lebar harus memiliki local scroll container atau responsive layout sendiri.

## 11. Accessibility Baseline

- Controls memiliki accessible name/label.
- Form input terhubung ke label.
- Icon-only button memiliki `aria-label`.
- Keyboard focus tetap terlihat.
- Warna bukan satu-satunya pembeda status.
- Heading hierarchy masuk akal.
- Hidden/duplicate controls tidak boleh mengganggu pengalaman user atau automation accessibility tree secara material.

## 12. Performance & React/Next.js

- Server rendering tetap default untuk data-heavy admin views.
- Client component hanya untuk interaction yang membutuhkan state/browser APIs.
- Independent server fetches dijalankan paralel bila aman.
- Hindari waterfall dan serialisasi data besar ke client.
- Jangan menambah dependency UI berat jika komponen lokal sudah cukup.
- Preserve RBAC/server-action validation; UI permission bukan security boundary.

## 13. Reviewer Workspace Gold Standard

Reviewer Workspace menjadi reference implementation untuk modul admin berikutnya:

- persistent Program/Track context;
- operational metrics;
- search/filter toolbar;
- queue + selected detail;
- human-readable status;
- structured question option editor;
- role-aware actions;
- workflow feedback;
- review/version/audit history dipisahkan dari primary content surface;
- mobile/tablet responsive smoke.

Modul Product, Exam, Event, Commerce dan modul baru harus bergerak ke pola yang sama saat disentuh, tanpa melakukan rewrite besar yang tidak diperlukan.

## 14. Permanent Definition of Done — Admin Feature

Fitur admin baru atau perubahan besar **belum COMPLETE** sebelum semua gate relevan terpenuhi:

```text
FUNCTIONAL
+ SERVER-SIDE VALIDATION
+ SECURITY / RBAC
+ LINT / TYPECHECK / UNIT / BUILD
+ BROWSER E2E UNTUK CRITICAL FLOW
+ UI HIERARCHY
+ HUMAN-READABLE STATUS/LABEL
+ LOADING / EMPTY / ERROR / SUCCESS STATE
+ RESPONSIVE MOBILE / TABLET / DESKTOP
+ NO UNINTENTIONAL PAGE OVERFLOW
+ ROLE-AWARE ACTIONS
+ NO OBVIOUS DEAD-END
```

Untuk critical operational workflow, visual/browser smoke harus dilakukan sebelum milestone ditandai COMPLETE.

## 15. Review Checklist

Sebelum merge perubahan admin, reviewer harus dapat menjawab **ya** untuk pertanyaan berikut:

- Apakah admin tahu context Program/Track yang aktif?
- Apakah primary action jelas?
- Apakah user dapat menemukan data tanpa memahami database?
- Apakah status dan error mudah dipahami?
- Apakah permission tercermin dengan benar di UI sekaligus tetap diperiksa server-side?
- Apakah mobile/tablet tidak menghasilkan dead-end atau page overflow?
- Apakah workflow umum dapat diselesaikan tanpa developer, SQL, atau Supabase Dashboard?
- Apakah perubahan mempertahankan canonical `/admin` dan tidak merusak route/modul existing?

Jika salah satu jawaban untuk critical flow adalah tidak, fitur belum memenuhi Admin UI/UX Definition of Done.
