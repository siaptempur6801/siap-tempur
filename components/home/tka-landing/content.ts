import {
  BarChart3,
  BookOpenCheck,
  BrainCircuit,
  Calculator,
  ClipboardCheck,
  Layers3,
  NotebookPen,
  RotateCcw,
  Sparkles,
  Timer,
} from 'lucide-react'

/**
 * Konten landing publik `/tka`.
 *
 * Catatan kontrak E2E (jangan diubah tanpa memperbarui spec):
 * - heading hero "Persiapan TKA untuk setiap jenjang belajar."
 * - kartu jenjang memuat teks persis `TKA SD`, `TKA SMP`, `TKA SMA`
 * - `Segera hadir` tepat 2× dan `Belum tersedia` tepat 2× (SD & SMA belum tersedia)
 * - tautan "Mulai persiapan TKA" → `/register?returnTo=%2Ftka`
 * - tautan kartu SMP memuat "TKA SMP" + "Buka jenjang" → `/tka/smp`
 *
 * Karena itu, teks persis `TKA SD`/`TKA SMP`/`TKA SMA` **tidak boleh** muncul lagi di tempat
 * lain pada halaman ini (locator `getByText(..., { exact: true })` akan kena strict mode).
 * Hal yang sama berlaku untuk label tautan `Mulai persiapan TKA` — hanya boleh ada satu.
 */

export const tkaBenefitCards = [
  {
    icon: Sparkles,
    title: 'Materi sesuai jenjang',
    text: 'Latihan dan tryout mengikuti tingkat kelas, bukan disamaratakan.',
    surface: 'bg-[var(--st-blue-soft)]',
  },
  {
    icon: Timer,
    title: 'Bisa dicicil 10 menit',
    text: 'Cukup satu sesi pendek sepulang sekolah untuk menjaga ritme belajar.',
    surface: 'bg-[var(--st-yellow-soft)]',
  },
  {
    icon: BarChart3,
    title: 'Hasil per materi',
    text: 'Terlihat bagian mana yang sudah kuat dan mana yang perlu dilatih lagi.',
    surface: 'bg-[var(--st-green-soft)]',
  },
  {
    icon: RotateCcw,
    title: 'Salah jadi bahan latihan',
    text: 'Soal yang belum tepat bisa diulang sampai benar-benar dipahami.',
    surface: 'bg-[var(--brand-peach-100)]',
  },
] as const

export const tkaCycleSteps = [
  {
    number: '01',
    title: 'Pilih jenjang',
    text: 'Masuk ke jalur sesuai tingkatmu: SD, SMP, atau SMA.',
    icon: Layers3,
    surface: 'bg-[var(--st-blue-soft)]',
  },
  {
    number: '02',
    title: 'Kerjakan dan ukur',
    text: 'Gunakan latihan atau tryout sesuai tujuan sesi hari itu.',
    icon: ClipboardCheck,
    surface: 'bg-[var(--st-yellow-soft)]',
  },
  {
    number: '03',
    title: 'Belajar dari hasil',
    text: 'Buka pembahasan, lalu tandai bagian yang perlu diperkuat.',
    icon: BookOpenCheck,
    surface: 'bg-[var(--st-green-soft)]',
  },
  {
    number: '04',
    title: 'Latih ulang, ukur lagi',
    text: 'Drill dan remedial membuat perbaikan terasa, bukan cuma terlihat di skor.',
    icon: RotateCcw,
    surface: 'bg-white',
  },
] as const

/** Kompetensi yang dilatih per jenjang (tanpa menyebut nama jenjang persis). */
export const tkaSubjectCards = [
  {
    level: 'Jenjang dasar',
    title: 'Literasi & numerasi',
    text: 'Fondasi membaca dan berhitung yang dipakai di semua mata pelajaran.',
    icon: NotebookPen,
    surface: 'bg-[var(--st-yellow-soft)]',
    sticker: 'Fondasi',
    tone: 'amber' as const,
  },
  {
    level: 'Jenjang menengah',
    title: 'Bahasa Indonesia & Matematika',
    text: 'Dua kompetensi inti dengan latihan, tryout, pembahasan, dan remedial.',
    icon: Calculator,
    surface: 'bg-[var(--st-blue-soft)]',
    sticker: 'Sedang tersedia',
    tone: 'blue' as const,
  },
  {
    level: 'Jenjang atas',
    title: 'Kemampuan akademik lanjutan',
    text: 'Persiapan materi yang lebih kompleks sesuai mapel yang tersedia.',
    icon: BrainCircuit,
    surface: 'bg-[var(--st-green-soft)]',
    sticker: 'Disiapkan',
    tone: 'green' as const,
  },
] as const

export const tkaFaqs = [
  {
    question: 'Apakah TKA di SiapTempur untuk semua jenjang?',
    answer:
      'Jalur TKA tersedia untuk SD, SMP, dan SMA. Jenjang yang aktif saat ini ditandai pada kartu jenjang, sedangkan jenjang lain sedang disiapkan.',
  },
  {
    question: 'Apakah perlu akun terpisah untuk setiap jenjang?',
    answer:
      'Tidak. Satu akun SiapTempur bisa dipakai untuk semua jenjang yang tersedia, dan progres setiap jenjang tersimpan terpisah.',
  },
  {
    question: 'Berapa lama satu sesi latihan?',
    answer:
      'Latihan bisa disesuaikan. Mini tryout dan drill dirancang singkat, sedangkan full tryout lebih panjang untuk mengukur kesiapan.',
  },
  {
    question: 'Apakah ada pembahasan setelah mengerjakan?',
    answer:
      'Ya. Program diarahkan agar hasil tidak berhenti di skor: pembahasan dan evaluasi tersedia sesuai tipe latihan yang dikerjakan.',
  },
  {
    question: 'Apakah orang tua bisa ikut melihat progres?',
    answer:
      'Progres belajar tampil pada akun yang digunakan. Untuk penggunaan bersama, pastikan akun dan perangkat dikelola sesuai kesepakatan keluarga.',
  },
] as const

export const tkaChecks = [
  'Satu akun lintas jenjang',
  'Progres belajar tersimpan',
  'Belajar dari hasil',
] as const

/** Navigasi in-page landing TKA (dipakai navbar dengan penanda section aktif). */
export const tkaNavItems = [
  // Urutan mengikuti urutan section di halaman: manfaat → jenjang → alur → kompetensi → tanya jawab.
  { href: '#manfaat-tka', label: 'Kenapa di sini' },
  { href: '#jenjang-tka', label: 'Pilih jenjang' },
  { href: '#alur-tka', label: 'Cara kerja' },
  { href: '#kompetensi-tka', label: 'Yang dilatih' },
  { href: '#tanya-tka', label: 'Tanya jawab' },
  // Tautan lintas program: landing CPNS sudah punya tautan ke TKA, jadi di sini sebaliknya.
  { href: '/cpns', label: 'CPNS' },
] as const
