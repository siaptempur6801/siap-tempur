'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signup } from '@/app/auth/actions'
import { ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Patrick_Hand, Work_Sans } from "next/font/google";

// 1. Setup Font
const handwriting = Patrick_Hand({
    subsets: ["latin"],
    weight: "400",
    variable: "--font-handwriting"
});

const bodyFont = Work_Sans({
    subsets: ["latin"],
    variable: "--font-body"
});

// Komponen Garis Kertas (Background)
function PaperBackground() {
    return (
        <div className="absolute inset-0 pointer-events-none z-0 opacity-30"
            style={{
                backgroundImage: "repeating-linear-gradient(transparent, transparent 1.9rem, #9ca3af 2rem)",
                backgroundSize: "100% 2rem",
                marginTop: "2rem"
            }}>
            {/* Garis Margin Merah Kiri */}
            <div className="absolute left-8 md:left-24 top-0 bottom-0 w-[2px] bg-red-300/50"></div>
        </div>
    );
}

export default function RegisterPage() {
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setLoading(true)
        const formData = new FormData(event.currentTarget)

        try {
            const result = await signup(formData)
            if (result?.error) {
                toast.error(result.error)
            } else {
                toast.success('Pendaftaran Berhasil!', {
                    description: 'Silakan cek email Anda untuk verifikasi atau masuk langsung.'
                })
                // For now redirect to dashboard, but typical flow checks email
                router.push('/dashboard')
            }
        } catch (error) {
            toast.error('Terjadi kesalahan saat pendaftaran')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className={`${handwriting.variable} ${bodyFont.variable} font-sans min-h-screen flex items-center justify-center p-6 bg-[#fdfbf7] relative overflow-hidden`}>
            <PaperBackground />

            <Link href="/" className="absolute top-6 left-6 flex items-center text-sm font-handwriting text-xl font-bold text-gray-800 hover:text-blue-600 transition z-20">
                <ArrowLeft className="w-5 h-5 mr-2" />
                Kembali
            </Link>

            <div className="w-full max-w-md space-y-8 relative z-10 bg-white p-8 border-2 border-gray-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-xl rotate-1">
                {/* Tape Effect */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-32 h-8 bg-pink-100/80 border-l border-r border-white/50 shadow-sm -rotate-2"></div>

                <div className="text-center">
                    <h2 className="font-handwriting text-4xl font-bold tracking-tight text-gray-900">Buat Akun Baru</h2>
                    <p className="mt-2 text-gray-600 font-handwriting text-xl">Mulai persiapan CPNS-mu hari ini.</p>
                </div>

                <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="fullName" className="sr-only">Nama Lengkap</label>
                            <input
                                id="fullName"
                                name="fullName"
                                type="text"
                                required
                                className="relative block w-full rounded-lg border-2 border-gray-900 bg-[#fdfbf7] px-4 py-3 text-gray-900 placeholder-gray-500 focus:border-blue-600 focus:outline-none focus:ring-0 sm:text-lg font-handwriting"
                                placeholder="Nama Lengkap"
                            />
                        </div>
                        <div>
                            <label htmlFor="email-address" className="sr-only">Email address</label>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="relative block w-full rounded-lg border-2 border-gray-900 bg-[#fdfbf7] px-4 py-3 text-gray-900 placeholder-gray-500 focus:border-blue-600 focus:outline-none focus:ring-0 sm:text-lg font-handwriting"
                                placeholder="Alamat Email"
                            />
                        </div>
                        <div className="relative">
                            <label htmlFor="password" className="sr-only">Password</label>
                            <input
                                id="password"
                                name="password"
                                type={showPassword ? "text" : "password"}
                                autoComplete="new-password"
                                required
                                className="relative block w-full rounded-lg border-2 border-gray-900 bg-[#fdfbf7] px-4 py-3 pr-12 text-gray-900 placeholder-gray-500 focus:border-blue-600 focus:outline-none focus:ring-0 sm:text-lg font-handwriting"
                                placeholder="Kata Sandi (Min. 6 karakter)"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-900 transition focus:outline-none"
                            >
                                {showPassword ? <EyeOff size={24} /> : <Eye size={24} />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative flex w-full justify-center items-center gap-2 rounded-lg bg-gray-900 px-4 py-3 text-xl font-bold font-handwriting text-white hover:bg-blue-600 hover:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition-all border-2 border-transparent shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading && <Loader2 className="animate-spin" size={24} />}
                            {loading ? 'Mendaftar...' : 'Daftar Sekarang'}
                        </button>
                    </div>
                </form>

                <div className="text-center text-lg font-handwriting">
                    <span className="text-gray-600">Sudah punya akun? </span>
                    <Link href="/login" className="font-bold text-blue-600 hover:underline decoration-wavy">
                        Masuk
                    </Link>
                </div>
            </div>
        </div>
    )
}
