# Alur Peran Admin Workspace — Perapian 2026-09-19

Status: **selesai & terverifikasi di staging. Belum diterapkan ke produksi.**

## Ringkasan

Rute admin sudah benar sejak awal — 10 halaman yang ada sudah cocok dengan
Information Architecture di `docs/ADMIN_UI_UX_STANDARD.md` §2. Yang berantakan
adalah **gating dan alur perannya**, dan itu melanggar standar §4 milik repo ini
sendiri:

> "Menu harus permission-aware; jangan tampilkan aksi/menu yang user tidak dapat
> gunakan." dan "Tidak boleh ada dead-end navigation."

## Akar masalah

Visibilitas menu ditentukan **satu boolean** di `UnifiedAdminShell.tsx`:

```ts
const isFullAdmin = permissionSet.has('admin.access')
if (item.adminOnly) return isFullAdmin
```

Karena matriks peran di database memberi `admin.access` juga kepada `FINANCE`
dan `SUPPORT`, keduanya melihat **seluruh** menu Content/Assessment/Commerce.
Peran tanpa `admin.access` hanya kebagian menu yang ditebak dari daftar
permission content yang di-hardcode, dan `SCHOOL_ADMIN` tidak kebagian apa pun.

| Peran | Permission | Dulu terlihat | Dulu bisa dipakai |
|---|---|---|---|
| FINANCE | admin.access, order.read, payment.manage, report.read, entitlement.manage | **semua menu** | 1 modul |
| SUPPORT | admin.access, order.read, user.read, user.manage | **semua menu** | 1 modul, tanpa halaman user |
| SCHOOL_ADMIN | organization.manage, report.read | **tidak ada** | tidak ada |
| CONTENT_EDITOR | content.create/read/update | Review Queue, Articles | 2 |
| CONTENT_REVIEWER | content.read/review/publish | Review Queue, Articles | 2 |

Sepuluh permission tidak punya halaman sama sekali: `user.read`, `user.manage`,
`role.manage`, `settings.manage`, `audit.read`, `report.read`,
`notification.manage`, `organization.manage`, `entitlement.manage`.

## Yang dikerjakan

### A. Perapian alur peran

1. **`lib/admin-nav.ts` (baru)** — model navigasi tunggal: pohon menu dengan
   `requiresAny` per item, `visibleAdminNavGroups()`, `adminLandingPath()`, dan
   resolusi konteks. Murni (tanpa JSX) supaya bisa diuji tanpa React.
2. **`UnifiedAdminShell.tsx`** — memakai model itu; label peran dibaca manusia
   ("Reviewer Konten", bukan `CONTENT_REVIEWER`); peran ganda diringkas
   ("Admin +1") dengan `title` berisi daftar lengkap; bottom-nav mobile memakai
   tombol **"Lainnya"** yang membuka drawer, bukan lagi `.slice(0, 3)` tanpa
   jalan keluar; `<nav>` diberi `aria-label` ("Menu admin" / "Akses cepat").
3. **`app/admin/layout.tsx`** — pendaratan memakai `adminLandingPath()`.
   `SCHOOL_ADMIN` kini mendarat di `/admin/reports`, tidak lagi dilempar
   diam-diam ke `/cpns/dashboard`. Peran tanpa permukaan admin sama sekali
   diarahkan dengan penanda `?admin=no-access`.
4. **`AdminOverview.tsx`** — sadar-peran: section, metrik, quick action, dan
   ringkasan hanya dirender sesuai permission, **dan query untuk section yang
   tidak dirender tidak dijalankan sama sekali**. Sebelumnya `getWorkspaceData`
   dipanggil tanpa daftar `sections` sehingga FINANCE ikut menarik seluruh soal,
   exam, event, product, order, dan payment.

   > Catatan: `/admin` tetap dibangun untuk pekerjaan content. Ini disengaja —
   > FINANCE dan SUPPORT punya `admin.access` sehingga wajar mendarat di
   > Dashboard; yang berubah adalah Dashboard itu kini hanya menampilkan
   > bagian yang relevan bagi mereka.

5. **`AdminOperationsWorkspace.tsx`** — izin diperiksa **sebelum** query. Dulu
   `getWorkspaceData()` berjalan lebih dulu, baru permission dicek; peran tanpa
   izin tetap menunggu query berat selesai lalu disuguhi "Akses tidak tersedia".

### B. Modul yang hilang

Dibuat bersama migration `20260919120000_admin_users_reports_audit.sql`:

| Halaman | Permission | RPC |
|---|---|---|
| `/admin/users` | `user.read` / `user.manage` / `role.manage` | `admin_list_users`, `admin_list_roles`, `admin_assign_user_role`, `admin_revoke_user_role`, `admin_set_user_status` |
| `/admin/reports` | `report.read` | `admin_report_overview` |
| `/admin/audit` | `audit.read` | `admin_list_audit_logs`, `admin_audit_facets` |

**Kenapa RPC, bukan SELECT langsung:** `user_roles`, `roles`, `permissions`, dan
`audit_logs` mengaktifkan RLS **tanpa satu pun policy** — `authenticated` tidak
bisa membacanya sama sekali. `profiles` pun hanya punya policy
`id = auth.uid() OR has_permission('admin.access')`, yang tidak mengenal
`user.read`.

#### Penjaga anti-lockout (di database, bukan di UI)

1. Tidak boleh mencabut peran sendiri.
2. Tidak boleh menonaktifkan akun sendiri.
3. Tidak boleh menghilangkan `SUPER_ADMIN` terakhir / `SUPER_ADMIN` aktif terakhir.

Ketiganya ditegakkan di dalam fungsi `SECURITY DEFINER`, sehingga tidak bisa
dilewati lewat server action, API, maupun SQL langsung.

## Bug yang ditemukan saat pengujian (bukan saat menulis)

Versi pertama `admin_set_user_status` **menolak menonaktifkan pengguna biasa**
dengan alasan "Cannot deactivate the last active SUPER_ADMIN". Penyebabnya:
penjaga langsung menghitung "berapa SUPER_ADMIN aktif selain target" tanpa
memeriksa apakah target memang SUPER_ADMIN. Di lingkungan tanpa SUPER_ADMIN
sama sekali (staging), hasilnya selalu 0.

Ini **hanya ketahuan karena fungsinya benar-benar dipanggil** dengan data nyata.
`CREATE OR REPLACE` tidak memvalidasi referensi kolom di dalam plpgsql, dan
dry-run `begin; … rollback;` juga tidak — keduanya lolos.

Dua kesalahan referensi lain juga ketahuan di tahap yang sama dan sudah
diperbaiki: tabelnya `exam_attempts` (bukan `attempts`), sertifikat memakai
`issued_at` (bukan `created_at`), dan order memakai `total_amount` (bukan
`amount`).

## Verifikasi

| Pemeriksaan | Hasil |
|---|---|
| `tsc --noEmit` | lolos |
| `eslint` | lolos |
| Unit test | **456 / 456** (70 file) — 30 di antaranya `tests/unit/admin-nav.test.ts` |
| `npm run build` | lolos |
| Gate admin | **20 / 20** (dari 12) |
| Gate TKA | lolos |
| Gate paritas DB | **MERAH — disengaja** (lihat di bawah) |

### Test alur peran (`19-admin-role-navigation.spec.ts`)

Enam test dengan pengguna staging sungguhan, satu per peran: masing-masing
memprovisikan akunnya sendiri, login, lalu membuktikan **halaman pendaratan**,
**daftar menu yang terlihat maupun yang tidak terlihat**, dan — untuk FINANCE —
bahwa Dashboard-nya benar-benar sadar-peran: metrik "Perlu perhatian" dan
"Review queue" tidak muncul, sementara quick action "Order & pembayaran" ada dan
"Question bank" maupun "Kelola exam" tidak ditawarkan.

Untuk itu helper E2E diperluas: `ci-e2e-admin` kini menerima parameter `role`
opsional. **`SUPER_ADMIN` sengaja TIDAK diizinkan** — helper ini sudah bisa
membuat `ADMIN`, dan menambahkan `SUPER_ADMIN` akan menaikkan dampak bila
endpoint disalahgunakan. Tidak ada test alur peran yang membutuhkan
`role.manage`. Endpoint aslinya tetap dijaga GitHub OIDC dengan `workflow_ref`
terbatas pada satu workflow.

## Yang BELUM dilakukan

- **Migration belum diterapkan ke produksi.** Karena itu gate paritas merah:
  staging punya 8 fungsi + 1 migrasi yang belum ada di produksi. Ini drift yang
  disengaja dan **perlu keputusan eksplisit**, bukan diabaikan.
- `organization.manage`, `entitlement.manage`, `notification.manage`, dan
  `settings.manage` masih belum punya halaman. `SCHOOL_ADMIN` sudah tidak
  dead-end karena punya `report.read`, tetapi `organization.manage`-nya masih
  tanpa UI.
- `lib/utils/admin.ts` (`getCurrentUserRole`, `isAdminRole`) masih dipakai
  `app/actions/articles.ts` dan halaman artikel. Itu adapter transisional yang
  sudah didokumentasikan sebagai calon dihapus; belum disentuh karena di luar
  cakupan perapian ini.
