import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Kebijakan Privasi - SiapTempur',
    description: 'Bagaimana SiapTempur mengelola dan melindungi data pribadi Anda.',
}

export default function KebijakanPrivasiPage() {
    return (
        <>
            <h1 className="font-handwriting font-bold text-4xl mb-6 text-gray-900 text-center">Kebijakan Privasi</h1>

            <h3>1. Data yang Kami Kumpulkan</h3>
            <p>
                Kami mengumpulkan informasi yang Anda berikan secara langsung, seperti:
            </p>
            <ul>
                <li>Nama Lengkap</li>
                <li>Alamat Email</li>
                <li>Password (Ter-enkripsi)</li>
                <li>Data Aktivitas Latihan (Skor, Waktu Pengerjaan)</li>
            </ul>

            <h3>2. Penggunaan Data</h3>
            <p>
                Data Anda digunakan untuk:
            </p>
            <ul>
                <li>Menyediakan layanan Tryout dan analisis skor.</li>
                <li>Memproses pembayaran dan transaksi.</li>
                <li>Mengirimkan informasi penting terkait akun atau layanan.</li>
                <li>Meningkatkan kualitas platform melalui analisis statistik anonim.</li>
            </ul>

            <h3>3. Keamanan Data</h3>
            <p>
                Kami menerapkan langkah-langkah keamanan teknis untuk melindungi data pribadi Anda dari akses yang tidak sah.
                Namun, perlu diingat bahwa tidak ada metode transmisi internet yang 100% aman.
            </p>

            <h3>4. Pihak Ketiga</h3>
            <p>
                Kami menggunakan layanan pihak ketiga terpercaya seperti:
            </p>
            <ul>
                <li><strong>Supabase:</strong> Untuk penyimpanan database dan autentikasi.</li>
                <li><strong>Midtrans:</strong> Untuk memproses pembayaran.</li>
                <li><strong>Google Analytics:</strong> Untuk analisis trafik web (jika diaktifkan).</li>
            </ul>

            <h3>5. Hak Anda</h3>
            <p>
                Anda berhak mengakses, memperbaiki, atau menghapus data pribadi Anda. Fitur penghapusan akun tersedia di halaman Pengaturan Profil.
            </p>
        </>
    )
}
