import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Kebijakan Privasi',
  description:
    'Bagaimana SiapTempur mengumpulkan, memakai, menyimpan, dan melindungi data pribadi pengguna.',
}

const CONTACT_EMAIL = 'halo@siaptempur.id'

export default function KebijakanPrivasiPage() {
  return (
    <>
      <h1 className="font-display font-bold text-4xl mb-6 text-gray-900 text-center">
        Kebijakan Privasi
      </h1>
      <p className="text-center text-sm text-gray-500">Berlaku sejak 17 November 2026</p>

      <p>
        Kebijakan ini menjelaskan bagaimana SiapTempur memproses data pribadi Anda saat memakai
        platform latihan dan tryout CPNS/SKD dan TKA di siaptempur.id, sesuai Undang-Undang Nomor 27
        Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP).
      </p>

      <h3>1. Pengendali Data</h3>
      <p>
        Pengendali data pribadi adalah SiapTempur. Pertanyaan, permintaan, dan keluhan terkait data
        pribadi dapat dikirim ke <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>

      <h3>2. Data yang Kami Kumpulkan</h3>
      <ul>
        <li>
          <strong>Data akun:</strong> nama lengkap, nama tampilan, alamat email, dan kata sandi.
          Kata sandi disimpan dalam bentuk hash oleh penyedia autentikasi kami; kami tidak pernah
          melihat kata sandi Anda. Bila mendaftar dengan Google, kami menerima nama, email, dan foto
          profil dari akun Google Anda.
        </li>
        <li>
          <strong>Data profil yang Anda isi:</strong> foto profil, tanggal lahir, jenis kelamin,
          nomor telepon, serta jenjang/jalur belajar, nama sekolah, kelas, dan target tahun ujian.
        </li>
        <li>
          <strong>Persetujuan:</strong> versi dan waktu Anda menyetujui Syarat &amp; Ketentuan dan
          Kebijakan ini, serta keterangan usia (18 tahun ke atas, atau di bawah 18 tahun dengan izin
          orang tua/wali).
        </li>
        <li>
          <strong>Data belajar:</strong> sesi latihan dan tryout, jawaban, skor, durasi, peringkat,
          riwayat soal yang salah, serta sertifikat event.
        </li>
        <li>
          <strong>Data transaksi:</strong> pesanan, paket, saldo token, nomor transaksi, metode dan
          status pembayaran. Data kartu atau rekening Anda diproses oleh Midtrans dan tidak disimpan
          oleh SiapTempur.
        </li>
        <li>
          <strong>Data teknis:</strong> alamat IP dan informasi permintaan untuk keamanan dan
          pembatasan percobaan (rate limit), serta statistik penggunaan agregat.
        </li>
      </ul>

      <h3>3. Tujuan dan Dasar Pemrosesan</h3>
      <ul>
        <li>
          Menyediakan layanan: akun, latihan, tryout, penilaian, pembahasan, riwayat, event, dan
          sertifikat — berdasarkan pelaksanaan perjanjian dengan Anda.
        </li>
        <li>
          Memproses pembayaran dan menyimpan bukti transaksi — berdasarkan perjanjian dan kewajiban
          hukum.
        </li>
        <li>
          Menjaga keamanan akun dan platform, termasuk mencegah penyalahgunaan — berdasarkan
          kepentingan yang sah.
        </li>
        <li>
          Meningkatkan kualitas platform melalui statistik penggunaan yang tidak mengidentifikasi
          Anda secara langsung — berdasarkan kepentingan yang sah.
        </li>
        <li>Mengirim email penting terkait akun, seperti verifikasi dan atur ulang kata sandi.</li>
      </ul>

      <h3>4. Data Anak</h3>
      <p>
        Peserta TKA dapat berusia di bawah 18 tahun. Pengguna di bawah 18 tahun hanya boleh
        mendaftar dan memakai SiapTempur dengan persetujuan orang tua atau wali, yang dinyatakan
        saat pendaftaran. Orang tua/wali dapat menggunakan hak pada bagian 8 atas nama anak,
        termasuk meminta penghapusan akun.
      </p>

      <h3>5. Data yang Dapat Dilihat Pihak Lain</h3>
      <ul>
        <li>
          <strong>Papan peringkat:</strong> nama lengkap, foto profil, skor, dan peringkat Anda
          dapat terlihat oleh peserta lain pada peringkat nasional atau event yang Anda ikuti.
        </li>
        <li>
          <strong>Sertifikat:</strong> siapa pun yang memegang nomor atau tautan sertifikat Anda
          dapat membuka halaman verifikasi yang menampilkan nama pada sertifikat, event, dan
          capaian. Halaman ini tidak diindeks mesin pencari.
        </li>
        <li>
          <strong>Instansi:</strong> bila Anda bergabung ke batch sebuah instansi lewat undangan,
          pengelola instansi tersebut dapat melihat dan mengunduh hasil asesmen yang Anda kerjakan
          dalam batch itu.
        </li>
      </ul>

      <h3>6. Pihak Ketiga yang Memproses Data</h3>
      <p>Kami tidak menjual data pribadi. Data diproses oleh penyedia layanan berikut:</p>
      <ul>
        <li>
          <strong>Supabase</strong> — database, autentikasi, dan penyimpanan berkas.
        </li>
        <li>
          <strong>Vercel</strong> — hosting aplikasi dan statistik kunjungan (Vercel Analytics,
          tanpa cookie pelacak).
        </li>
        <li>
          <strong>Midtrans</strong> — pemrosesan pembayaran.
        </li>
        <li>
          <strong>Upstash</strong> — penyimpanan sementara penghitung rate limit.
        </li>
        <li>
          <strong>Google</strong> — bila Anda memilih masuk dengan Google.
        </li>
      </ul>
      <p>
        Sebagian penyedia tersebut memproses data di luar wilayah Indonesia, antara lain di
        Singapura. Kami hanya memakai penyedia yang menerapkan pelindungan data yang memadai.
      </p>

      <h3>7. Masa Penyimpanan</h3>
      <ul>
        <li>
          Data akun, profil, dan data belajar disimpan selama akun aktif dan dihapus saat Anda
          menghapus akun. Salinan cadangan sistem terhapus mengikuti siklus cadangan, paling lambat
          30 hari.
        </li>
        <li>
          Catatan transaksi (nomor pesanan, produk, nominal, status, dan waktu pembayaran) disimpan
          hingga 10 tahun untuk memenuhi kewajiban dokumen keuangan. Saat akun dihapus, catatan ini
          dilepas dari akun Anda dan data pribadi di dalamnya (seperti nama, email, dan detail
          kartu) dihapus.
        </li>
        <li>Log permintaan server disimpan paling lama 90 hari.</li>
        <li>Penghitung rate limit kedaluwarsa otomatis dalam hitungan menit.</li>
      </ul>

      <h3>8. Hak Anda</h3>
      <p>Sesuai UU PDP, Anda berhak:</p>
      <ul>
        <li>mendapatkan informasi dan mengakses salinan data pribadi Anda;</li>
        <li>memperbaiki data yang tidak akurat — sebagian besar dapat diubah di halaman profil;</li>
        <li>menghapus akun dan data pribadi — tersedia di pengaturan profil, atau lewat email;</li>
        <li>menarik persetujuan dan mengajukan keberatan atas pemrosesan tertentu.</li>
      </ul>
      <p>
        Kirim permintaan ke <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> dari email yang
        terdaftar. Kami menanggapi permintaan akses dan perbaikan paling lambat 3 x 24 jam setelah
        identitas pemohon terverifikasi. Menarik persetujuan dapat membuat layanan tidak dapat lagi
        diberikan, karena data diperlukan untuk menjalankan akun.
      </p>

      <h3>9. Cookie</h3>
      <p>
        Kami hanya memakai cookie yang diperlukan: cookie sesi login dan cookie pengaman formulir
        (CSRF). Kami tidak memakai cookie iklan atau pelacak lintas situs.
      </p>

      <h3>10. Keamanan dan Pemberitahuan Insiden</h3>
      <p>
        Kami menerapkan kontrol akses berbasis peran, enkripsi koneksi (HTTPS), dan pembatasan akses
        database. Bila terjadi kegagalan pelindungan data pribadi, kami akan memberi tahu pengguna
        yang terdampak dan otoritas terkait paling lambat 3 x 24 jam sesuai UU PDP.
      </p>

      <h3>11. Perubahan Kebijakan</h3>
      <p>
        Bila kebijakan ini berubah secara material, kami akan meminta persetujuan ulang saat Anda
        masuk berikutnya. Lihat juga <Link href="/syarat-ketentuan">Syarat &amp; Ketentuan</Link>.
      </p>
    </>
  )
}
