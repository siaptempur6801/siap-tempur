# Runbook — Insiden pembayaran (Midtrans → order → token/tiket)

Dibuat dalam audit fase 1 (2026-11-17), diperbarui 2026-11-18 setelah perbaikan yang disetujui.
Sumbernya pembacaan kode dan uji Postgres lokal, bukan uji di production. Perbarui bila alurnya
berubah. Bagian yang bergantung pada migration `20261118*` baru berlaku setelah migration itu
diterapkan (lihat [`rilis.md`](rilis.md)).

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
   - admin: tombol **Sinkronkan dengan Midtrans** di detail pesanan (permission `payment.manage`);
   - `GET /api/cron/reconcile-payments`, dipanggil **tiap jam** oleh GitHub Actions
     (`reconcile-payments-cron.yml`) dan harian oleh Vercel (`vercel.json`, 07.00 WIB). Satu jalan
     memproses 50 pembayaran pending (yang paling lama tidak dicek lebih dulu), memeriksa ulang 20
     order lunas 30 hari terakhir untuk refund yang terlewat, memfinalisasi attempt kedaluwarsa,
     dan menghitung ulang ranking event yang sedang/baru berjalan.

## Gejala A — "Sudah bayar tapi token/tiket belum masuk"

1. Minta nomor order (`ORD-…`) dan waktu bayar dari peserta. Jangan minta data kartu/rekening.
2. Cek di Midtrans Dashboard (akun **production**) status transaksi untuk nomor order itu.
   - `settlement`/`capture` + `fraud_status=accept` → lanjut ke langkah 3.
   - `pending` → pembayaran belum selesai di sisi Midtrans; tidak ada yang perlu dipenuhi.
   - `expire`/`cancel`/`deny` → peserta tidak terdebit; arahkan membeli ulang.
3. Buka pesanan di **Admin → Commerce → Pesanan → detail**, lalu tekan **Sinkronkan dengan
   Midtrans**. Jalurnya sama dengan webhook (`fulfill_paid_order`, idempoten), jadi aman diulang,
   dan hasilnya tercatat di audit log. Alternatif:
   - peserta menekan bayar pada order `pending` di **Profil → Riwayat** lalu menutup jendela Snap
     (memanggil `syncPaymentStatus`);
   - jalankan cron manual (Gejala B);
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
- Cek GitHub → Actions → **Reconcile payments (hourly)**: jalan terakhir harus hijau. Job merah
  berarti endpoint tidak menjawab 200 (GitHub juga mengirim email kegagalan). Di repo publik,
  workflow terjadwal dinonaktifkan GitHub setelah 60 hari tanpa aktivitas; aktifkan kembali.
- Cek di Vercel → Project → Cron Jobs bahwa job harian terdaftar dan terakhir sukses.
- Respons cron `401` berarti `CRON_SECRET` hilang/berbeda (fail-closed).
- Cari log `Cron reconcile-payments perlu perhatian` (`alert=cron_reconcile_payments_attention`):
  `orders.failed > 0`, `orders.hasMorePending = true`, `refunds.failed > 0`, atau kegagalan
  finalisasi attempt/ranking event. Alert terkait lain: `attempt_post_scoring_sync_failed`,
  `attempt_auto_finalize_failed`, `event_ranking_refresh_failed`.
- Menjalankan cron manual (pemegang `CRON_SECRET` saja), boleh diulang untuk batch berikutnya:

  ```bash
  curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://www.siaptempur.id/api/cron/reconcile-payments
  ```

## Gejala C — Refund / chargeback

Kebijakan (keputusan pemilik 2026-11-17, `reverse_paid_order`):

- Refund/chargeback **penuh**: semua token dari pesanan itu ditarik (saldo boleh negatif bila sudah
  terpakai; peserta melihat penjelasannya), entitlement dicabut (`revoked`), tiket event dibatalkan
  (`cancelled`; attempt dan skor tidak dihapus), pesanan menjadi `refunded`/`chargeback`.
- Refund/chargeback **sebagian**: pesanan ditandai `partial_*_review`; admin meninjau dan
  menyesuaikan manual.
- Notifikasi refund yang hilang tertangkap oleh cron (order lunas 30 hari terakhir) atau tombol
  **Sinkronkan dengan Midtrans**.
- Pesanan yang pemiliknya sudah menghapus akun dicatat lunas tanpa pemenuhan
  (`payments.raw_response.fulfillment_skipped = ORDER_OWNER_DELETED`); refund dilakukan manual.

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
