import { z } from 'zod'

const nullableTrimmedString = (max: number, message: string) =>
  z.string()
    .max(max, message)
    .transform((value) => {
      const trimmed = value.trim()
      return trimmed.length > 0 ? trimmed : null
    })
    .optional()

const strongPassword = z.string()
  .min(10, 'Kata sandi minimal 10 karakter')
  .max(128, 'Kata sandi maksimal 128 karakter')
  .regex(/[a-z]/, 'Kata sandi harus mengandung huruf kecil')
  .regex(/[A-Z]/, 'Kata sandi harus mengandung huruf besar')
  .regex(/[0-9]/, 'Kata sandi harus mengandung angka')

export const profileInfoSchema = z.object({
  full_name: z.string()
    .trim()
    .min(2, 'Nama lengkap minimal 2 karakter')
    .max(100, 'Nama lengkap maksimal 100 karakter')
    .optional(),
  bio: nullableTrimmedString(500, 'Bio maksimal 500 karakter'),
  avatar_url: nullableTrimmedString(500, 'URL avatar maksimal 500 karakter').refine(
    (value) => !value || value.startsWith('http') || value.startsWith('/'),
    'URL avatar tidak valid'
  ),
  phone_number: nullableTrimmedString(30, 'Nomor HP maksimal 30 karakter').refine(
    (value) => !value || /^[0-9+\-\s()]+$/.test(value),
    'Nomor HP tidak valid'
  ),
  birth_date: nullableTrimmedString(10, 'Tanggal lahir tidak valid').refine((value) => {
    if (!value) return true
    const date = new Date(`${value}T00:00:00.000Z`)
    const earliestBirthDate = new Date('1900-01-01T00:00:00.000Z')
    return /^\d{4}-\d{2}-\d{2}$/.test(value)
      && !Number.isNaN(date.getTime())
      && date.getTime() >= earliestBirthDate.getTime()
      && date.getTime() <= Date.now()
  }, 'Tanggal lahir tidak valid'),
  gender: z.enum(['male', 'female', 'other', 'Laki-laki', 'Perempuan', '']).optional().transform((value) => {
    if (!value) return null
    if (value === 'Laki-laki') return 'male'
    if (value === 'Perempuan') return 'female'
    return value
  }),
  education_level: nullableTrimmedString(80, 'Pendidikan maksimal 80 karakter'),
  target_instance: nullableTrimmedString(120, 'Target instansi maksimal 120 karakter'),
})

export const passwordUpdateSchema = z.object({
  newPassword: strongPassword,
})

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Kata sandi saat ini wajib diisi'),
  newPassword: strongPassword,
}).refine(
  ({ currentPassword, newPassword }) => currentPassword !== newPassword,
  { path: ['newPassword'], message: 'Kata sandi baru harus berbeda dari kata sandi saat ini' }
)

export type ProfileInfoInput = z.input<typeof profileInfoSchema>
