import { describe, expect, it } from 'vitest'
import { passwordChangeSchema, passwordUpdateSchema, profileInfoSchema } from '@/lib/validations/profile'

describe('Profile validations', () => {
  it('rejects overly long profile fields', () => {
    const result = profileInfoSchema.safeParse({
      full_name: 'A'.repeat(101),
      bio: 'B'.repeat(501),
      target_instance: 'C'.repeat(121),
    })

    expect(result.success).toBe(false)
  })

  it('normalizes optional empty profile values to null', () => {
    const result = profileInfoSchema.safeParse({
      full_name: '  Dirga  ',
      phone_number: '',
      birth_date: '',
      gender: '',
      education_level: '',
      target_instance: '',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.full_name).toBe('Dirga')
      expect(result.data.phone_number).toBeNull()
      expect(result.data.birth_date).toBeNull()
    }
  })

  it('requires a strong password shape', () => {
    expect(passwordUpdateSchema.safeParse({ newPassword: 'password123' }).success).toBe(false)
    expect(passwordUpdateSchema.safeParse({ newPassword: 'Password123' }).success).toBe(true)
  })

  it('rejects an empty name and an implausible birth date', () => {
    expect(profileInfoSchema.safeParse({ full_name: ' ' }).success).toBe(false)
    expect(profileInfoSchema.safeParse({ birth_date: '1899-12-31' }).success).toBe(false)
  })

  it('requires the current password and a different strong new password', () => {
    expect(passwordChangeSchema.safeParse({ currentPassword: '', newPassword: 'Password123' }).success).toBe(false)
    expect(passwordChangeSchema.safeParse({ currentPassword: 'Password123', newPassword: 'Password123' }).success).toBe(false)
    expect(passwordChangeSchema.safeParse({ currentPassword: 'Password123', newPassword: 'NewPassword456' }).success).toBe(true)
  })
})
