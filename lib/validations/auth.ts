import * as z from 'zod'
import { AGE_BASES, CONSENT_MESSAGES } from '@/lib/consent'

export const loginSchema = z.object({
  email: z.string().min(1, 'Email wajib diisi').email('Format email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
})

export const registerSchema = z.object({
  email: z.string().min(1, 'Email wajib diisi').email('Format email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
  fullName: z
    .string()
    .min(3, 'Nama lengkap minimal 3 karakter')
    .max(100, 'Nama lengkap maksimal 100 karakter'),
})

/** Persetujuan S&K + privasi + keterangan usia; aturan identik dengan `consentFieldErrors`. */
export const consentSchema = z.object({
  acceptTerms: z.literal('true', { message: CONSENT_MESSAGES.acceptTerms }),
  ageBasis: z.enum(AGE_BASES, { message: CONSENT_MESSAGES.ageBasis }),
})
