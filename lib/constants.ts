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
