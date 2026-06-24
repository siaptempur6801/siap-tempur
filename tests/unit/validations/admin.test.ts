import { describe, it, expect } from 'vitest';
import { ArticleFormSchema, ExcelQuestionSchema, QuestionFormSchema, VoucherFormSchema, TryoutEventFormSchema } from '../../../lib/validations/admin';

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

  describe('ExcelQuestionSchema', () => {
    const baseQuestion = {
      type: 'TWK',
      sub_category: 'Nasionalisme',
      content: 'Contoh soal',
      explanation: 'Contoh pembahasan',
      option_a: 'A',
      option_b: 'B',
      option_c: 'C',
      option_d: 'D',
      option_e: 'E',
      correct_answer: 'A',
    };

    it('should reject TKP import rows with score outside 1-5', () => {
      const result = ExcelQuestionSchema.safeParse({
        ...baseQuestion,
        type: 'TKP',
        correct_answer: 'E',
        score_a: 0,
        score_b: 2,
        score_c: 3,
        score_d: 4,
        score_e: 5,
      });

      expect(result.success).toBe(false);
    });

    it('should reject non-TKP import rows without a valid answer key', () => {
      const result = ExcelQuestionSchema.safeParse({
        ...baseQuestion,
        correct_answer: undefined,
      });

      expect(result.success).toBe(false);
    });
  });

  describe('ArticleFormSchema', () => {
    const article = {
      title: 'Strategi Belajar SKD CPNS',
      slug: 'strategi-belajar-skd-cpns',
      excerpt: 'Ringkasan artikel',
      content: 'Konten artikel yang cukup panjang untuk melewati validasi minimal.',
      category: 'Tips',
      cover_image_url: '',
    };

    it('should accept a valid article draft payload', () => {
      const result = ArticleFormSchema.safeParse(article);
      expect(result.success).toBe(true);
    });

    it('should reject unsafe slug formats', () => {
      const result = ArticleFormSchema.safeParse({
        ...article,
        slug: 'Strategi CPNS 2026!',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid cover URLs', () => {
      const result = ArticleFormSchema.safeParse({
        ...article,
        cover_image_url: 'not-a-url',
      });
      expect(result.success).toBe(false);
    });
  });
});
