'use client'

import { useState } from 'react'
import { Loader2, Tag, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { claimVoucherCode } from '@/app/actions/profile'

interface VoucherClaimProps {
    onSuccessClaim?: () => void
}

export default function VoucherClaim({ onSuccessClaim }: VoucherClaimProps) {
    const [code, setCode] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()

        if (!code.trim()) {
            toast.error('Masukkan kode voucher terlebih dahulu')
            return
        }

        setLoading(true)

        try {
            const result = await claimVoucherCode(code)

            if (!result.success) {
                toast.error(result.message || 'Gagal mengklaim voucher')
                return
            }

            toast.success(result.message || 'Voucher berhasil diklaim!', {
                description: 'Token gratis sudah ditambahkan ke akun Anda.',
                icon: <CheckCircle2 className="text-green-500" size={18} />,
            })

            setCode('')
            onSuccessClaim?.()
        } catch {
            toast.error('Terjadi kesalahan. Silakan coba lagi.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="bg-white border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2">
                <Tag size={20} className="text-blue-600" />
                <h3 className="font-handwriting text-xl font-bold text-gray-900">
                    Klaim Voucher
                </h3>
            </div>

            <p className="font-handwriting text-gray-500 text-sm">
                Masukkan kode voucher untuk mendapatkan token tryout gratis.
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="CONTOH: GRATIS2026"
                    disabled={loading}
                    className="flex-1 border-2 border-gray-900 bg-[#fdfbf7] px-4 py-2.5 text-gray-900 placeholder-gray-400 font-handwriting text-base tracking-widest uppercase focus:border-blue-600 focus:outline-none focus:ring-0 disabled:opacity-50 disabled:cursor-not-allowed transition"
                />

                <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center justify-center gap-2 bg-gray-900 px-5 py-2.5 text-base font-bold font-handwriting text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition-all border-2 border-transparent shadow-[3px_3px_0px_0px_rgba(0,0,0,0.4)] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                    {loading ? (
                        <>
                            <Loader2 className="animate-spin" size={18} />
                            Memproses...
                        </>
                    ) : (
                        'Klaim Voucher'
                    )}
                </button>
            </form>
        </div>
    )
}
