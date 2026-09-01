'use client'

import { useState } from 'react'
import { forgotPassword } from '@/app/auth/actions'
import { Loader2, Mail } from 'lucide-react'
import { toast } from 'sonner'

export default function ForgotPasswordForm() {
    const [loading, setLoading] = useState(false)
    const [sent, setSent] = useState(false)

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setLoading(true)
        const formData = new FormData(event.currentTarget)

        try {
            const result = await forgotPassword(formData)
            if (result?.error) {
                toast.error(result.error)
            } else {
                setSent(true)
                toast.success('Email reset sudah dikirim', {
                    description: 'Cek kotak masuk atau folder spam email kamu.',
                })
            }
        } catch {
            toast.error('Email reset belum bisa dikirim', { description: 'Coba lagi beberapa saat.' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <section className="st-card-lg relative w-full max-w-lg bg-white p-6 md:p-8" aria-labelledby="forgot-title">
            <div className="absolute -top-3 left-1/2 h-7 w-28 -translate-x-1/2 -rotate-2 border-x border-white/60 bg-[var(--st-yellow)]/80" aria-hidden="true" />

            <div>
                <div className="st-kicker">Pulihkan akun</div>
                <h1 id="forgot-title" className="st-heading-display mt-4 text-4xl md:text-5xl">Lupa kata sandi?</h1>
                <p className="st-muted mt-2 font-semibold">
                    {sent ? 'Tautan reset sudah dikirim ke email kamu.' : 'Masukkan email yang terdaftar. Kami akan mengirim tautan untuk membuat kata sandi baru.'}
                </p>
            </div>

            {sent ? (
                <div className="mt-7 space-y-5">
                    <div className="border-2 border-[var(--st-ink)] bg-green-50 p-5 text-center" role="status">
                        <Mail className="mx-auto h-10 w-10 text-green-700" />
                        <h2 className="mt-3 font-black">Periksa email kamu.</h2>
                        <p className="st-muted mt-1 text-sm font-semibold leading-relaxed">Buka tautan pada email reset untuk membuat kata sandi baru. Cek folder spam jika email belum terlihat.</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setSent(false)}
                        className="st-focus inline-flex min-h-11 items-center font-black text-blue-700 hover:underline"
                    >
                        Kirim ulang email reset
                    </button>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="mt-7 space-y-5">
                    <div>
                        <label htmlFor="forgot-email-address" className="mb-1.5 block text-sm font-black">Alamat email</label>
                        <input
                            id="forgot-email-address"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            className="st-input"
                            placeholder="nama@email.com"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="st-button inline-flex min-h-12 w-full items-center justify-center gap-2 bg-blue-600 px-5 py-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {loading && <Loader2 className="animate-spin" size={19} />}
                        {loading ? 'Mengirim...' : 'Kirim tautan reset'}
                    </button>
                </form>
            )}
        </section>
    )
}
