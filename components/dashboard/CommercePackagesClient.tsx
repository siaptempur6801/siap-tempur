'use client'

import { useRouter } from 'next/navigation'
import { CheckCircle2, Flame, Package, ShieldCheck, Sparkles, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { createPackageTransaction, syncPaymentStatus } from '@/app/actions/payment'
import { cn } from '@/lib/utils'

export type CommercePackage = {
    code: string
    name: string
    description: string | null
    price: number
    currency: string
    tokenGrant: number
}

function rupiah(value: number) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(value)
}

export default function CommercePackagesClient({ packages }: { packages: CommercePackage[] }) {
    const router = useRouter()
    const unitPackage = packages
        .filter((pkg) => pkg.tokenGrant > 0)
        .sort((a, b) => a.tokenGrant - b.tokenGrant)[0]
    const referenceUnitPrice = unitPackage ? unitPackage.price / unitPackage.tokenGrant : 0

    const handleBuy = async (productCode: string) => {
        const loadingToast = toast.loading('Memproses pesanan...')
        try {
            const transaction = await createPackageTransaction(productCode)
            if (!transaction.token) throw new Error('Gagal mendapatkan token pembayaran')
            toast.dismiss(loadingToast)

            window.snap.pay(transaction.token, {
                onSuccess: async () => {
                    const id = toast.loading('Memverifikasi pembayaran...')
                    await syncPaymentStatus(transaction.orderId)
                    toast.success('Pembayaran berhasil!', {
                        id,
                        description: 'Token akan masuk otomatis setelah pembayaran terverifikasi.',
                    })
                    router.refresh()
                },
                onPending: async () => {
                    const id = toast.loading('Memperbarui status...')
                    await syncPaymentStatus(transaction.orderId)
                    toast.info('Pembayaran tertunda', { id })
                },
                onError: () => toast.error('Pembayaran gagal'),
                onClose: async () => {
                    const id = toast.loading('Memeriksa status terakhir...')
                    await syncPaymentStatus(transaction.orderId)
                    toast.info('Pembayaran ditutup', { id })
                },
            })
        } catch (error) {
            toast.dismiss(loadingToast)
            toast.error('Terjadi kesalahan', {
                description: error instanceof Error ? error.message : 'Gagal membuat transaksi.',
            })
        }
    }

    return (
        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-8 sm:px-6 sm:py-12">
            <div className="mb-10 text-center">
                <h1 className="font-handwriting flex items-center justify-center gap-3 text-4xl font-bold text-gray-900 sm:text-6xl">
                    <Package className="h-11 w-11 text-indigo-600" /> Beli Paket
                </h1>
                <p className="font-handwriting mt-3 text-xl text-gray-600 sm:text-2xl">
                    Harga dan benefit langsung dari katalog SiapTempur.
                </p>
            </div>

            {packages.length === 0 ? (
                <div className="mx-auto w-full max-w-2xl border-2 border-gray-900 bg-white p-8 text-center shadow-[6px_6px_0_0_#111]">
                    <Package className="mx-auto h-10 w-10" />
                    <h2 className="mt-3 text-xl font-black">Belum ada paket aktif</h2>
                    <p className="mt-2 text-gray-600">Admin belum mengaktifkan harga produk.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                    {packages.map((pkg) => {
                        const saving = referenceUnitPrice > 0 && pkg.tokenGrant > 0
                            ? Math.max(0, Math.round(referenceUnitPrice * pkg.tokenGrant - pkg.price))
                            : 0
                        const bestSeller = pkg.tokenGrant === 5
                        const features = [
                            `${pkg.tokenGrant} token Full Tryout CPNS`,
                            '110 soal SKD per Full Tryout',
                            'Masuk Ranking Nasional',
                            'Token tersimpan di wallet akun',
                        ]

                        return (
                            <article
                                key={pkg.code}
                                className={cn(
                                    'relative flex flex-col border-2 border-gray-900 bg-white p-6 shadow-[7px_7px_0_0_#111]',
                                    bestSeller && 'bg-yellow-50 lg:-translate-y-3'
                                )}
                            >
                                {bestSeller && (
                                    <div className="absolute -right-3 -top-3 flex items-center gap-1 border-2 border-gray-900 bg-red-500 px-3 py-1 text-sm font-black text-white">
                                        <Flame className="h-4 w-4" /> BEST SELLER
                                    </div>
                                )}

                                <h2 className="font-handwriting text-3xl font-black text-gray-900">{pkg.name}</h2>
                                <p className="mt-2 min-h-12 font-semibold text-gray-500">
                                    {pkg.description || `${pkg.tokenGrant} token Full Tryout CPNS`}
                                </p>

                                <div className="mt-5">
                                    <div className="text-4xl font-black text-indigo-600">{rupiah(pkg.price)}</div>
                                    <div className="mt-1 font-bold text-gray-500">{pkg.tokenGrant} token</div>
                                </div>

                                {saving > 0 && (
                                    <div className="mt-4 flex w-fit items-center gap-2 border-2 border-green-700 bg-green-100 px-3 py-1 font-bold text-green-800">
                                        <Sparkles className="h-4 w-4" /> Hemat {rupiah(saving)}
                                    </div>
                                )}

                                <div className="my-6 flex-1 space-y-3">
                                    {features.map((feature) => (
                                        <div key={feature} className="flex items-start gap-2 font-semibold text-gray-700">
                                            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                                            <span>{feature}</span>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={() => handleBuy(pkg.code)}
                                    className={cn(
                                        'flex w-full items-center justify-center gap-2 border-2 border-gray-900 py-3 text-lg font-black shadow-[4px_4px_0_0_#111] transition hover:translate-x-1 hover:translate-y-1 hover:shadow-none',
                                        bestSeller ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700'
                                    )}
                                >
                                    <Zap className="h-5 w-5" /> Pilih Paket
                                </button>
                            </article>
                        )
                    })}
                </div>
            )}

            <div className="mx-auto mt-14 flex max-w-3xl items-start gap-3 border-2 border-gray-900 bg-green-50 p-5 shadow-[5px_5px_0_0_#111]">
                <ShieldCheck className="h-7 w-7 shrink-0 text-green-700" />
                <div>
                    <h3 className="font-black text-gray-900">Pembayaran diverifikasi server-side</h3>
                    <p className="mt-1 text-sm font-semibold text-gray-600">
                        Token hanya masuk melalui webhook/status Midtrans yang valid dan fulfillment bersifat idempotent, jadi callback ganda tidak menggandakan token.
                    </p>
                </div>
            </div>
        </div>
    )
}
