# PRD: CPNS Instansi Managed Service

## 1. Ringkasan

Produk ini adalah mode layanan CPNS untuk instansi yang ingin memakai sistem ujian Siap Tempur tanpa mengelola konfigurasi sendiri. Seluruh pengaturan dilakukan oleh tim internal Siap Tempur. Instansi hanya menggunakan ujian dan menerima hasilnya.

Versi awal tidak membangun portal self-service untuk klien. Fokus MVP adalah:

- pengelolaan data instansi
- pengelolaan peserta per instansi dan batch
- pelaksanaan ujian CPNS berbasis bank soal yang sudah ada
- monitoring progres peserta
- export data hasil per instansi dengan mudah

## 2. Latar Belakang

Saat ini sistem Siap Tempur berfokus pada model B2C:

- akun user individual
- kuota tryout menempel ke profile user
- dashboard personal
- leaderboard nasional

Kebutuhan instansi berbeda:

- peserta datang sebagai kelompok
- ujian perlu discoping per instansi dan batch
- hasil perlu direkap dan diunduh dengan mudah
- administrasi dilakukan oleh tim internal Siap Tempur, bukan oleh klien

Karena itu dibutuhkan lapisan baru untuk mengelola konteks instansi tanpa merusak alur B2C yang sudah berjalan.

## 3. Tujuan Produk

### Tujuan

- Memungkinkan tim internal membuat program ujian CPNS untuk instansi tertentu.
- Memungkinkan peserta instansi mengikuti ujian CPNS pada sistem yang sama dengan B2C.
- Memisahkan data hasil ujian instansi dari aktivitas B2C user.
- Memudahkan tim internal mengunduh hasil per instansi dan per batch.
- Menjaga akun user tetap satu agar bisa dipakai untuk B2C dan instansi.

### Non-Tujuan

- Bukan portal self-service untuk admin klien.
- Bukan white-label atau subdomain khusus instansi.
- Bukan produk multi-ujian selain CPNS untuk fase awal.
- Bukan sistem billing instansi mandiri pada MVP.
- Bukan sistem anti-cheat tingkat lanjut pada MVP.

## 4. Persona

### 4.1 Admin Internal Siap Tempur

Tim operasional yang:

- membuat data instansi
- mengimpor peserta
- mengatur batch
- mengatur jadwal ujian
- memonitor progres
- mengekspor hasil untuk dikirim ke klien

### 4.2 Peserta Instansi

User yang:

- terdaftar dalam instansi dan batch tertentu
- mengikuti ujian CPNS pada jadwal yang ditentukan
- dapat memiliki akun yang sama untuk B2C

### 4.3 PIC Instansi

Pihak klien yang:

- menerima hasil rekap dari tim internal
- tidak mengakses panel administrasi pada MVP

## 5. Prinsip Produk

- Satu akun user bisa dipakai untuk B2C dan instansi.
- Konteks instansi harus dipisahkan dari konteks B2C.
- Semua data hasil instansi harus mudah difilter dan diekspor.
- Konfigurasi dilakukan oleh tim internal, bukan klien.
- Implementasi harus meminimalkan perubahan berisiko pada flow B2C yang sudah ada.

## 6. Scope MVP

### 6.1 Manajemen Instansi

Admin internal dapat:

- membuat data instansi
- menyimpan nama instansi, kode instansi, kontak PIC, dan status aktif

### 6.2 Manajemen Batch

Admin internal dapat:

- membuat batch di bawah instansi
- menentukan nama batch
- menentukan tanggal pelaksanaan
- menentukan status batch

Contoh:

- CPNS 2026 Batch A
- Simulasi Akbar April
- Kelas Intensif Minggu 1

### 6.3 Manajemen Peserta

Admin internal dapat:

- menambahkan peserta manual
- import peserta via Excel atau CSV
- mengaitkan peserta ke instansi dan batch
- memberi kode peserta atau nomor peserta

Strategi operasional MVP:

- import peserta bukan alur utama
- alur utama adalah self-onboarding peserta melalui link undangan atau kode batch
- bulk import disediakan sebagai fallback jika instansi sudah memiliki daftar peserta final

Tujuan:

- mengurangi beban kerja admin internal
- mengurangi input manual berulang
- mempercepat setup instansi dan batch

### 6.4 Pelaksanaan Ujian

Admin internal dapat:

- membuat template ujian CPNS berbasis ruleset
- menentukan komposisi soal TWK, TIU, TKP
- menentukan durasi
- menentukan randomisasi
- menentukan jumlah attempt
- menentukan jadwal buka dan tutup

Sistem akan:

- menghasilkan soal dari bank soal saat sesi dimulai
- menyimpan snapshot soal pada session
- memisahkan session instansi dari session B2C

### 6.5 Monitoring

Admin internal dapat melihat per instansi dan per batch:

- total peserta
- belum mulai
- sedang ujian
- selesai
- lulus passing grade
- tidak lulus passing grade

### 6.6 Export Data

Admin internal dapat mengunduh:

- rekap instansi
- detail peserta
- ranking internal
- daftar no-show

Format utama:

- XLSX

Format tambahan opsional:

- CSV

## 7. Kebutuhan Fungsional

### 7.1 Akun dan Identitas

- Sistem tetap memakai `auth.users` dan `profiles` sebagai identitas akun global.
- User yang sama bisa dipakai untuk B2C dan instansi.
- Data peserta instansi tidak boleh hanya menempel di `profiles`.
- Diperlukan tabel partisipasi instansi yang menyimpan konteks peserta pada instansi atau batch.

### 7.2 Data Peserta Instansi

Atribut minimal peserta instansi:

- `organization_id`
- `batch_id`
- `user_id` nullable
- `participant_code`
- `full_name_snapshot`
- `email_snapshot`
- `phone_snapshot`
- `status`
- `registered_at`
- `notes`

Atribut opsional:

- `nik`
- `unit`
- `jabatan`
- `custom_metadata`

Catatan:

- Snapshot diperlukan agar hasil export tetap konsisten walau user mengubah profil di masa depan.
- `user_id` boleh kosong untuk fase pra-aktivasi jika peserta belum menautkan akun.

### 7.2.1 Onboarding Peserta

Sistem harus mendukung dua mode onboarding:

- `self-onboarding` sebagai default
- `bulk import` sebagai fallback

#### Self-Onboarding

Admin internal dapat:

- membuat link undangan atau kode batch
- membagikan link atau kode ke peserta melalui instansi

Peserta dapat:

- membuka link undangan
- login atau membuat akun
- mengisi data minimum
- otomatis terhubung ke batch yang sesuai

Manfaat:

- admin internal tidak perlu menginput seluruh peserta satu per satu
- peserta mengisi data mereka sendiri
- proses setup instansi menjadi lebih ringan

#### Bulk Import

Bulk import dipakai jika:

- instansi mengirim daftar peserta final
- instansi meminta peserta tidak perlu input data sendiri

Kebutuhan bulk import:

- template Excel atau CSV baku
- preview data sebelum submit
- validasi per baris
- dedupe berdasarkan identifier utama
- import yang idempotent
- file error yang bisa diunduh untuk perbaikan

Identifier dedupe yang disarankan:

- email
- phone
- participant_code

### 7.3 Template Ujian

Admin internal dapat membuat template dengan atribut:

- nama template
- jumlah soal TWK
- jumlah soal TIU
- jumlah soal TKP
- durasi ujian
- ruleset subkategori opsional
- randomisasi soal
- randomisasi opsi
- jumlah attempt
- pengaturan pembahasan
- pengaturan visibilitas ranking

### 7.4 Assignment Ujian

Admin internal dapat:

- memilih batch
- memilih template
- menentukan jadwal buka
- menentukan jadwal tutup
- mengaktifkan atau menonaktifkan assignment

### 7.5 Session Ujian

Session instansi harus menyimpan metadata berikut:

- `source = organization`
- `organization_id`
- `batch_id`
- `assignment_id`
- `participant_id`

Tujuan:

- memisahkan data instansi dari B2C
- memudahkan filtering
- memudahkan export

### 7.6 Ranking Internal

Sistem harus menyediakan ranking berdasarkan:

- instansi
- batch

Ranking internal tidak boleh tercampur dengan leaderboard nasional B2C.

### 7.7 Export

#### Rekap Instansi

Kolom minimal:

- nama instansi
- nama batch
- total peserta
- total hadir
- total selesai
- total lulus
- rata-rata TWK
- rata-rata TIU
- rata-rata TKP
- rata-rata total

#### Detail Peserta

Kolom minimal:

- participant_code
- full_name
- email
- phone
- instansi
- batch
- status ujian
- waktu mulai
- waktu selesai
- durasi pengerjaan
- skor TWK
- skor TIU
- skor TKP
- total skor
- status lulus

#### Ranking Internal

Kolom minimal:

- rank
- participant_code
- full_name
- batch
- skor TWK
- skor TIU
- skor TKP
- total skor
- status lulus

#### No-show

Kolom minimal:

- participant_code
- full_name
- batch
- status
- keterangan belum mulai atau tidak selesai

## 8. Kebutuhan Non-Fungsional

- Export instansi harus bisa difilter cepat berdasarkan `organization_id` dan `batch_id`.
- Semua tabel baru harus memiliki index pada kolom filtering utama.
- Semua perubahan harus kompatibel dengan sistem B2C yang sudah berjalan.
- RLS harus tetap aman dan tidak membocorkan data lintas instansi.
- Operasional export harus sederhana untuk tim internal.

## 9. Model Data Tingkat Tinggi

Tabel baru yang disarankan:

- `organizations`
- `organization_members`
- `organization_batches`
- `organization_participants`
- `organization_exam_templates`
- `organization_exam_assignments`

Penyesuaian tabel existing:

- `test_sessions` ditambah metadata konteks instansi
- `test_answers` tetap mengikuti session yang sudah discoping

### Catatan Model Akun

- `profiles` tetap menjadi identitas akun global.
- `organization_members` menghubungkan profile dengan organisasi jika suatu saat diperlukan role seperti `owner`, `manager`, atau `staff`.
- Pada MVP managed service, role klien belum dipakai aktif, tetapi struktur ini layak disiapkan.

## 10. User Flow MVP

### 10.1 Flow Admin Internal

1. Admin membuat instansi.
2. Admin membuat batch.
3. Admin mengimpor peserta.
4. Admin membuat template ujian.
5. Admin membuat assignment untuk batch tertentu.
6. Peserta mengikuti ujian.
7. Admin memonitor progres.
8. Admin mengunduh hasil per instansi atau batch.

### 10.2 Flow Peserta

1. Peserta login atau aktivasi akun.
2. Peserta masuk ke ujian yang tersedia untuk batch-nya.
3. Sistem membuat session dengan konteks instansi.
4. Peserta mengerjakan ujian sampai selesai.
5. Hasil tercatat untuk kebutuhan ranking dan export instansi.

### 10.3 Flow Self-Onboarding

1. Admin internal membuat batch.
2. Sistem menghasilkan link undangan atau kode batch.
3. Instansi membagikan link atau kode ke peserta.
4. Peserta login atau membuat akun.
5. Peserta melengkapi data minimum.
6. Sistem membuat atau menghubungkan record peserta instansi.
7. Peserta masuk ke batch yang sesuai.

## 10A. Penempatan Fitur di Produk

Fitur instansi pada MVP tidak perlu ditampilkan pada landing page publik. Penempatan terbaik adalah pada area yang relevan dengan peran user.

### 10A.1 Area Admin Internal

Fitur instansi ditampilkan di area admin CPNS yang sudah ada.

Rekomendasi:

- tambahkan menu atau card baru `Instansi`
- entry point utama berada di area admin CPNS
- route utama yang disarankan: `/cpns/dashboard/admin/instansi`

Subhalaman yang disarankan:

- daftar instansi
- detail instansi
- batch
- peserta
- assignment ujian
- monitoring
- export

Alasan:

- admin internal sudah bekerja dari area admin CPNS
- tidak perlu membuat panel administrasi baru yang terpisah
- konteks CPNS tetap terjaga

### 10A.2 Entry Point Peserta Instansi

Peserta instansi tidak masuk melalui area admin. Mereka membutuhkan halaman join yang sederhana.

Route yang disarankan:

- `/cpns/join/[token]`
- atau `/cpns/instansi/[batchCode]`

Fungsi halaman:

- menerima token undangan atau kode batch
- meminta login atau registrasi
- menghubungkan peserta ke batch
- mengarahkan peserta ke ujian yang tersedia

Alasan:

- mengurangi kebingungan peserta
- cocok untuk model self-onboarding
- memudahkan distribusi melalui instansi

### 10A.3 Dashboard Peserta

Jika user memiliki akses program instansi, konteks instansi ditampilkan sebagai blok tambahan pada dashboard CPNS yang sudah ada.

Rekomendasi:

- tampilkan card atau section `Program Instansi`
- tampilkan nama instansi
- tampilkan batch aktif
- tampilkan status ujian
- tampilkan tombol `Mulai` atau `Lanjutkan`

Alasan:

- user tidak perlu pindah ke dashboard terpisah
- akun tetap satu untuk B2C dan instansi
- konteks latihan mandiri dan program instansi bisa hidup berdampingan

### 10A.4 Yang Tidak Ditampilkan pada MVP

Hal berikut tidak diprioritaskan untuk ditampilkan pada fase awal:

- menu instansi di landing page publik
- halaman marketing instansi publik
- dashboard klien instansi mandiri
- panel admin khusus klien

## 11. KPI Awal

### KPI Operasional

- Waktu setup instansi baru kurang dari 15 menit
- Waktu import peserta kurang dari 5 menit untuk 100 peserta
- Waktu export hasil per batch kurang dari 30 detik
- Minimal 80 persen peserta instansi dapat masuk melalui self-onboarding tanpa input manual admin internal

### KPI Produk

- 100 persen hasil instansi dapat diekspor tanpa query manual
- 0 data B2C tercampur ke export instansi
- 0 data antar instansi tercampur

## 12. Risiko dan Mitigasi

### Risiko: Data B2C dan instansi bercampur

Mitigasi:

- tambahkan metadata source dan scope instansi pada session
- semua query export wajib berbasis `organization_id`

### Risiko: Profil user berubah setelah ujian

Mitigasi:

- simpan snapshot peserta pada tabel partisipasi instansi

### Risiko: Operasional internal terlalu manual

Mitigasi:

- prioritaskan import peserta yang rapi
- prioritaskan export yang siap pakai

### Risiko: Kebutuhan klien berkembang ke self-service

Mitigasi:

- siapkan model `organizations` dan `organization_members` sejak awal
- tetap tahan fitur self-service dari scope MVP

## 13. Open Questions

- Apakah peserta wajib memiliki akun sebelum ujian dimulai, atau boleh dibuatkan dulu sebagai data peserta lalu klaim akun belakangan?
- Apakah hasil yang dibagikan ke klien cukup hasil akhir, atau perlu detail jawaban per soal pada fase berikutnya?
- Apakah satu peserta dapat mengikuti lebih dari satu batch dalam instansi yang sama?
- Apakah passing grade selalu mengikuti standar nasional, atau boleh ada target internal instansi?

## 14. Rekomendasi Implementasi

Urutan implementasi yang disarankan:

1. schema instansi, batch, dan peserta
2. metadata session untuk source instansi
3. internal UI untuk pengelolaan instansi dan batch pada area admin CPNS
4. flow join peserta melalui token atau kode batch
5. import peserta
6. template ujian dan assignment
7. dashboard monitoring
8. export XLSX per instansi dan batch

## 15. Keputusan Produk Saat Ini

Keputusan yang sudah disepakati dari diskusi:

- fokus hanya CPNS
- model layanan adalah managed service
- klien tidak menjadi admin sistem pada MVP
- akun user yang sama dapat dipakai untuk B2C dan instansi
- data peserta instansi disimpan sebagai layer partisipasi tambahan, bukan mengganti profile global
- prioritas utama fitur adalah kemudahan download data per instansi
- onboarding peserta sebaiknya mengutamakan self-onboarding, sedangkan bulk import menjadi fallback
