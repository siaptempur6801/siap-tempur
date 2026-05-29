import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Kebijakan Pengembalian - SiapTempur',
    description: 'Kebijakan pengembalian dana untuk layanan SiapTempur.',
}

export default function KebijakanPengembalianPage() {
    return (
        <>
            <h1 className="font-handwriting font-bold text-4xl mb-6 text-gray-900 text-center">Kebijakan Pengembalian Dana</h1>

            <h3>1. Produk Digital</h3>
            <p>
                Layanan yang kami tawarkan (Token Tryout, Paket Tryout) adalah produk digital (intangible goods).
                Oleh karena itu, kami menerapkan kebijakan <strong>TIDAK ADA PENGEMBALIAN DANA (NO REFUND)</strong> setelah pembelian berhasil dikonfirmasi dan akses/token telah diberikan.
            </p>

            <h3>2. Kesalahan Sistem</h3>
            <p>
                Pengecualian dapat diberikan HANYA jika terjadi kesalahan sistem dari pihak kami, seperti:
            </p>
            <ul>
                <li>Saldo terpotong namun Token/Akses tidak masuk lebih dari 1x24 jam.</li>
                <li>Terjadi pembayaran ganda (double charge) untuk satu transaksi yang sama.</li>
            </ul>
            <p>
                Dalam kasus di atas, harap segera hubungi tim dukungan kami melalui menu "Lapor Bug" atau email dengan melampirkan bukti pembayaran yang sah.
            </p>

            <h3>3. Pembatalan Transaksi</h3>
            <p>
                Transaksi yang belum dibayar (status Pending) dapat dibatalkan atau akan kadaluarsa otomatis oleh sistem Midtrans.
                Tidak ada biaya yang dikenakan untuk pembatalan transaksi yang belum dibayar.
            </p>

            <h3>4. Hubungi Kami</h3>
            <p>
                Jika Anda memiliki pertanyaan lebih lanjut mengenai kebijakan ini, silakan hubungi tim dukungan kami sebelum melakukan pembelian.
            </p>
        </>
    )
}
