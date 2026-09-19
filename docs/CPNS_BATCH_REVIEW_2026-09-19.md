# Batch Review CPNS & Jalan ke Full Tryout SKD

Tanggal: 2026-09-19
Status: **alat siap dipakai; keputusan review belum diambil (menunggu manusia)**

## Masalah yang diselesaikan

Produksi hanya punya **30 soal CPNS terbit, semuanya TWK**. TIU dan TKP belum
punya satu pun soal terbit, sehingga satu set **Full Tryout SKD tidak dapat
dibentuk** (butuh TWK 30 + TIU 35 + TKP 45 = 110).

Draftnya sebenarnya ada dan layak: dari 114 draft TIU dan 113 draft TKP, hampir
semuanya sudah punya opsi dan pembahasan. Yang kurang hanya **review**.

Hambatannya prosedural: alur review di panel admin hanya menyediakan **satu soal
per satu form**. Untuk 80 soal yang dibutuhkan satu set, itu sekitar
**1.700 klik**:

```
per soal: Kirim -> Assign -> Approve (editorial) -> Approve (akademik)
          -> Approve (QA teknis) -> Publish   = ~21 klik x 80 soal
```

## Temuan: tiga RPC massal sudah ada tapi tidak pernah dipakai

Database sudah lama punya fungsi yang jelas dibuat untuk kasus ini, tetapi
**tidak ada UI maupun server action yang memanggilnya**:

| RPC | Gunanya |
|---|---|
| `claim_pilot_review_stage(p_batch)` | Tugaskan `auth.uid()` sebagai reviewer untuk semua soal batch yang review-nya masih pending tanpa reviewer |
| `bulk_review_pilot_stage(p_batch, p_decision, p_notes)` | Putuskan satu tahap review untuk seluruh batch sekaligus |
| `submit_question_for_review(p_question_id)` | Kirim satu soal ke alur review (tidak ada versi massal) |

Ketiganya menyaring lewat `response_config ->> 'pilotBatch'`, yang **belum pernah
diisi** — itulah sebabnya fungsi-fungsi ini tidak pernah berguna.

### Kenapa setiap tahap butuh DUA panggilan

`app_private.review_question_stage` **mengosongkan `reviewer_id`** di `questions`
dan `content_reviews` setiap kali satu tahap selesai, lalu membuat review pending
baru untuk tahap berikutnya. Sementara `bulk_review_pilot_stage` hanya menyentuh
soal yang `reviewer_id = auth.uid()`.

Jadi urutan yang benar per tahap adalah:

```
1. claim_pilot_review_stage(batch)              -> tugaskan diri sendiri
2. bulk_review_pilot_stage(batch, decision, ...) -> putuskan tahap itu
```

Konsekuensinya: **satu klik per tahap**, bukan bolak-balik. Tiga tahap = 3 klik.
Ditambah langkah penyiapan dan penerbitan, satu batch 80 soal selesai dalam
**~5 klik** alih-alih ~1.700.

## Yang dikerjakan

### 1. Migration `20260919100000_cpns_review_batch_v1.sql`

- Membuat tabel penanda `public.review_batches` (di-`revoke` dari `anon` dan
  `authenticated`; hanya dibaca lewat RPC).
- Menyeed batch `cpns-full-tryout-1`.
- Memilih **35 TIU + 45 TKP** dengan kriteria kualitas (bukan asal ambil):
  masih `draft`, `source_type = 'legacy_migration'`, punya ≥ 4 opsi, dan punya
  pembahasan. Urut `question_code` supaya **deterministik** — menjalankan ulang
  tidak menukar set soalnya.
- Menandai mereka lewat `response_config || {"pilotBatch": "cpns-full-tryout-1"}`.

Penandaan dilakukan **saat soal masih `draft`**, sehingga penjaga
`enforce_question_workflow_guard` tidak dilanggar dan `app.workflow_action` tidak
perlu diakali.

Migration ini **tidak menyetujui dan tidak menerbitkan apa pun.**

### 2. `app/actions/content-review-batch.ts`

Tiga server action yang memanggil RPC resmi:

| Action | RPC yang dipanggil |
|---|---|
| `prepareReviewBatchAction` | `submit_question_for_review` per draft, lalu `claim_pilot_review_stage` sekali |
| `reviewReviewBatchStageAction` | `claim_pilot_review_stage` lalu `bulk_review_pilot_stage` |
| `publishReviewBatchAction` | `publish_question` per soal (tidak ada versi massal) |

Semuanya lewat `validateCsrf()` + `authorizationService.requireAuthenticated()`
dengan pemeriksaan permission eksplisit. Aman diulang: soal yang sudah berada di
alur review dilewati.

### 3. `lib/review-batch.ts` + `components/admin/ReviewBatchPanel.tsx`

Logika gating dipisah sebagai fungsi murni supaya bisa diuji tanpa React maupun
database, lalu panelnya dirender di `/admin/content/review?program=CPNS&track=SKD`.

## Yang TIDAK dilakukan

- **Tidak ada status yang ditembus.** Semua transisi melewati RPC resmi yang
  menegakkan `auth.uid()`, permission, aturan "author != reviewer", dan penjaga
  workflow di database.
- **Keputusan approve tetap milik manusia.** Panel hanya menghapus klik mekanis;
  tidak ada yang otomatis menyetujui atau menerbitkan soal.
- Tidak ada `UPDATE public.questions SET status = ...` langsung. Percobaan itu
  ditolak database dengan
  `P0001: Workflow fields must be changed through review workflow functions`,
  dan penolakan itu memang benar.

## Temuan data: `reviewer_id = author_id` pada 80 draft

Saat memverifikasi, semua 80 soal batch ternyata membawa
`reviewer_id = author_id = 93b4d35b-…`. Ini **sisa importer legacy**, bukan
penugasan yang sah: soal berstatus `draft` belum pernah masuk review.

Dampaknya hanya pada pelaporan — tanpa menghitungnya, panel akan menampilkan
"0 belum ada reviewer" padahal belum ada satu pun reviewer yang sah. Karena itu
`summarizeBatch` menghitung `selfAssigned` secara terpisah dan
`submit_question_for_review` mengosongkan nilai itu saat soal dikirim.

Nilai ini **sengaja tidak dibersihkan manual**: penjaga workflow menolak
perubahan `reviewer_id` di luar fungsi resmi, dan alur resmi sudah
membersihkannya sendiri.

## Verifikasi

| Pemeriksaan | Hasil |
|---|---|
| `tsc --noEmit` | lolos |
| `eslint` | lolos |
| Unit test | **426 / 426** (69 file) — 19 di antaranya `tests/unit/review-batch.test.ts` |
| `npm run build` | lolos |
| Gate admin | **13 / 13** (termasuk assertion panel batch + kontrol negatif TKA) |
| Gate TKA | **16 / 16** |
| Gate paritas DB | lolos — 169 migrasi = 169, tanpa selisih tak terduga |

Gate paritas sempat **menangkap drift nyata**: objek migration batch ini sudah
ada di produksi tetapi **belum tercatat di ledger produksi**. Diperbaiki dengan
`supabase migration repair --status applied 20260919100000` pada produksi;
staging menerima SQL dan pencatatan ledger yang sama.

## Langkah manusia yang tersisa

Buka `/admin/content/review?program=CPNS&track=SKD` sebagai pemegang
`content.review` + `content.publish`:

1. **Siapkan & klaim** — 80 draft dikirim ke review dan diklaim.
2. **Setujui semua** pada tahap Editorial.
3. **Setujui semua** pada tahap Akademik.
4. **Setujui semua** pada tahap QA Teknis.
5. **Terbitkan batch**.

Setelah itu TIU 35 + TKP 45 terbit, dan satu set Full Tryout SKD
(TWK 30 + TIU 35 + TKP 45 = 110) dapat dibentuk lewat migration exam terpisah
yang **wajib diverifikasi dengan dry-run** sebelum di-apply.

> Catatan: `exam_question_items` di produksi saat ini **0 baris untuk CPNS**
> (hanya TKP/TKA). Jadi komposisi section exam juga perlu diisi, bukan hanya
> status soal diubah.
