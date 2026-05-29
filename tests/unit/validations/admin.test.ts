import { describe, it, expect } from 'vitest';
import { QuestionFormSchema, VoucherFormSchema, TryoutEventFormSchema } from '../../../lib/validations/admin';

describe('Admin Validations (Zod Schemas)', () => {

  describe('QuestionFormSchema', () => {
    it('should reject invalid correct answers', () => {
      const invalidData = {
        type: 'TWK',
        content: 'Siapa presiden pertama RI?',
        category: 'Sejarah',
        explanation: 'Soekarno adalah presiden pertama',
        correctAnswer: 'X', // Invalid
      };

      const result = QuestionFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const errorPaths = result.error.issues.map(issue => issue.path[0]);
        expect(errorPaths).toContain('correctAnswer');
      }
    });

    it('should accept valid correct answers (A-E)', () => {
      const validData = {
        type: 'TWK',
        content: 'Siapa presiden pertama RI?',
        category: 'Sejarah',
        explanation: 'Soekarno adalah presiden pertama',
        correctAnswer: 'A', // Valid
      };

      const result = QuestionFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('VoucherFormSchema', () => {
    it('should reject quota less than 1', () => {
      const invalidData = {
        code: 'DISKON100',
        quota_amount: 10,
        max_uses: 0, // Invalid: must be >= 1
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        is_active: true,
      };

      const result = VoucherFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const errorPaths = result.error.issues.map(issue => issue.path[0]);
        expect(errorPaths).toContain('max_uses');
      }
    });

    it('should accept valid voucher configuration', () => {
      const validData = {
        code: 'DISKON100',
        quota_amount: 10,
        max_uses: 50,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        is_active: true,
      };

      const result = VoucherFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('TryoutEventFormSchema', () => {
    it('should accept valid start and end dates', () => {
      const validData = {
        title: 'Tryout Akbar Nasional',
        description: 'Simulasi akbar bulan ini',
        starts_at: new Date('2026-06-01T00:00:00Z').toISOString(),
        ends_at: new Date('2026-06-05T00:00:00Z').toISOString(), // Valid: after start
        start_grace_minutes: 15,
        duration_minutes: 120,
        requires_code: false,
      };

      const result = TryoutEventFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject when ends_at is before starts_at', () => {
      const invalidData = {
        title: 'Tryout Akbar Nasional',
        description: 'Simulasi',
        starts_at: new Date('2026-06-05T00:00:00Z').toISOString(),
        ends_at: new Date('2026-06-01T00:00:00Z').toISOString(), // Invalid: before starts_at
        start_grace_minutes: 15,
        duration_minutes: 120,
        requires_code: false,
      };

      const result = TryoutEventFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const errorPaths = result.error.issues.map(issue => issue.path[0]);
        expect(errorPaths).toContain('ends_at');
      }
    });
  });
});
