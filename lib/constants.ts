/**
 * SKD Passing Grades - Based on Kemenpan RB 2024
 */
export const PASSING_GRADES = {
    TWK: 65,
    TIU: 80,
    TKP: 166,
} as const;

/**
 * SKD Subject Metadata
 */
export const SUBJECTS = {
    TWK: {
        short: "TWK",
        name: "Tes Wawasan Kebangsaan",
        fullMark: 150, // 30 questions * 5
        passing: 65
    },
    TIU: {
        short: "TIU",
        name: "Tes Intelegensia Umum",
        fullMark: 175, // 35 questions * 5
        passing: 80
    },
    TKP: {
        short: "TKP",
        name: "Tes Karakteristik Pribadi",
        fullMark: 225, // 45 questions * 5 (Max score per question is 5)
        passing: 166
    }
} as const;

export const MINI_TRYOUT_TYPES = ['TWK', 'TIU', 'TKP'] as const;

export type MiniTryoutType = typeof MINI_TRYOUT_TYPES[number];

export const TRYOUT_TOKEN_COST = 1 as const;

type MiniTryoutProduct = {
    type: MiniTryoutType;
    title: string;
    subtitle: string;
    description: string;
    questionCount: number;
    maxScore: number;
    passingGrade: number;
    tokenCost: typeof TRYOUT_TOKEN_COST;
    color: 'red' | 'yellow' | 'blue';
    focusItems: readonly string[];
};

export const MINI_TRYOUT_PRODUCTS = [
    {
        type: 'TWK',
        title: 'Mini Tryout TWK',
        subtitle: SUBJECTS.TWK.name,
        description: 'Latihan terfokus pada nasionalisme, integritas, bela negara, pilar negara, dan kemampuan berbahasa Indonesia.',
        questionCount: SUBJECTS.TWK.fullMark / 5,
        maxScore: SUBJECTS.TWK.fullMark,
        passingGrade: SUBJECTS.TWK.passing,
        tokenCost: TRYOUT_TOKEN_COST,
        color: 'red',
        focusItems: ['Nasionalisme', 'Integritas', 'Bela Negara', 'Pilar Negara', 'Bahasa Negara'],
    },
    {
        type: 'TIU',
        title: 'Mini Tryout TIU',
        subtitle: SUBJECTS.TIU.name,
        description: 'Latihan kemampuan verbal, numerik, figural, logika, analitis, dan penyelesaian masalah.',
        questionCount: SUBJECTS.TIU.fullMark / 5,
        maxScore: SUBJECTS.TIU.fullMark,
        passingGrade: SUBJECTS.TIU.passing,
        tokenCost: TRYOUT_TOKEN_COST,
        color: 'yellow',
        focusItems: ['Verbal', 'Numerik', 'Figural', 'Logika', 'Analitis'],
    },
    {
        type: 'TKP',
        title: 'Mini Tryout TKP',
        subtitle: SUBJECTS.TKP.name,
        description: 'Latihan soal situasional terkait pelayanan publik, profesionalisme, jejaring kerja, sosial budaya, teknologi informasi, dan pengendalian diri.',
        questionCount: SUBJECTS.TKP.fullMark / 5,
        maxScore: SUBJECTS.TKP.fullMark,
        passingGrade: SUBJECTS.TKP.passing,
        tokenCost: TRYOUT_TOKEN_COST,
        color: 'blue',
        focusItems: ['Pelayanan Publik', 'Profesionalisme', 'Jejaring Kerja', 'Sosial Budaya', 'TIK'],
    },
] as const satisfies readonly MiniTryoutProduct[];

export function isMiniTryoutType(value: unknown): value is MiniTryoutType {
    return typeof value === 'string' && MINI_TRYOUT_TYPES.includes(value as MiniTryoutType);
}

export function getMiniTryoutProduct(value: unknown): MiniTryoutProduct | null {
    if (!isMiniTryoutType(value)) return null;
    return MINI_TRYOUT_PRODUCTS.find((product) => product.type === value) ?? null;
}

/**
 * User Leveling thresholds
 */
export const LEVEL_THRESHOLDS = [
    { xp: 0, level: 1, name: 'Calon Pejuang' },
    { xp: 100, level: 2, name: 'Pelajar Pemula' },
    { xp: 250, level: 3, name: 'Siswa Rajin' },
    { xp: 500, level: 4, name: 'Calon ASN' },
    { xp: 800, level: 5, name: 'Pejuang SKD' },
    { xp: 1200, level: 6, name: 'Warrior Muda' },
    { xp: 1800, level: 7, name: 'Rising Star' },
    { xp: 2500, level: 8, name: 'Ahli Tryout' },
    { xp: 3500, level: 9, name: 'Semi Pro' },
    { xp: 5000, level: 10, name: 'Pro Player' },
    { xp: 7000, level: 11, name: 'Elite Warrior' },
    { xp: 10000, level: 12, name: 'Master SKD' },
    { xp: 15000, level: 13, name: 'Grand Master' },
    { xp: 22000, level: 14, name: 'Legend SKD' },
    { xp: 30000, level: 15, name: 'Dewa ASN' },
] as const;

/**
 * Pricing Packages for Tryout Tokens
 */
export const PRICING_PACKAGES = [
    {
        id: 'skd-satuan',
        name: 'Paket Perintis',
        price: 10000,
        tokens: 1,
        bestSeller: false,
        savings: 0,
        description: '1 Token Tryout SKD CAT',
        features: [
            '110 Soal Prediksi',
            'Waktu 100 Menit',
            'CAT BKN Interface',
            'Pembahasan Lengkap'
        ]
    },
    {
        id: 'skd-paket-5',
        name: 'Paket Pejuang',
        price: 40000,
        tokens: 5,
        bestSeller: true,
        savings: 10000,
        description: '5 Token Tryout SKD CAT',
        features: [
            'Semua Fitur Tryout',
            'Lebih Hemat Rp 10rb',
            'Ranking Nasional',
            'Token Selamanya'
        ]
    },
    {
        id: 'skd-paket-10',
        name: 'Paket Pasukan',
        price: 75000,
        tokens: 10,
        bestSeller: false,
        savings: 25000,
        description: '10 Token Tryout SKD CAT',
        features: [
            'Persiapan Maksimal',
            'Tryout Tiap Minggu',
            'Ranking Terupdate',
            'Hemat Rp 25.000!'
        ]
    }
] as const;

