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
    group_link: z.string().url('Link group tidak valid').nullable().optional().or(z.literal('')),
    flyer_image_url: z.string().url('URL flyer tidak valid').nullable().optional().or(z.literal('')),
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

const optionalText = z.string().optional().nullable().transform((value) => value?.trim() || '')
const optionText = z.string().optional().nullable().transform((value) => value?.trim() || '')
const scoreValue = z.coerce.number().int()

export const ExcelQuestionSchema = z.object({
    type: z.enum(['TWK', 'TIU', 'TKP']),
    sub_category: z.string().min(1, 'Sub-kategori wajib diisi').transform((value) => value.trim()),
    content: z.string().min(1, 'Pertanyaan wajib diisi').transform((value) => value.trim()),
    explanation: z.string().min(1, 'Pembahasan wajib diisi').transform((value) => value.trim()),
    image_url: optionalText,
    option_a: optionText,
    option_a_image_url: optionalText,
    option_b: optionText,
    option_b_image_url: optionalText,
    option_c: optionText,
    option_c_image_url: optionalText,
    option_d: optionText,
    option_d_image_url: optionalText,
    option_e: optionText,
    option_e_image_url: optionalText,
    correct_answer: z.enum(['A', 'B', 'C', 'D', 'E']).optional(),
    score_a: scoreValue.optional(),
    score_b: scoreValue.optional(),
    score_c: scoreValue.optional(),
    score_d: scoreValue.optional(),
    score_e: scoreValue.optional(),
}).superRefine((data, ctx) => {
    const optionKeys = ['a', 'b', 'c', 'd', 'e'] as const
    for (const key of optionKeys) {
        const content = data[`option_${key}`]
        const imageUrl = data[`option_${key}_image_url`]
        if (!content && !imageUrl) {
            ctx.addIssue({
                code: 'custom',
                path: [`option_${key}`],
                message: `Pilihan ${key.toUpperCase()} harus punya teks atau gambar`,
            })
        }
    }

    if (data.type !== 'TKP' && !data.correct_answer) {
        ctx.addIssue({
            code: 'custom',
            path: ['correct_answer'],
            message: 'Kunci jawaban wajib diisi untuk TWK/TIU',
        })
    }

    if (data.type === 'TKP') {
        for (const key of optionKeys) {
            const score = data[`score_${key}`]
            if (score === undefined || !Number.isInteger(score) || score < 1 || score > 5) {
                ctx.addIssue({
                    code: 'custom',
                    path: [`score_${key}`],
                    message: `Poin pilihan ${key.toUpperCase()} harus 1 sampai 5`,
                })
            }
        }
    }
})

export const ExcelQuestionsSchema = z.array(ExcelQuestionSchema).max(1000, 'Maksimal import 1000 soal per batch')
