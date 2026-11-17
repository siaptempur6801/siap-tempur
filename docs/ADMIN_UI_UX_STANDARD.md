# Siap Tempur — Admin UI/UX Standard

> Current component and interaction contracts: [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) and [UI_INTERACTION_STANDARDS.md](UI_INTERACTION_STANDARDS.md). See their authority section for precedence; this document retains its domain and historical context.

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
Dashboard

LEARNING
├── Assessment
└── Content (collapsible)
    ├── Question Bank
    ├── Review
    └── Articles

OPERATIONS
├── Event
├── Instansi → Detail Instansi → Batch
└── Monitoring → Monitoring / Reports

BUSINESS
├── Commerce (collapsible)
│   ├── Products
│   └── Orders → Order Detail → Payment information
└── Users → Users / Roles & Permissions
    └── User Detail → Entitlements

SYSTEM
└── Settings → General / Audit Log
```

Global sidebar hanya berisi primary workspace. Batch, assignment, hasil, entitlement,
payment detail, event session, report, dan audit detail diakses dari konteks induknya.
Content dan Commerce tertutup secara default, lalu terbuka otomatis pada route anak.
Route internal lama tetap boleh digunakan tanpa menjadi entry navigasi global.

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
- Mobile memakai drawer dengan tombol menu di header; sidebar desktop tidak dirapatkan ke viewport mobile.
- Route canonical berada di `/admin/*`: resource/view berada di path; query hanya untuk filter, pagination, domain, preselection dan return context.
- List `/admin/assessments`, create `/admin/assessments/new`, detail `/admin/assessments/{id}`, tab `/admin/assessments/{id}/distribution`, edit `/admin/assessments/{id}/edit`.
- Event menggunakan `/admin/events`; bukan child Assessment. Orders berada di `/admin/commerce/orders`.
- Batch adalah child `/admin/organizations/{org}/batches/{batch}`; assignment monitoring berada di `/admin/organizations/{org}/batches/{batch}/assignments/{assignment}/monitoring`.
- Reports `/admin/monitoring/reports`, Audit Log `/admin/settings/audit`, Roles `/admin/users/roles`, user access `/admin/users/{id}/entitlements`.
- `lib/admin-routes.ts` adalah satu contract decode/normalisasi URL; `AdminLink` dan action return menggunakan contract yang sama. Path context mengalahkan query yang bertentangan.
- Bookmark legacy mendapatkan temporary 307 dengan cookie sesi, CSRF dan CSP tetap terbawa. POST/server action tidak dialihkan sebelum mutation.
- Tidak boleh ada dead-end navigation.

## 5. Page Hierarchy

Semua halaman operasional memakai urutan:

1. `AdminBreadcrumbs` menjaga parent/context.
2. `AdminPageHeader`: judul, deskripsi singkat, satu primary action.
3. Tabs atau summary yang relevan, tanpa menggantikan main work surface.
4. `AdminTableToolbar`: search, status, satu filter utama, More Filters.
5. `AdminDataTable`, workspace detail, atau form halaman.
6. Riwayat/audit dalam secondary section atau expandable detail.

Workspace/table memakai seluruh lebar yang tersedia. Form memakai maksimum 960 px. Padding halaman 24–32 px di desktop dan 16 px di mobile; gap section 24 px, gap card 16 px. Hindari card bertingkat dan dekorasi marketing.

## 6. Tables & Queues

Seluruh tabel admin memakai `AdminDataTable` berbasis Shadcn Table, dengan head/row spacing yang sama, scroll horizontal dalam region yang bernama dan dapat difokuskan, serta loading/empty/error/pagination yang konsisten.

`AdminTableToolbar` memakai URL untuk search, filter, dan pagination. Detail link serta return URL mempertahankan state daftar. Review dibuka sebagai antrean; detail baru dimuat setelah `question` dipilih secara eksplisit.

Row actions menjaga hierarchy yang sama: satu aksi rutin boleh tampil langsung, sedangkan aksi sekunder berada di menu overflow. Semua kontrol pada tabel dinormalisasi ke tinggi 28 px di desktop dan 36 px di layar kecil; kelompok aksi memakai `AdminRowActions` untuk alignment/gap dan kontrol teks baru memakai `adminTableActionClass`. Tombol overflow memakai `adminTableIconActionClass` dengan wadah persegi 28×28 px / 36×36 px, ikon 18 px, nama aksesibel yang menyebut resource, serta focus ring. Ukuran wadah adalah bagian dari standar; jangan mengatur ukuran ikon sebagai pengganti ukuran tombol.

Gunakan `AdminEmptyState` yang menjelaskan resource, alasan kosong, dan next action. `AdminErrorState` menyebut resource yang gagal serta menyediakan retry. `AdminLoading` memakai skeleton yang sama. Warna status selalu disertai label melalui `AdminStatusBadge`.

## 7. Forms

`AdminFormSection` memberi legend, description, grid field, dan separator. `AdminField` menghubungkan label/control serta hint/error ARIA. `AdminFormActions` menempatkan Cancel dan Save dalam satu pola.

Form panjang Assessment, Event, Question, Product, dan Article memakai halaman, maksimum 960 px. Modal dipakai untuk confirmation, quick create, dan small selection. Drawer dipakai untuk navigasi/filter/preview, bukan multi-step workflow.

Field teknis advanced dipisahkan dari input utama. Entity dipilih lewat nama/kode; jangan meminta admin menulis UUID. Validasi permission, version/concurrency, readiness, waktu, dan scope tetap wajib di server. Answer key hanya boleh ditampilkan melalui kontrak permission existing.


## 8. Workflow & Status

Create Event memakai alur bertahap: Informasi → Assessment & akses → Jadwal → Tinjau. Tahap sebelumnya dapat dibuka kembali, tetapi lanjut ke tahap lain memvalidasi tahap yang dilewati terlebih dahulu. Assessment yang datang dari Distribution tetap terpilih; form menyimpan context dan kembali ke parent dengan filter yang sama. Edit Event memakai struktur yang sama dan sesi tetap dikelola pada bagian terpisah.

Event detail mempertahankan context event di header dan breadcrumb. Aksi utama mengikuti lifecycle: draft melengkapi pengaturan, scheduled mengelola peserta, active membuka monitoring, dan ended membuka hasil. Tab Pengaturan memisahkan Informasi Event dari Sesi & Assessment; katalog assessment baru dimuat saat bagian sesi dibuka.

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

## 13. Canonical Admin Components

Shared components:

- `AdminPageHeader`, `AdminBreadcrumbs`, `AdminTabs`, `AdminWorkspaceTabs`.
- `AdminDataTable`, `AdminTableToolbar`, `AdminSearchInput`, `AdminPagination`.
- `AdminStatusBadge`, `AdminMetric`, `AdminReadinessChecklist`.
- `AdminRowActions`, `adminTableActionClass`, dan `adminTableIconActionClass` untuk semua row actions.
- `AdminFormSection`, `AdminField`, `AdminFormActions`, `AdminSubmitButton`.
- `AdminEmptyState`, `AdminErrorState`, `AdminLoading`, `AdminFeedbackBanner`.
- `AdminConfirmDialog`, `ConfirmSubmit`, `useAdminConfirm`, `AdminModal` untuk small workflows.

Domain components tetap menangani assessment readiness/distribution, event lifecycle, instansi/batch/assignment, monitoring/report, product readiness, dan user access. Jangan menyatukan domain berbeda dalam satu mega workspace.


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
