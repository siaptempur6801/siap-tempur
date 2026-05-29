import fs from 'node:fs';
import path from 'node:path';

// Map of: [oldText, newText, caseInsensitive?]
// We do exact replacements to avoid breaking code logic
const replacements = [
    // Indonesian UI text
    ['latihan soal cpns', 'tryout soal cpns', true],
    ['Latihan simulasi', 'Tryout simulasi', false],
    ['latihan dari HP', 'tryout dari HP', false],
    ['3-5x latihan', '3-5x tryout', false],
    ['latihan rutin', 'tryout rutin', false],
    ['latihan soal dan', 'tryout soal dan', false],
    ['Latihan soal dan', 'Tryout soal dan', false],
    ['latihan soal yang konsisten', 'tryout soal yang konsisten', false],
    ['pelajari pembahasan', 'pelajari pembahasan', false], // keep
    ['Perbanyak latihan soal', 'Perbanyak tryout soal', false],
    ['konsistensi latihanmu', 'konsistensi tryout-mu', false],
    ['latihan soal', 'tryout soal', true],
    ['Latihan soal', 'Tryout soal', false],
    ['Latihan Soal', 'Tryout Soal', false],
    ['latihan — salah', 'tryout — salah', false],
    ['Latihan Tiap Minggu', 'Tryout Tiap Minggu', false],
    ['Mulai Latihan', 'Mulai Tryout', false],
    ['mulai latihan', 'mulai tryout', false],
    ['latihan hari ini', 'tryout hari ini', false],
    ['Lunas & Latihan', 'Lunas & Tryout', false],
    ['Tryout atau Latihan Soal', 'Tryout atau Tryout Soal', false],
    ['untuk latihan!', 'untuk tryout!', false],
    ['Latihan TWK', 'Tryout TWK', false],
    ['Latihan TIU', 'Tryout TIU', false],
    ['Latihan TKP', 'Tryout TKP', false],
    ['Latihan SKD', 'Tryout SKD', false],
    ['TKP butuh latihan lebih', 'TKP butuh tryout lebih', false],
    ['Jaga konsistensi dengan latihan rutin', 'Jaga konsistensi dengan tryout rutin', false],
    ['Latihan sebelum tidur', 'Tryout sebelum tidur', false],
    ["'Latihan sebelum tidur", "'Tryout sebelum tidur", false],
    ['Ahli Latihan', 'Ahli Tryout', false],
    ['Latihan Tiap Minggu', 'Tryout Tiap Minggu', false],
    ['data riwayat latihan', 'data riwayat tryout', false],
    ['riwayat latihan', 'riwayat tryout', false],
    ["'Latihan " + '${types[0]}`', "'Tryout " + '${types[0]}`', false],
    ["return 'Latihan Soal'", "return 'Tryout Soal'", false],
    ["return `Latihan ", "return `Tryout ", false],
    ['Latihan ${', 'Tryout ${', false],
    ['latihan ${', 'tryout ${', false],
    ['Paket Latihan', 'Paket Tryout', false],
    ['materi latihan terbaik', 'materi tryout terbaik', false],
    ['Hasil latihan', 'Hasil tryout', false],
    ['Data Aktivitas Latihan', 'Data Aktivitas Tryout', false],
    ['.replace(\'Materi\', \'Latihan\')', ".replace('Materi', 'Tryout')", false],
    ["replace('Materi', 'Latihan')", "replace('Materi', 'Tryout')", false],
    ['Latihan ', 'Tryout ', false],
    [' latihan', ' tryout', false],
    ['latihan.', 'tryout.', false],
    ['latihan,', 'tryout,', false],
    ['latihan!', 'tryout!', false],
    // Comment in code
    ['/* Main CTA: Latihan */', '/* Main CTA: Tryout */', false],
    [': \'Mulai Latihan\'', ': \'Mulai Tryout\'', false],
];

const files = [
    'lib/data/landing.ts',
    'lib/dashboard.ts',
    'lib/constants.ts',
    'app/layout.tsx',
    'app/cpns/page.tsx',
    'app/cpns/dashboard/riwayat/page.tsx',
    'app/cpns/dashboard/riwayat/loading.tsx',
    'app/cpns/dashboard/tryout/[sessionId]/result/page.tsx',
    'app/cpns/dashboard/tryout/PracticeClient.tsx',
    'components/profile/HistoryTab.tsx',
    'components/home/LandingUI.tsx',
    'components/dashboard/DashboardClient.tsx',
    'components/dashboard/BeliPaketClient.tsx',
    'app/(legal)/syarat-ketentuan/page.tsx',
    'app/(legal)/kebijakan-privasi/page.tsx',
    'app/(legal)/kebijakan-pengembalian/page.tsx',
];

let totalChanges = 0;

for (const f of files) {
    const fullPath = path.join(process.cwd(), f);
    if (!fs.existsSync(fullPath)) {
        console.log(`SKIP (not found): ${f}`);
        continue;
    }

    let content = fs.readFileSync(fullPath, 'utf8');
    let changed = false;

    for (const [from, to, caseInsensitive] of replacements) {
        if (caseInsensitive) {
            const regex = new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
            const newContent = content.replace(regex, to);
            if (newContent !== content) { content = newContent; changed = true; }
        } else {
            while (content.includes(from)) {
                content = content.replace(from, to);
                changed = true;
            }
        }
    }

    if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated: ${f}`);
        totalChanges++;
    } else {
        console.log(`No changes: ${f}`);
    }
}

console.log(`\nDone. ${totalChanges} files updated.`);
