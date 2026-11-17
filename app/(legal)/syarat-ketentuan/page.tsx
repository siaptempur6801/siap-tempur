import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Syarat & Ketentuan',
  description: 'Syarat dan ketentuan penggunaan platform SiapTempur.',
}

export default function SyaratKetentuanPage() {
  return (
    <>
      <h1 className="font-display font-bold text-4xl mb-6 text-gray-900 text-center">
        Syarat & Ketentuan
      </h1>
      <p className="text-center text-sm text-gray-500">Berlaku sejak 17 November 2026</p>

      <h3>1. Pendahuluan</h3>
      <p>
        Selamat datang di SiapTempur, platform latihan dan tryout CPNS/SKD dan TKA. Dengan mendaftar
        atau menggunakan platform kami, Anda setuju untuk terikat oleh Syarat dan Ketentuan ini
        serta <Link href="/kebijakan-privasi">Kebijakan Privasi</Link>. Jika Anda tidak setuju
        dengan bagian mana pun, Anda tidak diperkenankan menggunakan layanan kami.
      </p>

      <h3>2. Akun Pengguna</h3>
      <p>
        Untuk mengakses fitur tertentu, Anda harus mendaftar akun. Anda bertanggung jawab untuk
        menjaga kerahasiaan kredensial akun Anda dan untuk semua aktivitas yang terjadi di bawah
        akun Anda. Kami berhak memblokir atau menghapus akun yang melanggar aturan. Anda dapat
        menghapus akun kapan saja melalui pengaturan profil.
      </p>

      <h3>3. Pengguna di Bawah 18 Tahun</h3>
      <p>
        Pengguna yang berusia di bawah 18 tahun hanya boleh mendaftar dan menggunakan SiapTempur
        dengan persetujuan orang tua atau wali. Dengan menyatakan hal tersebut saat pendaftaran,
        orang tua/wali dianggap telah membaca dan menyetujui Syarat &amp; Ketentuan ini serta
        Kebijakan Privasi, dan bertanggung jawab atas pembelian yang dilakukan melalui akun anak.
      </p>

      <h3>4. Pembelian & Pembayaran</h3>
      <p>
        Layanan berbayar seperti paket atau token tryout bersifat prabayar. Pembayaran diproses
        melalui gateway pihak ketiga (Midtrans). Akses ke fitur berbayar akan diberikan setelah
        pembayaran berhasil diverifikasi.
      </p>

      <h3>5. Kekayaan Intelektual</h3>
      <p>
        Seluruh konten di SiapTempur, termasuk soal-soal, pembahasan, desain antarmuka, dan logo
        adalah hak cipta milik SiapTempur. Dilarang keras menyalin, menyebarluaskan, atau menjual
        kembali materi tanpa izin tertulis.
      </p>

      <h3>6. Batasan Tanggung Jawab</h3>
      <p>
        SiapTempur berusaha menyediakan materi tryout terbaik, namun kami tidak menjamin kelulusan
        Anda dalam seleksi CPNS/Kedinasan maupun hasil TKA yang sebenarnya. Hasil tryout di platform
        ini hanya sebagai simulasi dan alat bantu belajar.
      </p>

      <h3>7. Perubahan Syarat</h3>
      <p>
        Kami dapat mengubah syarat dan ketentuan ini. Perubahan material akan diberitahukan dan Anda
        akan diminta menyetujuinya kembali saat masuk berikutnya.
      </p>

      <h3>8. Kontak</h3>
      <p>
        Pertanyaan mengenai Syarat &amp; Ketentuan ini dapat dikirim ke{' '}
        <a href="mailto:halo@siaptempur.id">halo@siaptempur.id</a>.
      </p>
    </>
  )
}
