# Runbook — Insiden pembayaran (Midtrans → order → token/tiket)

Dibuat dalam audit fase 1 (2026-11-17) dari pembacaan kode, bukan dari uji di production.
Perbarui bila alurnya berubah. Rujukan kode ada di setiap langkah.

## Alur singkat

1. Peserta membeli → `createOrder` membuat `orders` (`pending`) + `order_items`
   (`src/services/commerce.service.ts`), lalu Snap dibuat dengan **kedaluwarsa 15 menit**
   (`lib/midtrans.ts`, `custom_expiry`), dan baris `payments` `pending` disimpan.
2. Midtrans mengirim notifikasi ke `POST /api/payments/webhook`
   (`app/api/payments/webhook/route.ts`): signature SHA-512, `fraud_status`, lalu
   `paymentService.processWebhook` → RPC `fulfill_paid_order`.
3. `fulfill_paid_order` (migration `20261012183809_…`) mengunci order, mencocokkan nominal,
   menandai `paid`, menambah saldo `wallets` (idempoten per `order_item`), membuat
   `entitlements`, dan untuk produk tiket event membuat `event_registrations`.
4. Jalur cadangan:
   - tombol/aksi peserta `syncPaymentStatus` / `syncEventPaymentStatus` (cek status ke Midtrans);
   - cron harian `GET /api/cron/reconcile-payments` (`vercel.json`: `0 0 * * *` UTC = 07.00 WIB),
     memproses **50 pembayaran pending tertua** per jalan.

## Gejala A — "Sudah bayar tapi token/tiket belum masuk"

1. Minta nomor order (`ORD-…`) dan waktu bayar dari peserta. Jangan minta data kartu/rekening.
2. Cek di Midtrans Dashboard (akun **production**) status transaksi untuk nomor order itu.
   - `settlement`/`capture` + `fraud_status=accept` → lanjut ke langkah 3.
   - `pending` → pembayaran belum selesai di sisi Midtrans; tidak ada yang perlu dipenuhi.
   - `expire`/`cancel`/`deny` → peserta tidak terdebit; arahkan membeli ulang.
3. Picu sinkronisasi; semua jalur memanggil `fulfill_paid_order` yang idempoten, jadi aman diulang:
   - peserta membuka **Profil → Riwayat**, menekan bayar pada order yang masih `pending`, lalu
     menutup jendela Snap. Penutupan memanggil `syncPaymentStatus` (`components/profile/HistoryTab.tsx`).
     Belum ada tombol "cek status" khusus, dan belum ada alat admin untuk menyinkronkan satu order
     (kesenjangan operasional, lihat laporan audit);
   - untuk tiket event, modal event memanggil `syncEventPaymentStatus`;
   - jalankan cron manual (Gejala B). Cara ini hanya mencakup order yang baris `payments`-nya masih `pending`;
   - minta Midtrans mengirim ulang notifikasi, bila fitur itu tersedia di Dashboard akun.
4. Bila tetap gagal, cari di log Vercel (Runtime Logs) berdasarkan nomor order:
   - `Midtrans webhook ditolak karena nominal tidak cocok` → `PAYMENT_AMOUNT_MISMATCH`.
     Jangan dipenuhi manual; eskalasi ke pemilik (indikasi salah harga atau manipulasi).
   - `Midtrans webhook untuk order yang tidak dikenal` → notifikasi untuk order yang tidak ada di
     database ini (mis. transaksi staging/sandbox yang salah alamat, atau order terhapus).
   - `Payment webhook failed` / `Payment reconcile order check failed` → error database/RPC,
     termasuk `EVENT_PRODUCT_SESSION_REQUIRED` (produk tiket event tanpa sesi). Perbaiki
     konfigurasinya, lalu ulangi langkah 3.
5. **Jangan** menambah token manual lewat *Sesuaikan saldo* (`admin_adjust_wallet`) sebelum
   dipastikan `fulfill_paid_order` tidak akan berhasil. Penyesuaian manual tidak terkait
   `order_item`, sehingga webhook/rekonsiliasi yang berhasil kemudian akan **menambah token
   kedua kalinya**. Bila terpaksa, catat nomor order di kolom alasan dan tandai untuk ditinjau.

## Gejala B — Banyak order menggantung `pending`

- Panggil `/api/health` dengan `Authorization: Bearer <HEALTH_CHECK_TOKEN>` dan baca
  `payments.oldestPendingPaymentMinutes`. Nilai > ~1.500 (25 jam) berarti cron rekonsiliasi
  tidak berjalan atau terus gagal.
- Cek di Vercel → Project → Cron Jobs bahwa job terdaftar dan terakhir sukses.
- Respons cron `401` berarti `CRON_SECRET` hilang/berbeda (fail-closed).
- Cari log `Cron reconcile-payments perlu perhatian` (`alert=cron_reconcile_payments_attention`):
  `orders.failed > 0` atau `orders.hasMorePending = true`.
- Menjalankan cron manual (pemegang `CRON_SECRET` saja), boleh diulang untuk batch berikutnya:

  ```bash
  curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://siaptempur.id/api/cron/reconcile-payments
  ```

## Gejala C — Refund / chargeback

- Hanya produk **token TKA** (`exam_token_tka`) yang otomatis ditarik (`reverse_tka_token_order`);
  saldo boleh menjadi negatif bila token sudah terpakai.
- Produk lain (tiket event, token CPNS, pass) **tidak** dicabut otomatis dan order tetap `paid`
  (temuan audit A-05). Setelah refund, cabut akses secara manual dan catat di audit log.
- Refund yang terjadi saat webhook hilang tidak pernah direkonsiliasi (cron hanya memproses
  `pending`). Setelah refund dari Midtrans Dashboard, pastikan notifikasi refund diterima.

## Gejala D — Midtrans / Upstash / Supabase tidak tersedia

- Midtrans down: checkout gagal dengan pesan "Terjadi kesalahan sistem…"; order ditandai `failed`.
  Tidak ada data yang perlu dipulihkan.
- Upstash down di production: checkout dan cek status pembayaran oleh peserta, serta lupa kata
  sandi/kirim ulang verifikasi, ditolak seolah terkena rate limit (fail-closed). Login dan daftar
  tetap jalan memakai limiter memori. Webhook dan cron tidak terdampak. Pengerjaan ujian fail-open.
- Supabase down: `/api/health` 503. Webhook menjawab 500 dan Midtrans mengulang notifikasi;
  setelah pulih, notifikasi ulang + cron menyelesaikan order.

## Eskalasi

Isi sebelum go-live (belum ada di repo): pemilik on-call, kontak Midtrans (merchant support),
kontak Supabase, dan siapa yang berwenang melakukan refund.
