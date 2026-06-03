import { describe, expect, it } from 'vitest'
import { passwordUpdateSchema, profileInfoSchema } from '@/lib/validations/profile'

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
})
