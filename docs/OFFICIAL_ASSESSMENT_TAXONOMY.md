# Official Assessment Taxonomy

## Purpose

This document defines the source-of-truth rule for assessment taxonomy used by Siap Tempur Drill and exam authoring.

The database hierarchy is:

`Program → Track → Subject/Subtes → Knowledge Node/Submateri → Drill`

A knowledge node may exist even when its current eligible question pool is `0`. Taxonomy describes the official syllabus; question availability is a separate content-readiness concern.

## Authority hierarchy

When taxonomy sources conflict, use this priority:

1. Current regulation / official assessment framework published by the responsible ministry or assessment authority.
2. Current official BKN/Pusmendik implementation announcement or assessment matrix.
3. Internal content metadata only for mapping existing questions to an official node.

Never invent a government taxonomy from coaching-site labels. Never map legacy questions into a narrower node unless existing metadata supports that mapping exactly or the item has been manually reviewed.

## CPNS — SKD

Current reference set:

- BKN CPNS 2024 SKD announcement: https://www.bkn.go.id/wp-content/uploads/2024/10/00-Pengumuman-Jadwal-SKD-CPNS-BKN-T.A.-2024.pdf
- KepmenPANRB No. 321 Tahun 2024: https://jdih.menpan.go.id/dokumen-hukum/keputusan-menteri-pendayagunaan-aparatur-negara-dan-reformasi-birokrasi-nomor-321-tahun-2024-tentang-1851

### TWK

Official top-level material:

- Nasionalisme
- Integritas
- Bela Negara
- Pilar Negara
- Bahasa Negara

`Pilar Negara` is represented with the four constitutional pillars used by the SKD material framework:

- Pancasila
- Undang-Undang Dasar Negara Republik Indonesia Tahun 1945
- Negara Kesatuan Republik Indonesia
- Bhinneka Tunggal Ika

### TIU

Official domains and item families:

- Kemampuan Verbal
  - Analogi
  - Silogisme
  - Analitis
- Kemampuan Numerik
  - Berhitung
  - Deret Angka
  - Perbandingan Kuantitatif
  - Soal Cerita
- Kemampuan Figural
  - Analogi Figural
  - Ketidaksamaan
  - Serial

### TKP

Official material:

- Pelayanan Publik
- Jejaring Kerja
- Sosial Budaya
- Teknologi Informasi dan Komunikasi
- Profesionalisme
- Anti Radikalisme

### Legacy CPNS mapping rule

Existing broad CPNS pools remain attached to their already-reviewed nodes (`Pilar Negara`, `Kemampuan Numerik`, `Pelayanan Publik`). New narrower nodes are not populated by guessing from question order, title, or stem keywords.

Therefore a newly seeded node such as `TIU → Kemampuan Numerik → Berhitung` may legitimately show `0 soal` until questions are reviewed/mapped.

## TKA

Official portal and framework downloads:

- TKA portal: https://pusmendik.kemdikbud.go.id/tka/
- Official framework/download center: https://pusmendik.kemdikbud.go.id/tka/page/download
- SD matrix: https://pusmendik.kemdikbud.go.id/tka/tka/view/mata-pelajaran-wajib/sd
- SMA matrix browser: https://pusmendik.kemdikbud.go.id/tka/tka/view/mata-pelajaran-pilihan/sma/

The current Pusmendik structure is:

- SD/MI/sederajat: Bahasa Indonesia + Matematika.
- SMP/MTs/sederajat: Bahasa Indonesia + Matematika.
- SMA/MA/SMK/MAK/sederajat: Bahasa Indonesia + Matematika + Bahasa Inggris + two selected optional subjects.

### Subject activation rule

Subjects that exist historically in the bank but are not official TKA subjects for that level remain stored as enrichment and are marked inactive for the canonical TKA context.

Current examples:

- TKA SD `BIG` → `INACTIVE / ENRICHMENT`
- TKA SMP `BIG` → `INACTIVE / ENRICHMENT`
- TKA SMP `IPA` → `INACTIVE / ENRICHMENT`

No question rows are hard-deleted by this rule.

### SD

Matematika official hierarchy includes:

- Bilangan
  - Bilangan Rasional
- Geometri dan Pengukuran
  - Objek Geometri
  - Pengukuran
- Data
  - Penyajian dan Penggunaan Data

The database also stores the more detailed official topic boundaries below those sub-elements.

Bahasa Indonesia is modeled across two official dimensions:

- Jenis Teks
  - Teks Informasi
  - Teks Fiksi
- Kompetensi Membaca
  - Pemahaman Tekstual
  - Pemahaman Inferensial
  - Evaluasi dan Apresiasi

Existing SD questions are mapped only when legacy metadata exactly matches these official dimensions. The current official BIN/MAT bank is frozen into `question_versions` before it can be used by the Drill engine.

### SMP

The existing TKA SMP taxonomy remains the canonical official matrix for:

- Bahasa Indonesia
- Matematika

Its existing knowledge-node IDs and exam behavior are preserved. Non-official enrichment subjects are inactive in canonical context.

### SMA / MA / current general-choice catalog

The current product catalog contains the three mandatory subjects plus the general/academic optional subjects already supported by Siap Tempur. Their knowledge nodes are seeded from the Pusmendik assessment matrices, including:

- Bahasa Indonesia
- Matematika
- Bahasa Inggris
- Matematika Tingkat Lanjut
- Bahasa Indonesia Tingkat Lanjut
- Bahasa Inggris Tingkat Lanjut
- Fisika
- Kimia
- Biologi
- Ekonomi
- Sosiologi
- Geografi
- Sejarah
- Antropologi
- PPKN / Pendidikan Pancasila
- Bahasa Arab
- Bahasa Jerman
- Bahasa Prancis
- Bahasa Jepang
- Bahasa Korea
- Bahasa Mandarin
- Projek / Produk Kreatif dan Kewirausahaan

Pusmendik now also exposes additional SMK/MAK technical-choice subjects. Those are **not silently folded into the current SMA-general catalog**. Add a dedicated SMK/technical product/context before introducing those subjects so program/track semantics stay clear.

## Database invariants

- `(subject_id, slug)` is the stable upsert identity for taxonomy migrations.
- Existing node IDs must be preserved whenever the semantic node already exists.
- `knowledge_node_paths` must contain one self-path for every node and no cross-subject ancestor/descendant path.
- Drill question selection uses primary question-to-node mappings and includes descendants through `knowledge_node_paths`.
- A Drill request must fail when the requested question count exceeds the eligible frozen pool.
- Inactive subjects must not appear in canonical Program/Track subject selectors.
- Question snapshots remain frozen through `question_versions`; changing taxonomy must not mutate historical attempt snapshots.

## Migration

Canonical seed migration:

`supabase/migrations/20260823093811_official_cpns_tka_taxonomy_v1.sql`

The migration is idempotent for taxonomy identity, preserves existing compatible node IDs, rebuilds closure paths transactionally, performs exact-only SD legacy mapping, and does not delete enrichment question content.
