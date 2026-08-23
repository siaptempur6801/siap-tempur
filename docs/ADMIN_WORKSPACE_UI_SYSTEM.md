# Admin Workspace UI System V1

Status: **canonical UI/UX contract** for `/admin/**`.

## Goals

Admin Workspace harus terasa sebagai satu aplikasi, bukan kumpulan halaman feature yang memiliki layout dan navigasi sendiri-sendiri.

Prinsip utama:

1. `UnifiedAdminShell` memiliki navigation dan Program/Track context.
2. Feature page tidak membuat sidebar, tab modul, atau Program/Track selector kedua.
3. Setiap halaman memakai hierarchy yang sama: page header → feedback/notice → primary action → list/table → empty state.
4. Semua create/edit flow tetap berada di canonical `/admin/**` route.
5. Legacy `/cpns/admin/**` hanya compatibility entrypoint dan harus diarahkan ke canonical route.
6. Business logic, authorization, dan server validation tetap menjadi sumber kebenaran; UI tidak boleh menjadi access-control boundary.

## Canonical routes

| Module | Route |
|---|---|
| Dashboard | `/admin` |
| Question Bank | `/admin/content/questions` |
| Review Queue | `/admin/content/review` |
| Articles | `/admin/content/articles` |
| Exams | `/admin/assessment/exams` |
| Events | `/admin/assessment/events` |
| Products | `/admin/commerce/products` |
| Orders & Payments | `/admin/commerce` |

Route legacy tidak boleh menjadi destination setelah mutation/save.

## Layout ownership

### Shell owns

- desktop sidebar
- mobile drawer/navigation
- current active module
- Program selector
- Track selector
- role/profile/sign-out area
- global content width/background

### Page owns

- title + one-sentence purpose
- primary CTA
- page-specific notice/error/success
- modal/editor untuk task utama
- module-specific filters
- records/table/cards
- empty state

Page **tidak boleh** membuat Program/Track selector atau cross-module tabs sendiri.

## Visual primitives

Gunakan `components/admin/AdminUi.tsx` sebagai default:

- `AdminPageHeader`
- `AdminCard`
- `AdminSectionHeading`
- `AdminBadge`
- `AdminMetric`
- `AdminEmptyState`
- `adminInputClass`
- `adminPrimaryButtonClass`
- `adminSecondaryButtonClass`
- `adminDangerButtonClass`

Gunakan `components/admin/AdminModal.tsx` untuk CRUD sederhana/menengah.

Jangan memperkenalkan kembali visual legacy di `/admin/**` seperti:

- `border-2 border-gray-900` sebagai treatment utama card/form
- chunky black offset shadow
- handwriting font untuk page/form hierarchy
- hard-coded notebook background
- module tabs yang menduplikasi sidebar

## Page hierarchy

```text
AdminPageHeader
├─ title
├─ short description
└─ primary create action (optional)

feedback / notice (optional)

records
└─ AdminCard / responsive card list
   ├─ status badge
   ├─ primary information
   └─ edit/archive/action

AdminEmptyState (when no records)

AdminModal (only while create/edit is active)
└─ form / focused task
```

## CRUD forms

Default simple/medium CRUD interaction:

```text
list → Tambah/Edit → modal → submit/close → list
```

Rules:

- form CRUD tidak boleh mengambil ruang permanen di list page;
- primary create CTA berada di page header;
- Edit membuka modal dengan nilai terakhir dari database;
- modal harus menyediakan close button dan mendukung Escape/backdrop close;
- modal panjang memakai internal scroll, bukan memperpanjang document;
- close Edit harus menghapus state `?edit=` dan kembali ke canonical list URL;
- labels memakai small uppercase semantic labels;
- inputs memakai `adminInputClass`;
- create/edit memakai field order yang sama bila memungkinkan;
- primary submit berada di sisi akhir form;
- destructive action tidak menjadi primary CTA;
- validation/error harus muncul dekat task context dan menggunakan bahasa yang bisa ditindaklanjuti.

Exception: workflow long-form/editor yang membutuhkan canvas besar boleh memakai dedicated page. Article rich-text editor adalah contoh exception canonical.

## Lists and tables

Gunakan card rows bila record membutuhkan summary + banyak actions.
Gunakan table bila user membandingkan atribut tabular seperti order/payment.

Rules:

- status selalu memakai `AdminBadge`;
- mobile tidak boleh mengandalkan table sempit tanpa horizontal container;
- row hover subtle saja;
- identifier sekunder memakai smaller/muted text;
- empty collection harus memakai `AdminEmptyState`, bukan blank panel.

## Navigation and context

Default canonical admin context untuk direct routes adalah:

```text
Program: CPNS
Track:   SKD
```

Saat query `program` / `track` diberikan oleh shell, feature page wajib menghormatinya.

Context tidak boleh berubah diam-diam antara shell dan page.

Switch Program/Track harus mempertahankan current canonical module route bila module tersebut tersedia pada context baru.

## Articles and content permissions

Articles memakai schema-v2 RBAC, bukan role field legacy di `profiles`.

- `content.create`: membuat draft sendiri dan upload cover.
- `content.read`: membaca artikel yang diizinkan RLS.
- `content.update`: mengubah draft/non-published milik sendiri; Admin dapat melakukan action lintas owner melalui server-authorized mutation.
- `content.review` / `content.publish`: reviewer/publisher dapat membaca seluruh draft untuk workflow publikasi.
- public/anon hanya membaca artikel `published`.
- list/edit read wajib menggunakan authenticated user session + RLS, bukan privileged service-role read.
- Article cover menggunakan bucket khusus `article-images`; jangan berbagi konfigurasi bucket dengan Question Bank.

## Legacy routing

Compatibility mapping:

```text
/cpns/admin?tab=products  -> /admin/commerce/products
/cpns/admin?tab=events    -> /admin/assessment/events
/cpns/admin?tab=exams     -> /admin/assessment/exams
/cpns/admin?tab=questions -> /admin/content/questions
/cpns/admin?tab=commerce  -> /admin/commerce
/cpns/admin/review        -> /admin/content/review
/cpns/admin/articles/**   -> /admin/content/articles/**
```

Feature-specific legacy shortcuts seperti `tryout-config`, `tryout-akbar`, `event`, `keuangan`, create/edit question juga harus resolve ke canonical module.

## Responsive acceptance

Minimum acceptance:

- 390×844: no document horizontal overflow; navigation accessible.
- 768–1024px: content hierarchy tidak pecah dan actions wrap dengan benar.
- desktop: content tidak melebar tanpa batas; primary action mudah ditemukan.
- fixed/mobile navigation tidak menutupi actionable content.
- modal tidak melebihi viewport dan body form dapat discroll secara internal.

## UX acceptance checklist for new admin pages

- [ ] canonical `/admin/**` route
- [ ] sidebar active state sesuai halaman
- [ ] hanya satu Program/Track selector
- [ ] `AdminPageHeader` digunakan
- [ ] primary action jelas
- [ ] CRUD simple/medium memakai modal, bukan inline form permanen
- [ ] create/edit state jelas
- [ ] status menggunakan `AdminBadge`
- [ ] empty/error/success state tersedia
- [ ] mobile tidak overflow
- [ ] mutation kembali ke canonical module, bukan legacy route
- [ ] authorization tetap server-side
- [ ] reads mengikuti user-session RLS bila data memang user-facing/admin-readable tanpa service-role
