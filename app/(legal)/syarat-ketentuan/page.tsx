import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Syarat & Ketentuan - SiapTempur',
    description: 'Syarat dan ketentuan penggunaan platform SiapTempur.',
}

export default function SyaratKetentuanPage() {
    return (
        <>
            <h1 className="font-display font-bold text-4xl mb-6 text-gray-900 text-center">Syarat & Ketentuan</h1>

            <h3>1. Pendahuluan</h3>
            <p>
                Selamat datang di SiapTempur. Dengan mengakses atau menggunakan platform kami, Anda setuju untuk terikat oleh Syarat dan Ketentuan ini.
                Jika Anda tidak setuju dengan bagian mana pun dari syarat ini, Anda tidak diperkenankan menggunakan layanan kami.
            </p>

            <h3>2. Akun Pengguna</h3>
            <p>
                Untuk mengakses fitur tertentu, Anda harus mendaftar akun. Anda bertanggung jawab untuk menjaga kerahasiaan kredensial akun Anda
                dan untuk semua aktivitas yang terjadi di bawah akun Anda. Kami berhak memblokir atau menghapus akun yang melanggar aturan.
            </p>

            <h3>3. Pembelian & Pembayaran</h3>
            <p>
                Layanan premium seperti paket Tryout SKD bersifat prabayar. Pembayaran diproses melalui gateway pihak ketiga (Midtrans).
                Akses ke fitur berbayar akan diberikan setelah pembayaran berhasil diverifikasi.
            </p>

            <h3>4. Kekayaan Intelektual</h3>
            <p>
                Seluruh konten di SiapTempur, termasuk soal-soal, pembahasan, desain antarmuka, dan logo adalah hak cipta milik SiapTempur.
                Dilarang keras menyalin, menyebarluaskan, atau menjual kembali materi tanpa izin tertulis.
            </p>

            <h3>5. Batasan Tanggung Jawab</h3>
            <p>
                SiapTempur berusaha menyediakan materi tryout terbaik, namun kami tidak menjamin kelulusan Anda dalam seleksi CPNS/Kedinasan yang sebenarnya.
                Hasil tryout di platform ini hanya sebagai simulasi dan alat bantu belajar.
            </p>

            <h3>6. Perubahan Syarat</h3>
            <p>
                Kami berhak mengubah syarat dan ketentuan ini sewaktu-waktu. Perubahan akan berlaku efektif segera setelah diposting di halaman ini.
            </p>
        </>
    )
}
