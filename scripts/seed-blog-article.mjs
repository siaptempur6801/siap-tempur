#!/usr/bin/env node
/**
 * Menyimpan satu artikel blog contoh ke staging (idempoten: upsert berdasarkan `slug`).
 *
 * Dipakai untuk melihat perilaku halaman artikel: daftar isi otomatis dari heading `h2`,
 * penanda bagian aktif, dan indikator progress baca.
 *
 * Pemakaian:
 *   node scripts/seed-blog-article.mjs
 *   node scripts/seed-blog-article.mjs --draft   # simpan sebagai draft
 *
 * Membaca kredensial dari `.env.local` (staging). Tidak menyentuh produksi.
 */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

const require = createRequire(resolve(process.cwd(), 'package.json'))
const { createClient } = require('@supabase/supabase-js')

const STAGING_REF = 'lpgrivowdcepcxradavu'
const SLUG = 'cara-membaca-hasil-tryout-skd'

const fileEnv = Object.fromEntries(
  readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    .split('\n')
    .filter((line) => line.includes('=') && !line.trim().startsWith('#'))
    .map((line) => {
      const index = line.indexOf('=')
      return [line.slice(0, index).trim(), line.slice(index + 1).trim()]
    }),
)

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || fileEnv.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || fileEnv.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !serviceRoleKey)
  throw new Error('NEXT_PUBLIC_SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY wajib ada')

const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
if (projectRef !== STAGING_REF)
  throw new Error(`Script ini hanya untuk staging (${STAGING_REF}); dapat ${projectRef}`)

const asDraft = process.argv.includes('--draft')

const content = `
<p>Tryout sudah selesai, nilai sudah keluar, tetapi banyak peserta berhenti di situ. Angkanya dilihat, perasaannya dicatat, lalu belajar dilanjutkan dengan cara yang sama seperti sebelumnya. Padahal nilai tryout menyimpan informasi yang jauh lebih berguna daripada sekadar tinggi atau rendah: ia menunjukkan <strong>di mana</strong> dan <strong>mengapa</strong> kesalahan terjadi.</p>

<p>Artikel ini membahas cara membaca hasil tryout SKD secara sistematis, lalu mengubahnya menjadi rencana belajar yang bisa dikerjakan pada minggu yang sedang berjalan.</p>

<h2>Mengapa skor tryout sering tidak menjelaskan apa pun</h2>

<p>Satu angka total meringkas banyak hal sekaligus: penguasaan materi, ketelitian membaca soal, kecepatan mengerjakan, dan strategi memilih urutan soal. Ketika semuanya diringkas menjadi satu nilai, penyebab sebenarnya hilang.</p>

<p>Contoh yang sering terjadi: dua peserta mendapat nilai yang sama, tetapi masalahnya berbeda. Peserta pertama menguasai konsep namun kehabisan waktu di bagian akhir. Peserta kedua selesai tepat waktu namun banyak salah pada satu jenis soal tertentu. Perlakuan untuk keduanya tidak boleh sama, meskipun nilainya identik.</p>

<blockquote>Nilai tryout adalah titik awal pembacaan, bukan kesimpulan akhir. Yang dicari bukan pembenaran, melainkan petunjuk bagian mana yang perlu dikerjakan lebih dulu.</blockquote>

<h2>Tiga lapis informasi dalam hasil tryout</h2>

<p>Agar hasil bisa ditindaklanjuti, baca dalam tiga lapis berikut secara berurutan.</p>

<ul>
    <li><strong>Lapis per subtes.</strong> Bandingkan capaian TWK, TIU, dan TKP. Subtes dengan capaian paling rendah biasanya menyumbang kehilangan poin terbesar karena jumlah soalnya besar.</li>
    <li><strong>Lapis per materi.</strong> Di dalam subtes, cari materi atau kompetensi yang konsisten salah. Pola berulang lebih penting daripada satu kesalahan tunggal.</li>
    <li><strong>Lapis perilaku pengerjaan.</strong> Perhatikan soal yang dilewati, soal yang dikerjakan terlalu lama, dan soal yang berubah jawabannya pada menit terakhir.</li>
</ul>

<p>Ketiga lapis ini menjelaskan hal yang berbeda. Lapis pertama menunjukkan prioritas, lapis kedua menunjukkan bahan belajar, dan lapis ketiga menunjukkan kebiasaan yang perlu diperbaiki.</p>

<h2>Langkah 1: pisahkan masalah kecepatan dan masalah pemahaman</h2>

<p>Mulailah dengan pertanyaan paling dasar: apakah kamu kehabisan waktu, atau kehabisan pemahaman?</p>

<ul>
    <li>Jika jawabannya <strong>kehabisan waktu</strong>, penandanya adalah soal yang tidak sempat dibaca. Perbaikannya bukan menambah materi baru, melainkan melatih kecepatan mengenali tipe soal dan disiplin menandai soal yang harus dilewati sementara.</li>
    <li>Jika jawabannya <strong>kehabisan pemahaman</strong>, penandanya adalah soal yang sudah dibaca dengan tenang tetapi tetap salah. Perbaikannya adalah memperdalam materi tersebut, bukan mempercepat pengerjaan.</li>
</ul>

<p>Menukar dua perlakuan ini adalah kesalahan yang paling sering terjadi: peserta yang lambat justru menambah hafalan, sedangkan peserta yang lemah konsep justru berlatih kecepatan.</p>

<h2>Langkah 2: kelompokkan kesalahan berdasarkan jenisnya</h2>

<p>Setelah tahu lapis mana yang bermasalah, kelompokkan kesalahan ke dalam empat jenis. Cara ini membantu memilih bentuk latihan yang tepat.</p>

<ol>
    <li><strong>Tidak tahu konsep.</strong> Materi belum pernah dipelajari atau sudah lupa. Tindakan: pelajari ulang ringkas, lalu kerjakan soal bertingkat pada materi itu.</li>
    <li><strong>Salah membaca soal.</strong> Sebenarnya menguasai materi, tetapi melewatkan kata kunci seperti <em>kecuali</em>, <em>paling tepat</em>, atau <em>tidak termasuk</em>. Tindakan: latih kebiasaan menandai kata kunci sebelum memilih jawaban.</li>
    <li><strong>Keliru penalaran.</strong> Memahami konsep, tetapi salah menghubungkan informasi. Tindakan: kerjakan soal tipe penalaran dan bahas ulang alur berpikirnya, bukan hanya jawabannya.</li>
    <li><strong>Ceroboh atau tergesa.</strong> Kesalahan pada perhitungan sederhana atau pilihan jawaban yang tertukar. Tindakan: sisihkan waktu 2–3 menit untuk memeriksa ulang di akhir sesi.</li>
</ol>

<p>Empat jenis kesalahan ini membutuhkan latihan yang berbeda. Menghitung jumlahnya per jenis membuat rencana belajar menjadi konkret, bukan sekadar niat menambah jam belajar.</p>

<h2>Langkah 3: tentukan satu prioritas untuk satu minggu</h2>

<p>Kesalahan paling umum setelah membaca hasil adalah membuat daftar panjang berisi semua yang harus diperbaiki. Daftar seperti itu biasanya berhenti di hari kedua.</p>

<p>Pilih satu prioritas utama dan maksimal satu pendamping untuk satu minggu. Urutkan dengan tiga pertimbangan berikut:</p>

<ul>
    <li><strong>Dampak.</strong> Materi yang jumlah soalnya banyak dan capaianmu masih rendah perlu didahulukan.</li>
    <li><strong>Kesiapan.</strong> Materi yang kamu sudah setengah kuasai biasanya lebih cepat naik daripada materi yang benar-benar baru.</li>
    <li><strong>Keterhubungan.</strong> Materi yang juga menopang materi lain layak diprioritaskan karena manfaatnya berlipat.</li>
</ul>

<p>Tulis prioritas itu dalam satu kalimat yang bisa dieksekusi, misalnya: <em>“Minggu ini latihan penalaran TIU 10 soal per hari, ditambah evaluasi soal salah setiap akhir sesi.”</em></p>

<h2>Cara memakai pembahasan tanpa berubah menjadi sekadar membaca</h2>

<p>Pembahasan mudah berubah menjadi bacaan pasif yang terasa produktif. Supaya tidak demikian, gunakan urutan berikut untuk setiap soal yang salah:</p>

<ol>
    <li>Baca ulang soalnya sebelum melihat pembahasan, lalu tuliskan dugaan penyebab kesalahanmu.</li>
    <li>Bandingkan dugaan itu dengan pembahasan. Perhatikan apakah penyebabnya konsep, penalaran, atau ketelitian.</li>
    <li>Tuliskan satu kalimat aturan yang bisa dipakai lagi, misalnya: <em>“Jika soal meminta kesimpulan, cek apakah semua premis terpakai.”</em></li>
    <li>Kerjakan satu soal sejenis pada hari yang sama untuk memastikan aturan itu benar-benar bisa dipakai.</li>
</ol>

<p>Pembahasan yang baik tidak berhenti pada jawaban benar, tetapi menjelaskan mengapa pilihan lain tidak tepat. Dari situ kamu belajar mengenali pola pengecoh, bukan hanya menghafal jawaban.</p>

<h2>Menyusun siklus ukur, perbaiki, lalu ukur lagi</h2>

<p>Hasil tryout paling berguna jika diikuti tindak lanjut dan pengukuran ulang. Siklus yang bisa dijalankan tanpa menguras waktu:</p>

<ul>
    <li><strong>Ukur.</strong> Kerjakan satu sesi yang mewakili kondisi ujian, sesuai waktu yang tersedia.</li>
    <li><strong>Baca.</strong> Luangkan 20–30 menit untuk membaca hasil per subtes dan per materi, lalu kelompokkan kesalahan.</li>
    <li><strong>Perbaiki.</strong> Kerjakan latihan terarah pada satu prioritas, termasuk mengulang soal yang pernah salah.</li>
    <li><strong>Ukur lagi.</strong> Ulangi sesi pengukuran pada akhir pekan untuk melihat apakah perbaikan benar-benar berpengaruh.</li>
</ul>

<p>Untuk latihan harian, sesi pendek 10 soal dengan pembahasan biasanya lebih mudah dipertahankan daripada satu sesi panjang yang hanya sempat dikerjakan sekali. Sesi panjang tetap diperlukan, tetapi porsinya lebih kecil dan ditempatkan pada hari yang lapang.</p>

<h2>Kesalahan umum saat membaca hasil tryout</h2>

<ul>
    <li><strong>Terpaku pada nilai total.</strong> Nilai total tidak menunjukkan tindakan apa pun. Yang menunjukkan tindakan adalah rincian per subtes, per materi, dan jenis kesalahan.</li>
    <li><strong>Menyimpulkan dari satu soal.</strong> Satu kesalahan bisa kebetulan. Pola yang berulang pada beberapa sesi baru layak dijadikan prioritas.</li>
    <li><strong>Menambah materi sebelum menuntaskan yang lama.</strong> Menumpuk materi baru tanpa menutup kebocoran lama biasanya tidak mengubah hasil.</li>
    <li><strong>Tidak mencatat apa pun.</strong> Tanpa catatan singkat, penyebab kesalahan mudah terlupakan dan pola yang sama terulang pada tryout berikutnya.</li>
    <li><strong>Berhenti pada satu kali perbaikan.</strong> Perbaikan perlu diukur ulang; tanpa pengukuran, sulit memastikan apakah usahamu sudah tepat.</li>
</ul>

<h2>Ringkasan: empat pertanyaan yang harus bisa kamu jawab</h2>

<p>Setelah membaca hasil tryout, kamu seharusnya bisa menjawab empat pertanyaan ini tanpa membuka lagi lembar jawaban.</p>

<ol>
    <li>Subtes mana yang paling banyak kehilangan poin?</li>
    <li>Pada materi apa kesalahan itu paling sering berulang?</li>
    <li>Jenis kesalahannya lebih banyak karena pemahaman, penalaran, atau ketelitian?</li>
    <li>Apa satu tindakan konkret yang akan kamu kerjakan minggu ini, dan kapan kamu akan mengukurnya kembali?</li>
</ol>

<p>Kalau keempatnya bisa dijawab, hasil tryout sudah berubah menjadi rencana belajar. Kalau belum, nilainya masih sekadar angka — dan itu berarti sesi berikutnya berpotensi mengulang masalah yang sama.</p>

<p>Catatan: aturan resmi seleksi, jumlah soal, dan komposisi subtes dapat berubah dari waktu ke waktu. Selalu cocokkan rencana belajarmu dengan informasi resmi terbaru dari penyelenggara, lalu gunakan hasil latihanmu sendiri sebagai umpan balik harian.</p>
`.trim()

const article = {
  title: 'Cara Membaca Hasil Tryout SKD dan Menentukan Fokus Belajar Berikutnya',
  slug: SLUG,
  excerpt:
    'Nilai tryout hanya berguna kalau kamu tahu cara membacanya. Panduan praktis menerjemahkan hasil SKD menjadi rencana belajar yang bisa dikerjakan minggu ini.',
  category: 'Strategi Belajar',
  content,
  status: asDraft ? 'draft' : 'published',
  published_at: asDraft ? null : new Date().toISOString(),
}

const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })

const { data: existing, error: findError } = await admin
  .from('articles')
  .select('id')
  .eq('slug', SLUG)
  .maybeSingle()
if (findError) throw findError

if (existing?.id) {
  const { error } = await admin.from('articles').update(article).eq('id', existing.id)
  if (error) throw error
  console.log(`diperbarui: /blog/${SLUG} (${article.status})`)
} else {
  const { error } = await admin.from('articles').insert(article)
  if (error) throw error
  console.log(`dibuat: /blog/${SLUG} (${article.status})`)
}

const h2Count = (content.match(/<h2>/g) ?? []).length
console.log(
  `panjang konten: ${content.length} karakter · ${h2Count} bagian (h2) → daftar isi akan memuat ${h2Count} item`,
)
