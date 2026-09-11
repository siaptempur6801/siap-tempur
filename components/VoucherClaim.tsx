'use client'

import { useState } from 'react'
import { Loader2, Tag, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { claimVoucherCode } from '@/app/actions/profile'

interface VoucherClaimProps {
    onSuccessClaim?: () => void
    isTka?: boolean
}

export default function VoucherClaim({ onSuccessClaim, isTka = false }: VoucherClaimProps) {
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
        <div className={isTka ? 'rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4' : 'bg-white border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 space-y-4'}>
            {/* Header */}
            <div className="flex items-center gap-2.5">
                <div className={isTka ? 'flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 shadow-2xs' : 'text-blue-600'}>
                    <Tag size={18} />
                </div>
                <div>
                    <h3 className={isTka ? 'text-base font-bold text-slate-900' : 'font-handwriting text-xl font-bold text-gray-900'}>
                        Klaim Voucher
                    </h3>
                    <p className={isTka ? 'text-xs text-slate-500 font-medium' : 'font-handwriting text-gray-500 text-sm'}>
                        Masukkan kode voucher untuk mendapatkan token tryout gratis.
                    </p>
                </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="CONTOH: GRATIS2026"
                    disabled={loading}
                    className={isTka
                        ? 'flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold tracking-widest text-slate-900 placeholder:text-slate-400 placeholder:font-normal placeholder:tracking-normal focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed transition'
                        : 'flex-1 border-2 border-gray-900 bg-[#fdfbf7] px-4 py-2.5 text-gray-900 placeholder-gray-400 font-handwriting text-base tracking-widest uppercase focus:border-blue-600 focus:outline-none focus:ring-0 disabled:opacity-50 disabled:cursor-not-allowed transition'}
                />

                <button
                    type="submit"
                    disabled={loading}
                    className={isTka
                        ? 'inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 text-xs font-bold text-white shadow-xs transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap'
                        : 'flex items-center justify-center gap-2 bg-gray-900 px-5 py-2.5 text-base font-bold font-handwriting text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition-all border-2 border-transparent shadow-[3px_3px_0px_0px_rgba(0,0,0,0.4)] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap'}
                >
                    {loading ? (
                        <>
                            <Loader2 className="animate-spin" size={16} />
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
