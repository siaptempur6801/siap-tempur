'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { resetPassword } from '@/app/auth/actions'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { acquireSingleFlightLock, releaseSingleFlightLock } from '@/lib/single-flight-lock'

export default function ResetPasswordForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const submitLockRef = useRef(false)
  const router = useRouter()

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!acquireSingleFlightLock(submitLockRef)) return
    setLoading(true)
    const formData = new FormData(event.currentTarget)

    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (password !== confirmPassword) {
      toast.error('Password tidak cocok', {
        description: 'Pastikan password baru dan konfirmasi password sama.',
      })
      releaseSingleFlightLock(submitLockRef)
      setLoading(false)
      return
    }

    let isNavigating = false
    try {
      const result = await resetPassword(formData)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success('Password Berhasil Diubah!', {
          description: 'Silakan login kembali dengan password baru Anda.',
        })
        router.push('/login')
        isNavigating = true
      }
    } catch {
      toast.error('Gagal mengubah password')
    } finally {
      if (!isNavigating) {
        releaseSingleFlightLock(submitLockRef)
        setLoading(false)
      }
    }
  }

  return (
    <div className="st-card-lg relative z-10 w-full max-w-lg space-y-6 bg-card p-6 sm:p-8">
      {/* Tape Effect */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-32 h-8 bg-green-100/80 border-l border-r border-white/50 shadow-sm -rotate-2"></div>

      <div className="text-center">
        <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl">
          Buat Password Baru
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
          Masukkan password baru untuk akun Anda.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Field Password Baru */}
        <div>
          <label htmlFor="password" className="mb-2 block text-sm font-semibold text-foreground">
            Password Baru
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              minLength={8}
              className="st-input !pr-14 text-base placeholder:text-sm placeholder:font-normal placeholder:text-muted-foreground"
              aria-describedby="new-password-hint"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Sembunyikan password baru' : 'Tampilkan password baru'}
              className="st-focus absolute right-1 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {showPassword ? <EyeOff size={24} /> : <Eye size={24} />}
            </button>
          </div>
          <p id="new-password-hint" className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Password Baru (Min. 8 karakter)
          </p>
        </div>

        {/* Field Konfirmasi Password Baru */}
        <div>
          <label
            htmlFor="confirmPassword"
            className="mb-2 block text-sm font-semibold text-foreground"
          >
            Konfirmasi Password Baru
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              minLength={8}
              className="st-input !pr-14 text-base placeholder:text-sm placeholder:font-normal placeholder:text-muted-foreground"
              placeholder="Ulangi Password Baru"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              aria-label={
                showConfirmPassword
                  ? 'Sembunyikan konfirmasi password'
                  : 'Tampilkan konfirmasi password'
              }
              className="st-focus absolute right-1 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {showConfirmPassword ? <EyeOff size={24} /> : <Eye size={24} />}
            </button>
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={loading}
            className="st-button st-focus flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed"
          >
            {loading && <Loader2 className="animate-spin" size={24} />}
            {loading ? 'Menyimpan...' : 'Simpan Password'}
          </button>
        </div>
      </form>
    </div>
  )
}
