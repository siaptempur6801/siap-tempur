# Modul Entitlements & Settings — 2026-09-19

Status: **selesai & terverifikasi di staging. Migration belum diterapkan ke produksi.**

## Kenapa hanya dua, bukan empat

Perapian alur peran menyisakan empat permission tanpa halaman:
`entitlement.manage`, `settings.manage`, `organization.manage`,
`notification.manage`. Setelah diperiksa, hanya **dua yang punya data dan kode
nyata**:

| Permission | Data di produksi | Dipakai kode | Keputusan |
|---|---|---|---|
| `entitlement.manage` | **426 dompet `exam_token_cpns` (5.087 token)**, 87 transaksi, 6 voucher, 307 klaim | `tempur-pass.service.ts`, `pass-catalog.service.ts`, `exam-attempt.service.ts`, `wallet.service.ts` | **Dibuat** |
| `settings.manage` | `features` **40 baris**, `certificate_templates` 1, `feature_flags` 1, `periods`/`track_periods` 1 | `tempur-pass.service.ts`, `pass-catalog.service.ts`, `app/actions/event-certificate.ts` | **Dibuat** |
| `organization.manage` | **0 baris** (organizations, organization_members, organization_licenses, classes, class_members) | **0 file** | **Tidak dibuat** |
| `notification.manage` | **0 baris** (notifications, notification_campaigns, notification_deliveries) | **0 file** | **Tidak dibuat** |

Dua yang terakhir tidak dibuat karena **`docs/STATUS.md` sendiri menundanya**:

- §3: "Cakupan Production V1: CPNS/SKD + TKA SMP + Unified Admin + Commerce/Event.
  **Di luar cakupan (ditunda): TKA SD, TKA SMA/SMK, B2B sekolah.**"
- §4 Milestone 8: "Platform expansion (**B2B, notifikasi**, analytics) | ⏸ ditunda"
- §5: "Goal berikutnya (**belum aktif**): CPNS Instansi Managed Service (B2B)"

Audit legacy juga sudah menyimpulkan tabel organisasi adalah sisa fitur yang
tidak pernah jalan: *"tabel (12 baris total) yang tampaknya sisa fitur 'exam
group' / B2B sekolah"* (`docs/LEGACY_PROD_AUDIT_2026-09-18.md`).

Membuatkan halaman untuk keduanya berarti **memulai pekerjaan yang ditunda dan
mengarang semantik skema** (apa itu "organisasi" di produk ini? lisensi sekolah
dihitung bagaimana?), bukan melengkapi halaman. Itu keputusan produk, bukan
keputusan teknis — jadi ditanyakan, bukan diasumsikan.

## A. Entitlements — `/admin/entitlements`

Permission: `entitlement.manage` (FINANCE + ADMIN).

Halaman ini menggantikan pengelolaan token/voucher lewat SQL langsung:

- **Ringkasan**: saldo per tipe dompet, jumlah voucher aktif, klaim, pass aktif.
- **Voucher**: daftar lengkap (kuota, pemakaian, **token yang sudah diberikan**,
  berlaku untuk program mana, kedaluwarsa) + form buat/ubah.
- **Dompet pengguna**: pencarian, saldo, riwayat transaksi, dan penyesuaian saldo.
- **Pass & entitlement**: daftar hak akses fitur per pengguna.

### Penjaga `admin_adjust_wallet` — token bernilai uang

1. **Tidak boleh menyesuaikan dompet sendiri.** Mem bolehkannya sama dengan
   memberi pemegang `entitlement.manage` akses cetak uang. Halaman ini juga
   menyembunyikan formnya untuk dompet sendiri, jadi aksinya tidak ditawarkan.
2. Jumlah tidak boleh 0, dan dibatasi 1.000.000 per penyesuaian.
3. Saldo tidak boleh menjadi negatif.
4. **Alasan wajib**, minimal 3 karakter.
5. Setiap penyesuaian menulis baris `wallet_transactions`
   (`source_type = 'admin_adjustment'`) sehingga riwayatnya tidak bisa hilang.

## B. Settings — `/admin/settings`

Permission: `settings.manage` (ADMIN).

- **Feature flag**: saklar + rollout bertahap + config JSON; bisa dibuat/diubah.
- **Katalog fitur**: 40 fitur yang dirujuk `entitlements` — **hanya-baca**,
  karena kode fitur dirujuk langsung oleh kode aplikasi.
- **Template sertifikat**: nama, URL, config JSON.
- **Periode & track**: daftar periode dan saklar aktif per track period.
- **Pengaturan operasional**: key-value `system_settings` bebas (nilai boleh
  JSON, teks biasa disimpan sebagai string).

### Penjaga

- `admin_upsert_voucher` menolak **mengubah kode voucher yang sudah punya
  klaim** — pengguna memegang kode itu, dan mengubahnya membuat klaim lama
  menunjuk kode yang tidak pernah mereka pakai. Juga menolak `max_uses` lebih
  kecil dari `used_count`.
- `admin_upsert_certificate_template` menolak **mengosongkan `template_url`**
  selama masih ada sertifikat terbit yang memakainya — sertifikat lama akan
  gagal dirender ulang.
- `admin_upsert_feature_flag` membatasi rollout 0–100 dan memvalidasi bentuk key.
- `admin_upsert_system_setting` memvalidasi bentuk key.

## Bug yang ketahuan saat pengujian

`admin_list_vouchers` versi pertama menghitung "token yang sudah diberikan"
dari `voucher_claims.quota_amount` — **kolom itu tidak ada**. `voucher_claims`
hanya menyimpan `id, voucher_id, user_id, user_email, claimed_at`; berapa token
yang diberikan tidak dicatat di sana.

Perbaikannya bukan sekadar mengganti nama kolom: angka yang benar diambil dari
**buku besar dompet** (`wallet_transactions` dengan `source_type = 'voucher'`
dan `source_id = voucher.id`), yang juga satu-satunya sumber yang tidak bisa
basi bila kuota voucher diubah setelah klaim.

Seperti sebelumnya, ini hanya ketahuan karena fungsinya **dipanggil** dengan data
nyata — `CREATE OR REPLACE` tidak memvalidasi referensi kolom di dalam plpgsql,
dan dry-run `begin; … rollback;` juga lolos.

## Verifikasi

| Pemeriksaan | Hasil |
|---|---|
| `tsc --noEmit` | lolos |
| `eslint` | lolos |
| Unit test | **457 / 457** (70 file) |
| `npm run build` | lolos |
| Gate admin | **21 / 21** |
| Gate TKA | lolos |
| Uji penjaga RPC | **14 / 14** sesuai harapan (lihat di bawah) |
| Gate paritas DB | **MERAH — disengaja**, menunggu keputusan produksi |

### Uji penjaga (dijalankan sebagai pengguna nyata di staging)

Ditolak sebagaimana mestinya: sesuaikan dompet sendiri · jumlah 0 · alasan
terlalu pendek · melebihi batas 1 juta · saldo jadi negatif · tipe dompet tidak
dikenal · kode voucher tidak valid · kuota voucher ≤ 0 · rollout di luar 0–100 ·
key setting tidak valid.

Diizinkan sebagaimana mestinya: kredit sah ke pengguna lain · voucher baru sah ·
setting sah · hapus setting.

Semua dijalankan di dalam transaksi yang di-`rollback`, jadi tidak ada data yang
berubah.

## Yang masih belum ada halaman

- `organization.manage` (B2B sekolah) — ditunda oleh `docs/STATUS.md`.
- `notification.manage` — ditunda oleh `docs/STATUS.md`.
- `role.manage` sudah tercakup di `/admin/users` (beri/cabut peran).
