import { z } from 'zod';

export const QuestionFormSchema = z.object({
    type: z.enum(['TWK', 'TIU', 'TKP']),
    content: z.string().min(1, 'Pertanyaan wajib diisi'),
    category: z.string().min(1, 'Materi wajib dipilih'),
    explanation: z.string().min(1, 'Pembahasan wajib diisi'),
    correctAnswer: z.enum(['A', 'B', 'C', 'D', 'E'], {
        message: 'Kunci jawaban tidak valid'
    }),
    imageUrl: z.string().optional().nullable(),
});

export const VoucherFormSchema = z.object({
    code: z.string().min(1, 'Kode voucher wajib diisi').toUpperCase(),
    quota_amount: z.number().int().min(1, 'Jumlah token harus minimal 1'),
    max_uses: z.number().int().min(1, 'Maksimal penggunaan harus minimal 1'),
    expires_at: z.string().optional().nullable(),
    is_active: z.boolean(),
});

export const TryoutEventFormSchema = z.object({
    title: z.string().min(1, 'Nama event wajib diisi'),
    description: z.string().optional().nullable(),
    starts_at: z.string().min(1, 'Jadwal mulai wajib diisi'),
    ends_at: z.string().min(1, 'Jadwal tutup wajib diisi'),
    start_grace_minutes: z.number().int().min(0, 'Start window tidak valid'),
    duration_minutes: z.number().int().min(1, 'Durasi tidak valid'),
    max_participants: z.number().int().min(1, 'Max peserta tidak valid').nullable().optional(),
    requires_code: z.boolean(),
    is_paid: z.boolean().default(false),
    price: z.number().int().min(0, 'Harga tidak valid').default(0),
    result_visible_at: z.string().nullable().optional(),
    explanation_visible_at: z.string().nullable().optional(),
}).refine(data => new Date(data.ends_at).getTime() > new Date(data.starts_at).getTime(), {
    message: 'Jadwal tutup harus setelah jadwal mulai',
    path: ['ends_at'],
});

export const TryoutEventCodeSchema = z.object({
    code: z.string()
        .min(4, 'Kode minimal 4 karakter')
        .max(32, 'Kode maksimal 32 karakter')
        .regex(/^[A-Z0-9-]+$/, 'Kode hanya boleh huruf, angka, strip, minimal 4 karakter')
        .toUpperCase(),
    max_uses: z.number().int().min(1, 'Limit penggunaan kode tidak valid'),
    expires_at: z.string().optional().nullable(),
});
