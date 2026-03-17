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

/**
 * TOEFL Subject Metadata
 */
export const TOEFL_SUBJECTS = {
    LISTENING: {
        short: "LISTENING",
        name: "Listening Comprehension",
        fullMark: 68, // Scaled score
        passing: 45
    },
    STRUCTURE: {
        short: "STRUCTURE",
        name: "Structure & Written Expression",
        fullMark: 67, // Scaled score
        passing: 45
    },
    READING: {
        short: "READING",
        name: "Reading Comprehension",
        fullMark: 67, // Scaled score
        passing: 45
    }
} as const;

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
    { xp: 2500, level: 8, name: 'Ahli Latihan' },
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
            'Latihan Tiap Minggu',
            'Ranking Terupdate',
            'Hemat Rp 25.000!'
        ]
    }
] as const;

/**
 * Pricing Packages for TOEFL Tokens
 */
export const TOEFL_PRICING_PACKAGES = [
    {
        id: 'toefl-satuan',
        name: 'Paket TOEFL Perunggu',
        price: 15000,
        tokens: 1,
        bestSeller: false,
        savings: 0,
        description: '1 Token Tryout TOEFL ITP',
        features: [
            '140 Soal Standar ITP',
            'Sistem Scoring 310-677',
            'Audio Listening Jernih',
            'Pembahasan Lengkap'
        ]
    },
    {
        id: 'toefl-paket-5',
        name: 'Paket TOEFL Emas',
        price: 50000,
        tokens: 5,
        bestSeller: true,
        savings: 25000,
        description: '5 Token Tryout TOEFL ITP',
        features: [
            'Semua Fitur Simulasi',
            'Lebih Hemat Rp 25rb',
            'Review Skor Tak Terbatas',
            'Paket Recomended'
        ]
    }
] as const;
