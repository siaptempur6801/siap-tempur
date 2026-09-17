import {
    BarChart3,
    BookOpenCheck,
    BrainCircuit,
    ClipboardCheck,
    GraduationCap,
    Layers3,
    RotateCcw,
    ShieldCheck,
    Sparkles,
    Target,
    Timer,
    Trophy,
    Users,
    Zap,
} from 'lucide-react'

/**
 * Konten landing page utama (`/`).
 *
 * Dipisah dari komponen presentasional supaya copywriting mudah ditinjau dan diuji, dan supaya
 * halaman tetap ringkas. Aturan nada bahasa: hangat, memotivasi, **tanpa klaim hasil/kelulusan**
 * (lihat `docs/PRODUCT_LANGUAGE_GUIDE_V1_1.md`).
 */

export const productCards = [
    {
        code: 'CPNS / SKD',
        badge: 'Untuk yang mengejar CPNS',
        title: 'SiapTempur CPNS',
        description: 'Persiapan SKD untuk TWK, TIU, dan TKP — dari latihan pertama sampai evaluasi hasil, tanpa bingung harus mulai dari mana.',
        href: '/cpns',
        cta: 'Lihat program CPNS',
        icon: Target,
        surface: 'bg-[var(--st-blue-soft)]',
        stickerTone: 'blue' as const,
        topics: ['TWK', 'TIU', 'TKP'],
        features: ['Drill per materi', 'Mini & Full Tryout', 'Rapor & remedial'],
    },
    {
        code: 'TKA / SD · SMP · SMA',
        badge: 'Untuk siswa sekolah',
        title: 'SiapTempur TKA',
        description: 'Persiapan TKA per jenjang dengan latihan, tryout, pembahasan, analisis hasil, dan fokus belajar berikutnya.',
        href: '/tka',
        cta: 'Lihat program TKA',
        icon: GraduationCap,
        surface: 'bg-[var(--st-green-soft)]',
        stickerTone: 'green' as const,
        topics: ['TKA SD', 'TKA SMP', 'TKA SMA'],
        features: ['Drill per kompetensi', 'Mini & Full Tryout', 'Pembahasan & remedial'],
    },
] as const

/** Empat hal yang langsung terasa begitu kamu mulai. */
export const benefitCards = [
    {
        icon: Sparkles,
        title: 'Mulai tanpa bingung',
        text: 'Tes diagnostik memetakan kemampuan awalmu, lalu menunjuk langkah pertama.',
        surface: 'bg-[var(--st-blue-soft)]',
    },
    {
        icon: Timer,
        title: 'Bisa dicicil 10 menit',
        text: 'Drill dan mini tryout cukup singkat untuk disisipkan di sela waktu luang.',
        surface: 'bg-[var(--st-yellow-soft)]',
    },
    {
        icon: BarChart3,
        title: 'Hasil yang bisa dibaca',
        text: 'Lihat bagian kuat dan lemah per materi, bukan cuma satu angka skor.',
        surface: 'bg-[var(--st-green-soft)]',
    },
    {
        icon: RotateCcw,
        title: 'Salah jadi bahan latihan',
        text: 'Soal yang belum tepat bisa diulang lewat fokus belajar dan remedial.',
        surface: 'bg-[var(--brand-peach-100)]',
    },
] as const

export const audienceCards = [
    {
        title: 'Baru mulai persiapan',
        text: 'Kamu butuh jalur yang jelas untuk tahu harus mulai dari mana dan apa yang perlu diprioritaskan.',
        icon: Target,
        sticker: 'Mulai dari nol',
        tone: 'blue' as const,
    },
    {
        title: 'Sering tryout, skor terasa stagnan',
        text: 'Kamu sudah banyak mengerjakan soal, tapi belum punya pola perbaikan setelah melihat hasil.',
        icon: BarChart3,
        sticker: 'Butuh arah',
        tone: 'amber' as const,
    },
    {
        title: 'Sudah tahu kelemahan, bingung latihan apa',
        text: 'Kamu ingin langsung kembali ke materi atau kompetensi yang memang masih perlu dikuatkan.',
        icon: BrainCircuit,
        sticker: 'Siap drill',
        tone: 'green' as const,
    },
] as const

export const learningSteps = [
    {
        number: '01',
        title: 'Kerjakan latihan atau tryout',
        text: 'Mulai dari drill, mini tryout, atau full tryout sesuai tujuanmu.',
        icon: ClipboardCheck,
        surface: 'bg-[var(--st-blue-soft)]',
    },
    {
        number: '02',
        title: 'Buka hasil dan pembahasan',
        text: 'Jangan berhenti di angka. Lihat bagian yang sudah kuat dan yang masih perlu perhatian.',
        icon: BarChart3,
        surface: 'bg-[var(--st-yellow-soft)]',
    },
    {
        number: '03',
        title: 'Temukan fokus berikutnya',
        text: 'Gunakan hasil untuk menentukan materi, kompetensi, atau soal yang sebaiknya kamu ulang.',
        icon: BrainCircuit,
        surface: 'bg-[var(--st-green-soft)]',
    },
    {
        number: '04',
        title: 'Drill, remedial, lalu ukur lagi',
        text: 'Perbaiki bagian yang lemah dan kembali mengukur perkembanganmu dengan sesi berikutnya.',
        icon: RotateCcw,
        surface: 'bg-white',
    },
] as const

export const featureCards = [
    {
        icon: Layers3,
        title: 'Drill terarah',
        description: 'Latih bagian yang lebih spesifik ketika kamu sudah tahu area yang perlu diperbaiki.',
        surface: 'bg-[var(--st-blue-soft)]',
    },
    {
        icon: Zap,
        title: 'Mini Tryout',
        description: 'Ukur bagian tertentu dengan sesi yang lebih ringkas sebelum masuk ke simulasi penuh.',
        surface: 'bg-[var(--st-yellow-soft)]',
    },
    {
        icon: ClipboardCheck,
        title: 'Full Tryout',
        description: 'Simulasikan ujian lebih lengkap untuk melihat kesiapanmu secara menyeluruh.',
        surface: 'bg-[var(--st-green-soft)]',
    },
    {
        icon: BookOpenCheck,
        title: 'Pembahasan soal',
        description: 'Pelajari kembali jawaban agar kesalahan tidak hanya tercatat, tetapi benar-benar dipahami.',
        surface: 'bg-[var(--brand-peach-100)]',
    },
    {
        icon: BarChart3,
        title: 'Rapor & analisis',
        description: 'Baca hasil dengan lebih jelas untuk mengenali bagian kuat, lemah, dan fokus belajar berikutnya.',
        surface: 'bg-[var(--st-blue-soft)]',
    },
    {
        icon: RotateCcw,
        title: 'Soal salah & remedial',
        description: 'Kembali ke bagian yang belum tuntas agar proses belajar terus bergerak, bukan berhenti di skor.',
        surface: 'bg-[var(--st-yellow-soft)]',
    },
] as const

/** Langkah super singkat untuk mulai — menurunkan keraguan sebelum mendaftar. */
export const quickStartSteps = [
    { number: '1', title: 'Bikin akun', text: 'Cukup email dan kata sandi. Gratis.' },
    { number: '2', title: 'Pilih jalur', text: 'CPNS, atau TKA sesuai jenjangmu.' },
    { number: '3', title: 'Kerjakan satu sesi', text: 'Mini tryout atau tes diagnostik dulu.' },
] as const

export const accountPoints = [
    { icon: ShieldCheck, title: 'Satu identitas akun', text: 'Login sekali untuk mengakses jalur yang tersedia.' },
    { icon: Trophy, title: 'Progres tetap rapi', text: 'Hasil dan aktivitas mengikuti jalur belajarmu.' },
    { icon: Target, title: 'Target tetap spesifik', text: 'CPNS dan TKA punya pengalaman belajar masing-masing.' },
    { icon: Users, title: 'Cocok untuk siswa & pejuang CPNS', text: 'Bahasa dan alurnya menyesuaikan penggunanya.' },
] as const

export const faqs = [
    {
        question: 'Apakah membuat akun SiapTempur gratis?',
        answer: 'Ya. Kamu dapat membuat akun tanpa biaya. Akses latihan, tryout, token, atau paket tertentu mengikuti program yang sedang tersedia pada masing-masing jalur.',
    },
    {
        question: 'Apakah akun CPNS dan TKA berbeda?',
        answer: 'Tidak. Satu akun SiapTempur dapat digunakan untuk program CPNS dan TKA yang tersedia. Progres setiap jalur tetap tersimpan sesuai aktivitas belajarmu.',
    },
    {
        question: 'Saya harus mulai dari drill atau tryout?',
        answer: 'Kalau belum tahu kemampuanmu, mulai dari tryout atau tes yang tersedia. Kalau sudah tahu bagian yang lemah, drill lebih cocok untuk latihan yang lebih fokus.',
    },
    {
        question: 'Apakah ada pembahasan setelah mengerjakan soal?',
        answer: 'Program SiapTempur dirancang agar hasil tidak berhenti di skor. Pembahasan dan evaluasi tersedia sesuai tipe latihan atau tryout yang kamu kerjakan.',
    },
    {
        question: 'Apakah soal yang salah bisa dipelajari lagi?',
        answer: 'Pada alur belajar yang mendukungnya, kamu dapat kembali ke soal salah, fokus belajar, atau remedial agar kesalahan menjadi bahan latihan berikutnya.',
    },
    {
        question: 'Bagaimana token dan paket belajar bekerja?',
        answer: 'Token atau paket digunakan sesuai produk dan program yang tersedia. Detail harga dan akses ditampilkan pada jalur CPNS atau TKA sehingga kamu bisa melihatnya sebelum memilih.',
    },
    {
        question: 'Apakah progres saya tersimpan?',
        answer: 'Ya. Saat menggunakan akun, sesi dan hasil belajar yang didukung akan tersimpan sehingga kamu dapat melanjutkan proses belajar dari progres sebelumnya.',
    },
] as const

export const cycleItems = ['Drill', 'Mini Tryout', 'Full Tryout', 'Pembahasan', 'Rapor', 'Remedial'] as const

export const navItems = [
    { href: '#produk', label: 'Program' },
    { href: '#beda', label: 'Kenapa berbeda' },
    { href: '#cara-belajar', label: 'Cara kerja' },
    { href: '#fitur', label: 'Fitur' },
    { href: '#tanya', label: 'Tanya jawab' },
    { href: '/blog', label: 'Artikel' },
] as const
